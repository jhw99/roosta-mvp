use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::constants::*;
use crate::state::*;

#[derive(Accounts)]
pub struct InitUserVault<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        init,
        payer = user,
        space = UserVault::SPACE,
        seeds = [USER_VAULT_SEED, user.key().as_ref()],
        bump
    )]
    pub user_vault: Account<'info, UserVault>,

    #[account(
        init,
        payer = user,
        seeds = [USER_VAULT_ATA_SEED, user.key().as_ref()],
        bump,
        token::mint = usdc_mint,
        token::authority = user_vault,
    )]
    pub user_vault_token_account: Account<'info, TokenAccount>,

    pub usdc_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(ctx: Context<InitUserVault>) -> Result<()> {
    let v = &mut ctx.accounts.user_vault;
    v.user = ctx.accounts.user.key();
    v.bump = ctx.bumps.user_vault;
    Ok(())
}
