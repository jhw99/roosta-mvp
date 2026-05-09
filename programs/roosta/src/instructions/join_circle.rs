use anchor_lang::prelude::*;

use crate::constants::*;
use crate::errors::RoostaError;
use crate::state::*;

#[derive(Accounts)]
pub struct JoinCircle<'info> {
    #[account(mut)]
    pub member: Signer<'info>,

    #[account(
        mut,
        seeds = [CIRCLE_SEED, circle.authority.as_ref(), &circle.circle_id.to_le_bytes()],
        bump = circle.bump,
    )]
    pub circle: Box<Account<'info, Circle>>,

    #[account(
        mut,
        seeds = [ROUND_SEED, circle.key().as_ref(), &[1u8]],
        bump = round.bump,
        constraint = round.round_number == 1 @ RoostaError::InvalidRoundNumber,
    )]
    pub round: Box<Account<'info, Round>>,

    #[account(
        init,
        payer = member,
        space = MemberStatus::SPACE,
        seeds = [MEMBER_SEED, circle.key().as_ref(), member.key().as_ref()],
        bump
    )]
    pub member_status: Box<Account<'info, MemberStatus>>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<JoinCircle>) -> Result<()> {
    let circle = &mut ctx.accounts.circle;
    require!(circle.status == CircleStatus::Active, RoostaError::CircleNotActive);
    require!(
        (circle.members.len() as u8) < circle.member_count,
        RoostaError::CircleFull
    );
    let wallet = ctx.accounts.member.key();
    require!(!circle.members.contains(&wallet), RoostaError::AlreadyJoined);

    let clock = Clock::get()?;

    let idx = circle.members.len() as u8;
    circle.members.push(wallet);
    circle.payout_order.push(idx);

    let ms = &mut ctx.accounts.member_status;
    ms.circle = circle.key();
    ms.wallet = wallet;
    ms.joined_at = clock.unix_timestamp;
    ms.total_deposited = 0;
    ms.deposit_count = 0;
    ms.missed_count = 0;
    ms.received_amount = 0;
    ms.received_at = None;
    ms.bump = ctx.bumps.member_status;
    // v2 defaults
    ms.payout_order = idx;
    ms.position_nft_mint = Pubkey::default();
    ms.collateral_nft_mint_some = false;
    ms.collateral_nft_mint = Pubkey::default();
    ms.default_count = 0;
    ms.collateral_amount = 0;
    ms.locked_reserve_amount = 0;
    ms.status_enum = MemberStatusEnum::Active;
    ms.locked_reserve_initial = 0;
    ms.locked_reserve_unlocks_done = 0;
    ms.last_delayed_round = 0;
    ms.last_defaulted_round = 0;
    ms.slashed = false;
    ms.shortfall = 0;

    // When circle becomes full, optionally activate first round.
    if circle.members.len() as u8 == circle.member_count {
        let required_collaterals: u8 = if circle.risk_deposit_enabled { 2 } else { 0 };
        if circle.risk_collaterals_collected >= required_collaterals && !circle.round1_activated {
            let round = &mut ctx.accounts.round;
            round.recipient = circle.members[0];
            round.status = RoundStatus::Active;
            round.started_at = clock.unix_timestamp;
            round.deadline = clock.unix_timestamp.saturating_add(circle.round_duration);
            circle.round1_activated = true;
        }
    }

    Ok(())
}
