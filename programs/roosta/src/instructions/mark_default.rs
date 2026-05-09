use anchor_lang::prelude::*;

use crate::constants::*;
use crate::credit_helpers;
use crate::errors::RoostaError;
use crate::state::*;

#[derive(Accounts)]
pub struct MarkDefault<'info> {
    pub caller: Signer<'info>,

    #[account(
        seeds = [CIRCLE_SEED, circle.authority.as_ref(), &circle.circle_id.to_le_bytes()],
        bump = circle.bump,
    )]
    pub circle: Box<Account<'info, Circle>>,

    #[account(
        seeds = [ROUND_SEED, circle.key().as_ref(), &[circle.current_round]],
        bump = round.bump,
    )]
    pub round: Box<Account<'info, Round>>,

    #[account(
        mut,
        seeds = [MEMBER_SEED, circle.key().as_ref(), member_status.wallet.as_ref()],
        bump = member_status.bump,
    )]
    pub member_status: Box<Account<'info, MemberStatus>>,

    #[account(
        mut,
        seeds = [CREDIT_SEED, member_status.wallet.as_ref()],
        bump = credit_profile.bump,
        constraint = credit_profile.wallet == member_status.wallet
            @ RoostaError::CreditProfileNotInitialized,
    )]
    pub credit_profile: Box<Account<'info, CreditProfile>>,
}

pub fn handler(ctx: Context<MarkDefault>) -> Result<()> {
    let circle = &ctx.accounts.circle;
    let round = &ctx.accounts.round;

    require!(round.status == RoundStatus::Delayed, RoostaError::RoundNotDelayed);

    let clock = Clock::get()?;
    let grace_end = round.delayed_at.saturating_add(circle.grace_period_seconds);
    require!(
        clock.unix_timestamp > grace_end,
        RoostaError::GracePeriodNotElapsed
    );

    let ms = &mut ctx.accounts.member_status;
    require!(
        ms.status_enum == MemberStatusEnum::Delayed,
        RoostaError::MemberNotDelayed
    );
    require!(
        !round.deposits.contains(&ms.wallet),
        RoostaError::MemberAlreadyPaid
    );
    require!(
        ms.last_defaulted_round != round.round_number,
        RoostaError::AlreadyDefaulted
    );

    ms.status_enum = MemberStatusEnum::Defaulted;
    ms.default_count = ms.default_count.saturating_add(1);
    ms.last_defaulted_round = round.round_number;

    credit_helpers::record_default(&mut ctx.accounts.credit_profile, &clock);

    Ok(())
}
