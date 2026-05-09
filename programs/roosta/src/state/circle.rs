use anchor_lang::prelude::*;
use crate::constants::{MAX_MEMBERS, MAX_NAME_LEN};

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum CircleStatus {
    Active,
    Completed,
    Cancelled,
}

#[account]
pub struct Circle {
    pub authority: Pubkey,
    pub circle_id: u64,
    pub name: String,
    pub usdc_mint: Pubkey,
    pub vault: Pubkey,
    pub member_count: u8,
    pub total_rounds: u8,
    pub current_round: u8,
    pub contribution_amount: u64,
    pub round_duration: i64,
    pub started_at: i64,
    pub status: CircleStatus,
    pub members: Vec<Pubkey>,
    pub payout_order: Vec<u8>,
    pub bump: u8,
    pub vault_bump: u8,
    // v2 risk-model fields
    pub collateral_vault: Pubkey,
    pub trust_gate_enabled: bool,
    pub risk_deposit_enabled: bool,
    pub locked_reserve_enabled: bool,
    pub early_position_collateral_ratio: u8,
    pub locked_reserve_ratio: u8,
    pub grace_period_seconds: i64,
    pub risk_collaterals_collected: u8,
    pub round1_activated: bool,
}

impl Circle {
    // discriminator(8)
    // authority(32) + circle_id(8) + name(4 + 32) + usdc_mint(32) + vault(32)
    // + member_count(1) + total_rounds(1) + current_round(1)
    // + contribution_amount(8) + round_duration(8) + started_at(8)
    // + status(1)
    // + members vec(4 + 32 * MAX_MEMBERS)
    // + payout_order vec(4 + 1 * MAX_MEMBERS)
    // + bump(1) + vault_bump(1)
    // v2:
    // + collateral_vault(32)
    // + trust_gate_enabled(1) + risk_deposit_enabled(1) + locked_reserve_enabled(1)
    // + early_position_collateral_ratio(1) + locked_reserve_ratio(1)
    // + grace_period_seconds(8)
    pub const SPACE: usize = 8
        + 32
        + 8
        + (4 + MAX_NAME_LEN)
        + 32
        + 32
        + 1
        + 1
        + 1
        + 8
        + 8
        + 8
        + 1
        + (4 + 32 * MAX_MEMBERS)
        + (4 + 1 * MAX_MEMBERS)
        + 1
        + 1
        + 32
        + 1
        + 1
        + 1
        + 1
        + 1
        + 8
        + 1
        + 1;
}
