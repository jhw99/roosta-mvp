use anchor_lang::prelude::*;

use crate::constants::*;
use crate::errors::RoostaError;
use crate::state::*;

#[derive(Accounts)]
pub struct TryActivateRound1<'info> {
    pub caller: Signer<'info>,

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
}

pub fn handler(ctx: Context<TryActivateRound1>) -> Result<()> {
    let circle = &mut ctx.accounts.circle;
    require!(circle.status == CircleStatus::Active, RoostaError::CircleNotActive);
    require!(!circle.round1_activated, RoostaError::Round1AlreadyActivated);
    require!(
        (circle.members.len() as u8) == circle.member_count,
        RoostaError::Round1NotReady
    );
    let required: u8 = if circle.risk_deposit_enabled { 2 } else { 0 };
    require!(
        circle.risk_collaterals_collected >= required,
        RoostaError::Round1NotReady
    );

    let clock = Clock::get()?;
    let round = &mut ctx.accounts.round;
    round.recipient = circle.members[0];
    round.status = RoundStatus::Active;
    round.started_at = clock.unix_timestamp;
    round.deadline = clock.unix_timestamp.saturating_add(circle.round_duration);
    circle.round1_activated = true;

    Ok(())
}
