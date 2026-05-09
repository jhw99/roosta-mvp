use anchor_lang::prelude::*;

#[account]
pub struct UserVault {
    pub user: Pubkey,
    pub bump: u8,
}

impl UserVault {
    // discriminator(8) + user(32) + bump(1)
    pub const SPACE: usize = 8 + 32 + 1;
}
