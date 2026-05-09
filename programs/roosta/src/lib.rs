use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod state;
pub mod instructions;
pub mod credit_helpers;

use instructions::*;

declare_id!("3i5GgdaySbxcBB133fp2Nyk9ER66d1fEGyTFCxqdjWqv");

#[program]
pub mod roosta {
    use super::*;

    pub fn create_circle(
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
        instructions::create_circle::handler(
            ctx,
            circle_id,
            name,
            member_count,
            total_rounds,
            contribution_amount,
            round_duration,
            trust_gate_enabled,
            risk_deposit_enabled,
            locked_reserve_enabled,
            early_position_collateral_ratio,
            locked_reserve_ratio,
            grace_period_seconds,
        )
    }

    pub fn join_circle(ctx: Context<JoinCircle>) -> Result<()> {
        instructions::join_circle::handler(ctx)
    }

    pub fn deposit(ctx: Context<Deposit>) -> Result<()> {
        instructions::deposit::handler(ctx)
    }

    pub fn trigger_payout(ctx: Context<TriggerPayout>) -> Result<()> {
        instructions::trigger_payout::handler(ctx)
    }

    pub fn init_user_vault(ctx: Context<InitUserVault>) -> Result<()> {
        instructions::init_user_vault::handler(ctx)
    }

    pub fn top_up_vault(ctx: Context<TopUpVault>, amount: u64) -> Result<()> {
        instructions::top_up_vault::handler(ctx, amount)
    }

    pub fn withdraw_vault(ctx: Context<WithdrawVault>, amount: u64) -> Result<()> {
        instructions::withdraw_vault::handler(ctx, amount)
    }

    pub fn init_credit_profile(ctx: Context<InitCreditProfile>) -> Result<()> {
        instructions::init_credit_profile::handler(ctx)
    }

    pub fn deposit_risk_collateral(ctx: Context<DepositRiskCollateral>) -> Result<()> {
        instructions::deposit_risk_collateral::handler(ctx)
    }

    pub fn unlock_reserve(ctx: Context<UnlockReserve>) -> Result<()> {
        instructions::unlock_reserve::handler(ctx)
    }

    pub fn try_activate_round1(ctx: Context<TryActivateRound1>) -> Result<()> {
        instructions::try_activate_round1::handler(ctx)
    }

    pub fn mark_delayed(ctx: Context<MarkDelayed>) -> Result<()> {
        instructions::mark_delayed::handler(ctx)
    }

    pub fn mark_member_delayed(ctx: Context<MarkMemberDelayed>) -> Result<()> {
        instructions::mark_member_delayed::handler(ctx)
    }

    pub fn mark_default(ctx: Context<MarkDefault>) -> Result<()> {
        instructions::mark_default::handler(ctx)
    }

    pub fn slash_collateral(ctx: Context<SlashCollateral>) -> Result<()> {
        instructions::slash_collateral::handler(ctx)
    }

    pub fn mint_position_nft(ctx: Context<MintPositionNft>) -> Result<()> {
        instructions::mint_position_nft::handler(ctx)
    }
}
