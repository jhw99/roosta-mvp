use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::constants::*;
use crate::errors::RoostaError;
use crate::state::*;

#[derive(Accounts)]
pub struct UnlockReserve<'info> {
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
        seeds = [MEMBER_SEED, circle.key().as_ref(), member_status.wallet.as_ref()],
        bump = member_status.bump,
    )]
    pub member_status: Box<Account<'info, MemberStatus>>,

    #[account(
        mut,
        seeds = [COLLATERAL_VAULT_SEED, circle.key().as_ref()],
        bump,
    )]
    pub collateral_vault: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        seeds = [USER_VAULT_ATA_SEED, member_status.wallet.as_ref()],
        bump,
        constraint = recipient_vault_token_account.mint == circle.usdc_mint,
    )]
    pub recipient_vault_token_account: Box<Account<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<UnlockReserve>) -> Result<()> {
    let circle = &ctx.accounts.circle;
    require!(circle.current_round > 1, RoostaError::Round1NotReady);

    let ms = &mut ctx.accounts.member_status;
    require!(ms.locked_reserve_initial > 0, RoostaError::NoLockedReserve);
    require!(ms.locked_reserve_amount > 0, RoostaError::ReserveAlreadyUnlocked);

    let total_unlocks = (circle.total_rounds as u64).saturating_sub(1);
    require!(total_unlocks > 0, RoostaError::ReserveAlreadyUnlocked);
    require!(
        (ms.locked_reserve_unlocks_done as u64) < total_unlocks,
        RoostaError::ReserveAlreadyUnlocked
    );

    let remaining_unlocks = total_unlocks - (ms.locked_reserve_unlocks_done as u64);
    // Use whatever is left, divided across remaining unlocks. On the last unlock, dump remainder.
    let amount: u64 = if remaining_unlocks == 1 {
        ms.locked_reserve_amount
    } else {
        ms.locked_reserve_initial / total_unlocks
    };
    let amount = amount.min(ms.locked_reserve_amount);

    // Transfer from collateral_vault (authority = circle PDA) to recipient vault token acct
    let circle_key_bytes = circle.authority;
    let circle_id_bytes = circle.circle_id.to_le_bytes();
    let circle_seeds: &[&[u8]] = &[
        CIRCLE_SEED,
        circle_key_bytes.as_ref(),
        circle_id_bytes.as_ref(),
        &[circle.bump],
    ];
    let signer_seeds: &[&[&[u8]]] = &[circle_seeds];

    let cpi_accounts = Transfer {
        from: ctx.accounts.collateral_vault.to_account_info(),
        to: ctx.accounts.recipient_vault_token_account.to_account_info(),
        authority: ctx.accounts.circle.to_account_info(),
    };
    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        cpi_accounts,
        signer_seeds,
    );
    token::transfer(cpi_ctx, amount)?;

    ms.locked_reserve_amount = ms.locked_reserve_amount.saturating_sub(amount);
    ms.locked_reserve_unlocks_done = ms.locked_reserve_unlocks_done.saturating_add(1);

    Ok(())
}
