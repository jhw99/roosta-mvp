use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::constants::*;
use crate::errors::RoostaError;
use crate::state::*;

#[derive(Accounts)]
pub struct DepositRiskCollateral<'info> {
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
        seeds = [COLLATERAL_VAULT_SEED, circle.key().as_ref()],
        bump,
    )]
    pub collateral_vault: Box<Account<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>,
}

/// Returns required collateral as a u64 USDC amount given the position multiplier.
/// Position 0 (first payee): 100% of payout
/// Position 1 (second payee): 60% of payout
/// Others: 0
fn collateral_for_position(
    payout_order: u8,
    full_payout: u64,
    base_ratio_pct: u8,
) -> u64 {
    match payout_order {
        0 => full_payout
            .checked_mul(base_ratio_pct as u64)
            .unwrap()
            / 100,
        1 => {
            // 60% of (full_payout * base_ratio / 100)
            let p1 = full_payout
                .checked_mul(base_ratio_pct as u64)
                .unwrap()
                / 100;
            p1.checked_mul(60).unwrap() / 100
        }
        _ => 0,
    }
}

pub fn handler(ctx: Context<DepositRiskCollateral>) -> Result<()> {
    let circle = &mut ctx.accounts.circle;
    require!(
        circle.risk_deposit_enabled,
        RoostaError::RiskDepositNotEnabled
    );
    require!(circle.status == CircleStatus::Active, RoostaError::CircleNotActive);
    require!(!circle.round1_activated, RoostaError::CircleAlreadyStarted);

    let ms = &mut ctx.accounts.member_status;
    require!(ms.payout_order < 2, RoostaError::PositionNotEligibleForCollateral);
    require!(ms.collateral_amount == 0, RoostaError::CollateralAlreadyDeposited);

    let full_payout = circle
        .contribution_amount
        .checked_mul(circle.member_count as u64)
        .unwrap();
    let required = collateral_for_position(
        ms.payout_order,
        full_payout,
        circle.early_position_collateral_ratio,
    );

    // Transfer USDC from member's user-vault token account to collateral_vault
    let member_key = ctx.accounts.member.key();
    let bump = ctx.accounts.member_vault.bump;
    let seeds: &[&[u8]] = &[USER_VAULT_SEED, member_key.as_ref(), &[bump]];
    let signer_seeds: &[&[&[u8]]] = &[seeds];

    let cpi_accounts = Transfer {
        from: ctx.accounts.member_vault_token_account.to_account_info(),
        to: ctx.accounts.collateral_vault.to_account_info(),
        authority: ctx.accounts.member_vault.to_account_info(),
    };
    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        cpi_accounts,
        signer_seeds,
    );
    token::transfer(cpi_ctx, required)?;

    ms.collateral_amount = required;
    circle.risk_collaterals_collected = circle.risk_collaterals_collected.saturating_add(1);

    Ok(())
}
