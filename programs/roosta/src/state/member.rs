use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum MemberStatusEnum {
    Active,
    Paid,
    Received,
    Completed,
    Delayed,
    Defaulted,
    Slashed,
}

#[account]
pub struct MemberStatus {
    pub circle: Pubkey,
    pub wallet: Pubkey,
    pub joined_at: i64,
    pub total_deposited: u64,
    pub deposit_count: u8,
    pub missed_count: u8,
    pub received_amount: u64,
    pub received_at: Option<i64>,
    pub bump: u8,
    // v2 fields
    pub payout_order: u8,
    pub position_nft_mint: Pubkey,
    pub collateral_nft_mint_some: bool,
    pub collateral_nft_mint: Pubkey,
    pub default_count: u8,
    pub collateral_amount: u64,
    pub locked_reserve_amount: u64,
    pub status_enum: MemberStatusEnum,
    pub locked_reserve_initial: u64,
    pub locked_reserve_unlocks_done: u8,
    // v3 default/slash tracking
    pub last_delayed_round: u8,
    pub last_defaulted_round: u8,
    pub slashed: bool,
    pub shortfall: u64,
}

impl MemberStatus {
    // discriminator(8) + circle(32) + wallet(32) + joined_at(8)
    // + total_deposited(8) + deposit_count(1) + missed_count(1)
    // + received_amount(8) + received_at(1 + 8) + bump(1)
    // v2: + payout_order(1) + position_nft_mint(32)
    //     + collateral_nft_mint_some(1) + collateral_nft_mint(32)
    //     + default_count(1) + collateral_amount(8) + locked_reserve_amount(8)
    //     + status_enum(1)
    pub const SPACE: usize = 8
        + 32
        + 32
        + 8
        + 8
        + 1
        + 1
        + 8
        + (1 + 8)
        + 1
        + 1
        + 32
        + 1
        + 32
        + 1
        + 8
        + 8
        + 1
        + 8
        + 1
        // v3
        + 1
        + 1
        + 1
        + 8;
}
