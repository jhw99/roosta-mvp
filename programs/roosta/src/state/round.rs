use anchor_lang::prelude::*;
use crate::constants::MAX_MEMBERS;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum RoundStatus {
    Pending,
    Active,
    Settled,
    Delayed,
}

#[account]
pub struct Round {
    pub circle: Pubkey,
    pub round_number: u8,
    pub recipient: Pubkey,
    pub deposits_count: u8,
    pub status: RoundStatus,
    pub started_at: i64,
    pub settled_at: Option<i64>,
    pub deposits: Vec<Pubkey>,
    pub bump: u8,
    // v2 fields
    pub deadline: i64,
    pub total_collected: u64,
    pub payout_amount: u64,
    pub reserve_amount: u64,
    // v3 fields
    pub delayed_at: i64,
}

impl Round {
    // discriminator(8)
    // circle(32) + round_number(1) + recipient(32) + deposits_count(1)
    // + status(1) + started_at(8) + settled_at (1 + 8)
    // + deposits vec (4 + 32 * MAX_MEMBERS)
    // + bump(1)
    // v2: + deadline(8) + total_collected(8) + payout_amount(8) + reserve_amount(8)
    pub const SPACE: usize = 8
        + 32
        + 1
        + 32
        + 1
        + 1
        + 8
        + (1 + 8)
        + (4 + 32 * MAX_MEMBERS)
        + 1
        + 8
        + 8
        + 8
        + 8
        + 8;
}
