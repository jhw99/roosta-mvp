use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::constants::*;
use crate::errors::RoostaError;
use crate::state::*;

#[derive(Accounts)]
pub struct WithdrawVault<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        seeds = [USER_VAULT_SEED, user.key().as_ref()],
        bump = user_vault.bump,
        has_one = user,
    )]
    pub user_vault: Account<'info, UserVault>,

    #[account(
        mut,
        seeds = [USER_VAULT_ATA_SEED, user.key().as_ref()],
        bump,
    )]
    pub user_vault_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = user_token_account.owner == user.key(),
        constraint = user_token_account.mint == user_vault_token_account.mint,
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<WithdrawVault>, amount: u64) -> Result<()> {
    require!(
        ctx.accounts.user_vault_token_account.amount >= amount,
        RoostaError::InsufficientVaultBalance
    );

    let user_key = ctx.accounts.user.key();
    let bump = ctx.accounts.user_vault.bump;
    let seeds: &[&[u8]] = &[USER_VAULT_SEED, user_key.as_ref(), &[bump]];
    let signer_seeds: &[&[&[u8]]] = &[seeds];

    let cpi_accounts = Transfer {
        from: ctx.accounts.user_vault_token_account.to_account_info(),
        to: ctx.accounts.user_token_account.to_account_info(),
        authority: ctx.accounts.user_vault.to_account_info(),
    };
    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        cpi_accounts,
        signer_seeds,
    );
    token::transfer(cpi_ctx, amount)?;
    Ok(())
}
