use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::constants::*;
use crate::errors::RoostaError;
use crate::state::*;

#[derive(Accounts)]
pub struct TriggerPayout<'info> {
    #[account(mut)]
    pub caller: Signer<'info>,

    #[account(
        mut,
        seeds = [CIRCLE_SEED, circle.authority.as_ref(), &circle.circle_id.to_le_bytes()],
        bump = circle.bump,
    )]
    pub circle: Box<Account<'info, Circle>>,

    #[account(
        mut,
        seeds = [ROUND_SEED, circle.key().as_ref(), &[circle.current_round]],
        bump = round.bump,
    )]
    pub round: Box<Account<'info, Round>>,

    #[account(
        mut,
        seeds = [MEMBER_SEED, circle.key().as_ref(), round.recipient.as_ref()],
        bump = recipient_status.bump,
    )]
    pub recipient_status: Box<Account<'info, MemberStatus>>,

    #[account(
        mut,
        seeds = [VAULT_SEED, circle.key().as_ref()],
        bump = circle.vault_bump,
    )]
    pub vault: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        seeds = [COLLATERAL_VAULT_SEED, circle.key().as_ref()],
        bump,
    )]
    pub collateral_vault: Box<Account<'info, TokenAccount>>,

    #[account(
        seeds = [USER_VAULT_SEED, round.recipient.as_ref()],
        bump = recipient_vault.bump,
        constraint = recipient_vault.user == round.recipient @ RoostaError::VaultNotInitialized,
    )]
    pub recipient_vault: Box<Account<'info, UserVault>>,

    #[account(
        mut,
        seeds = [USER_VAULT_ATA_SEED, round.recipient.as_ref()],
        bump,
        constraint = recipient_vault_token_account.mint == circle.usdc_mint,
    )]
    pub recipient_vault_token_account: Box<Account<'info, TokenAccount>>,

    /// Optional next round account. Required unless current round is the last.
    /// CHECK: validated/initialized inside handler when needed via init.
    #[account(
        init_if_needed,
        payer = caller,
        space = Round::SPACE,
        seeds = [ROUND_SEED, circle.key().as_ref(), &[circle.current_round + 1]],
        bump
    )]
    pub next_round: Box<Account<'info, Round>>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<TriggerPayout>) -> Result<()> {
    let circle = &mut ctx.accounts.circle;
    require!(circle.status == CircleStatus::Active, RoostaError::CircleNotActive);

    let round = &mut ctx.accounts.round;
    require!(
        round.status == RoundStatus::Active || round.status == RoundStatus::Delayed,
        RoostaError::RoundNotActive
    );
    require!(
        round.deposits_count == circle.member_count,
        RoostaError::NotAllDepositsReceived
    );
    require!(round.settled_at.is_none(), RoostaError::AlreadySettled);

    let total_pot = circle
        .contribution_amount
        .checked_mul(circle.member_count as u64)
        .unwrap();

    // Compute reserve split based on recipient's payout_order (Phase 2).
    let recipient_order = ctx.accounts.recipient_status.payout_order;
    let reserve_amount: u64 = if circle.locked_reserve_enabled {
        let base = total_pot
            .checked_mul(circle.locked_reserve_ratio as u64)
            .unwrap()
            / 100;
        match recipient_order {
            0 => base,
            1 => base.checked_mul(60).unwrap() / 100,
            _ => 0,
        }
    } else {
        0
    };
    let payout_amount = total_pot.checked_sub(reserve_amount).unwrap();

    let circle_key = circle.key();
    let vault_seeds: &[&[u8]] = &[VAULT_SEED, circle_key.as_ref(), &[circle.vault_bump]];
    let signer_seeds: &[&[&[u8]]] = &[vault_seeds];

    // Send payout portion to recipient's vault token account.
    let cpi_accounts = Transfer {
        from: ctx.accounts.vault.to_account_info(),
        to: ctx.accounts.recipient_vault_token_account.to_account_info(),
        authority: ctx.accounts.vault.to_account_info(),
    };
    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        cpi_accounts,
        signer_seeds,
    );
    token::transfer(cpi_ctx, payout_amount)?;

    // Send reserve portion (if any) to circle collateral_vault.
    if reserve_amount > 0 {
        let cpi_accounts2 = Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.collateral_vault.to_account_info(),
            authority: ctx.accounts.vault.to_account_info(),
        };
        let cpi_ctx2 = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts2,
            signer_seeds,
        );
        token::transfer(cpi_ctx2, reserve_amount)?;
    }

    let clock = Clock::get()?;

    round.status = RoundStatus::Settled;
    round.settled_at = Some(clock.unix_timestamp);
    round.payout_amount = payout_amount;
    round.reserve_amount = reserve_amount;

    let rs = &mut ctx.accounts.recipient_status;
    rs.received_amount = rs.received_amount.saturating_add(payout_amount);
    rs.received_at = Some(clock.unix_timestamp);
    if reserve_amount > 0 {
        rs.locked_reserve_amount = rs.locked_reserve_amount.saturating_add(reserve_amount);
        rs.locked_reserve_initial = rs.locked_reserve_initial.saturating_add(reserve_amount);
    }

    // Advance circle state
    if circle.current_round >= circle.total_rounds {
        circle.status = CircleStatus::Completed;
        // next_round was init_if_needed; we leave it as a no-op record.
        // Mark its status so it's clear it is unused.
        let nr = &mut ctx.accounts.next_round;
        if nr.circle == Pubkey::default() {
            nr.circle = circle.key();
            nr.round_number = circle.current_round + 1;
            nr.recipient = Pubkey::default();
            nr.deposits_count = 0;
            nr.status = RoundStatus::Pending;
            nr.started_at = clock.unix_timestamp;
            nr.settled_at = None;
            nr.deposits = Vec::new();
            nr.bump = ctx.bumps.next_round;
            nr.deadline = clock.unix_timestamp;
            nr.total_collected = 0;
            nr.payout_amount = 0;
            nr.reserve_amount = 0;
            nr.delayed_at = 0;
        }
    } else {
        let next_idx = circle.current_round as usize; // 1-indexed -> next member
        let next_recipient = circle.members[next_idx];
        let next_round_number = circle.current_round + 1;

        let nr = &mut ctx.accounts.next_round;
        nr.circle = circle.key();
        nr.round_number = next_round_number;
        nr.recipient = next_recipient;
        nr.deposits_count = 0;
        nr.status = RoundStatus::Active;
        nr.started_at = clock.unix_timestamp;
        nr.settled_at = None;
        nr.deposits = Vec::with_capacity(circle.member_count as usize);
        nr.bump = ctx.bumps.next_round;
        nr.deadline = clock.unix_timestamp.saturating_add(circle.round_duration);
        nr.total_collected = 0;
        nr.payout_amount = 0;
        nr.reserve_amount = 0;
        nr.delayed_at = 0;

        circle.current_round = next_round_number;
    }

    Ok(())
}
