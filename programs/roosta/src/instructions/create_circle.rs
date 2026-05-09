use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::constants::*;
use crate::errors::RoostaError;
use crate::state::*;

#[derive(Accounts)]
#[instruction(circle_id: u64, name: String, member_count: u8, total_rounds: u8, contribution_amount: u64, round_duration: i64)]
pub struct CreateCircle<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = Circle::SPACE,
        seeds = [CIRCLE_SEED, authority.key().as_ref(), &circle_id.to_le_bytes()],
        bump
    )]
    pub circle: Box<Account<'info, Circle>>,

    #[account(
        init,
        payer = authority,
        seeds = [VAULT_SEED, circle.key().as_ref()],
        bump,
        token::mint = usdc_mint,
        token::authority = vault,
    )]
    pub vault: Box<Account<'info, TokenAccount>>,

    #[account(
        init,
        payer = authority,
        seeds = [COLLATERAL_VAULT_SEED, circle.key().as_ref()],
        bump,
        token::mint = usdc_mint,
        token::authority = circle,
    )]
    pub collateral_vault: Box<Account<'info, TokenAccount>>,

    #[account(
        init,
        payer = authority,
        space = Round::SPACE,
        seeds = [ROUND_SEED, circle.key().as_ref(), &[1u8]],
        bump
    )]
    pub round: Box<Account<'info, Round>>,

    pub usdc_mint: Box<Account<'info, Mint>>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(
    ctx: Context<CreateCircle>,
    circle_id: u64,
    name: String,
    member_count: u8,
    total_rounds: u8,
    contribution_amount: u64,
    round_duration: i64,
    trust_gate_enabled: bool,
    risk_deposit_enabled: bool,
    locked_reserve_enabled: bool,
    early_position_collateral_ratio: u8,
    locked_reserve_ratio: u8,
    grace_period_seconds: i64,
) -> Result<()> {
    require!(name.as_bytes().len() <= MAX_NAME_LEN, RoostaError::NameTooLong);
    require!(member_count as usize <= MAX_MEMBERS && member_count > 0, RoostaError::CircleFull);

    let clock = Clock::get()?;
    let circle = &mut ctx.accounts.circle;
    circle.authority = ctx.accounts.authority.key();
    circle.circle_id = circle_id;
    circle.name = name;
    circle.usdc_mint = ctx.accounts.usdc_mint.key();
    circle.vault = ctx.accounts.vault.key();
    circle.member_count = member_count;
    circle.total_rounds = total_rounds;
    circle.current_round = 1;
    circle.contribution_amount = contribution_amount;
    circle.round_duration = round_duration;
    circle.started_at = clock.unix_timestamp;
    circle.status = CircleStatus::Active;
    circle.members = Vec::with_capacity(member_count as usize);
    circle.payout_order = Vec::with_capacity(member_count as usize);
    circle.bump = ctx.bumps.circle;
    circle.vault_bump = ctx.bumps.vault;
    // v2 risk-model fields (defaults safe; mechanics not yet active)
    circle.collateral_vault = ctx.accounts.collateral_vault.key();
    circle.trust_gate_enabled = trust_gate_enabled;
    circle.risk_deposit_enabled = risk_deposit_enabled;
    circle.locked_reserve_enabled = locked_reserve_enabled;
    circle.early_position_collateral_ratio = early_position_collateral_ratio;
    circle.locked_reserve_ratio = locked_reserve_ratio;
    circle.grace_period_seconds = grace_period_seconds;
    circle.risk_collaterals_collected = 0;
    circle.round1_activated = false;

    let round = &mut ctx.accounts.round;
    round.circle = circle.key();
    round.round_number = 1;
    // recipient is set later (when first member joins, or when circle is full).
    // Initialize to authority as a placeholder; real recipient assigned in join_circle.
    round.recipient = ctx.accounts.authority.key();
    round.deposits_count = 0;
    round.status = RoundStatus::Pending;
    round.started_at = clock.unix_timestamp;
    round.settled_at = None;
    round.deposits = Vec::with_capacity(member_count as usize);
    round.bump = ctx.bumps.round;
    // v2
    round.deadline = clock.unix_timestamp.saturating_add(round_duration);
    round.total_collected = 0;
    round.payout_amount = 0;
    round.reserve_amount = 0;
    round.delayed_at = 0;

    Ok(())
}
