use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::constants::*;
use crate::credit_helpers;
use crate::errors::RoostaError;
use crate::state::*;

#[derive(Accounts)]
pub struct SlashCollateral<'info> {
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
        seeds = [VAULT_SEED, circle.key().as_ref()],
        bump = circle.vault_bump,
    )]
    pub vault: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        seeds = [CREDIT_SEED, member_status.wallet.as_ref()],
        bump = credit_profile.bump,
        constraint = credit_profile.wallet == member_status.wallet
            @ RoostaError::CreditProfileNotInitialized,
    )]
    pub credit_profile: Box<Account<'info, CreditProfile>>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<SlashCollateral>) -> Result<()> {
    let ms = &mut ctx.accounts.member_status;
    require!(
        ms.status_enum == MemberStatusEnum::Defaulted,
        RoostaError::MemberNotDefaulted
    );
    require!(!ms.slashed, RoostaError::AlreadySlashed);

    let circle = &ctx.accounts.circle;
    let total_slash = ms
        .collateral_amount
        .saturating_add(ms.locked_reserve_amount);

    if total_slash > 0 {
        let circle_authority = circle.authority;
        let circle_id_bytes = circle.circle_id.to_le_bytes();
        let circle_seeds: &[&[u8]] = &[
            CIRCLE_SEED,
            circle_authority.as_ref(),
            circle_id_bytes.as_ref(),
            &[circle.bump],
        ];
        let signer_seeds: &[&[&[u8]]] = &[circle_seeds];

        let cpi_accounts = Transfer {
            from: ctx.accounts.collateral_vault.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
            authority: ctx.accounts.circle.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            signer_seeds,
        );
        token::transfer(cpi_ctx, total_slash)?;
    }

    let contribution = circle.contribution_amount;
    let shortfall = contribution.saturating_sub(total_slash);
    let credited = total_slash.min(contribution);

    ms.collateral_amount = 0;
    ms.locked_reserve_amount = 0;
    ms.slashed = true;
    ms.shortfall = shortfall;
    ms.status_enum = MemberStatusEnum::Slashed;

    let round = &mut ctx.accounts.round;
    if !round.deposits.contains(&ms.wallet) {
        round.deposits.push(ms.wallet);
        round.deposits_count = round.deposits_count.saturating_add(1);
        round.total_collected = round.total_collected.saturating_add(credited);
    }

    let clock = Clock::get()?;
    credit_helpers::record_slash(&mut ctx.accounts.credit_profile, &clock);

    Ok(())
}
