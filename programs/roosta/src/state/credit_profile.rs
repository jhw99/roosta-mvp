use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum TrustTier {
    Tier0New,
    Tier1Verified,
    Tier2Trusted,
    Tier3Prime,
    Tier4Guarantor,
}

#[account]
pub struct CreditProfile {
    pub wallet: Pubkey,
    pub trust_tier: TrustTier,
    pub circles_completed: u32,
    pub on_time_payments: u32,
    pub late_payments: u32,
    pub defaults: u32,
    pub total_volume: u64,
    pub last_updated_at: i64,
    pub early_position_eligible: bool,
    // SBT mint placeholder; Phase 6 will fill in.
    pub sbt_mint: Pubkey,
    pub bump: u8,
}

impl CreditProfile {
    // discriminator(8) + wallet(32) + trust_tier(1)
    // + circles_completed(4) + on_time_payments(4) + late_payments(4) + defaults(4)
    // + total_volume(8) + last_updated_at(8) + early_position_eligible(1)
    // + sbt_mint(32) + bump(1)
    pub const SPACE: usize = 8 + 32 + 1 + 4 + 4 + 4 + 4 + 8 + 8 + 1 + 32 + 1;
}
