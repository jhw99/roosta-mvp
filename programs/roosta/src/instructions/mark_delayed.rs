use anchor_lang::prelude::*;

use crate::constants::*;
use crate::errors::RoostaError;
use crate::state::*;

#[derive(Accounts)]
pub struct MarkDelayed<'info> {
    pub caller: Signer<'info>,

    #[account(
        seeds = [CIRCLE_SEED, circle.authority.as_ref(), &circle.circle_id.to_le_bytes()],
        bump = circle.bump,
    )]
    pub circle: Box<Account<'info, Circle>>,

    #[account(
        mut,
        seeds = [ROUND_SEED, circle.key().as_ref(), &[circle.current_round]],
        bump = round.bump,
    )]
    pub round: Box<Account<'info, Round>>,
}

pub fn handler(ctx: Context<MarkDelayed>) -> Result<()> {
    let circle = &ctx.accounts.circle;
    let round = &mut ctx.accounts.round;

    require!(round.status == RoundStatus::Active, RoostaError::RoundNotActive);
    require!(
        round.deposits_count < circle.member_count,
        RoostaError::AlreadySettled
    );

    let clock = Clock::get()?;
    require!(
        clock.unix_timestamp > round.deadline,
        RoostaError::DeadlineNotPassed
    );

    round.status = RoundStatus::Delayed;
    round.delayed_at = clock.unix_timestamp;

    Ok(())
}
