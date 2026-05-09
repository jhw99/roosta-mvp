use anchor_lang::prelude::*;

#[constant]
pub const CIRCLE_SEED: &[u8] = b"circle";

#[constant]
pub const VAULT_SEED: &[u8] = b"vault";

#[constant]
pub const ROUND_SEED: &[u8] = b"round";

#[constant]
pub const MEMBER_SEED: &[u8] = b"member";

#[constant]
pub const USER_VAULT_SEED: &[u8] = b"user_vault";

#[constant]
pub const USER_VAULT_ATA_SEED: &[u8] = b"user_vault_ata";

#[constant]
pub const COLLATERAL_VAULT_SEED: &[u8] = b"collateral_vault";

#[constant]
pub const CREDIT_SEED: &[u8] = b"credit";

pub const MAX_MEMBERS: usize = 10;
pub const MAX_NAME_LEN: usize = 32;
