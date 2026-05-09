use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::constants::*;
use crate::credit_helpers;
use crate::errors::RoostaError;
use crate::state::*;

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub member: Signer<'info>,

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
        seeds = [MEMBER_SEED, circle.key().as_ref(), member.key().as_ref()],
        bump = member_status.bump,
    )]
    pub member_status: Box<Account<'info, MemberStatus>>,

    #[account(
        seeds = [USER_VAULT_SEED, member.key().as_ref()],
        bump = member_vault.bump,
        constraint = member_vault.user == member.key() @ RoostaError::VaultNotInitialized,
    )]
    pub member_vault: Box<Account<'info, UserVault>>,

    #[account(
        mut,
        seeds = [USER_VAULT_ATA_SEED, member.key().as_ref()],
        bump,
        constraint = member_vault_token_account.mint == circle.usdc_mint,
    )]
    pub member_vault_token_account: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        seeds = [VAULT_SEED, circle.key().as_ref()],
        bump = circle.vault_bump,
    )]
    pub vault: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        seeds = [CREDIT_SEED, member.key().as_ref()],
        bump = credit_profile.bump,
        constraint = credit_profile.wallet == member.key()
            @ RoostaError::CreditProfileNotInitialized,
    )]
    pub credit_profile: Box<Account<'info, CreditProfile>>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<Deposit>) -> Result<()> {
    let circle = &ctx.accounts.circle;
    require!(circle.status == CircleStatus::Active, RoostaError::CircleNotActive);

    let wallet = ctx.accounts.member.key();
    require!(circle.members.contains(&wallet), RoostaError::NotMember);

    let round = &mut ctx.accounts.round;
    require!(round.status == RoundStatus::Active, RoostaError::RoundNotActive);
    require!(!round.deposits.contains(&wallet), RoostaError::AlreadyDeposited);

    // CPI: transfer USDC from member's vault PDA token account -> circle vault.
    // Authority is the UserVault PDA, which signs via seeds.
    let member_key = ctx.accounts.member.key();
    let bump = ctx.accounts.member_vault.bump;
    let seeds: &[&[u8]] = &[USER_VAULT_SEED, member_key.as_ref(), &[bump]];
    let signer_seeds: &[&[&[u8]]] = &[seeds];

    let cpi_accounts = Transfer {
        from: ctx.accounts.member_vault_token_account.to_account_info(),
        to: ctx.accounts.vault.to_account_info(),
        authority: ctx.accounts.member_vault.to_account_info(),
    };
    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        cpi_accounts,
        signer_seeds,
    );
    token::transfer(cpi_ctx, circle.contribution_amount)?;

    round.deposits.push(wallet);
    round.deposits_count = round.deposits_count.saturating_add(1);
    round.total_collected = round.total_collected.saturating_add(circle.contribution_amount);

    let ms = &mut ctx.accounts.member_status;
    ms.total_deposited = ms.total_deposited.saturating_add(circle.contribution_amount);
    ms.deposit_count = ms.deposit_count.saturating_add(1);

    let clock = Clock::get()?;
    if clock.unix_timestamp <= round.deadline {
        credit_helpers::record_on_time(&mut ctx.accounts.credit_profile, &clock);
    } else {
        credit_helpers::record_late(&mut ctx.accounts.credit_profile, &clock);
    }

    Ok(())
}
