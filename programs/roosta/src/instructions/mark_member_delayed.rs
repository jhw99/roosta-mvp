use anchor_lang::prelude::*;

use crate::constants::*;
use crate::credit_helpers;
use crate::errors::RoostaError;
use crate::state::*;

#[derive(Accounts)]
pub struct MarkMemberDelayed<'info> {
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

pub fn handler(ctx: Context<MarkMemberDelayed>) -> Result<()> {
    let round = &ctx.accounts.round;
    require!(round.status == RoundStatus::Delayed, RoostaError::RoundNotDelayed);

    let ms = &mut ctx.accounts.member_status;
    require!(
        !round.deposits.contains(&ms.wallet),
        RoostaError::MemberAlreadyPaid
    );
    require!(
        ms.last_delayed_round != round.round_number,
        RoostaError::AlreadyDelayed
    );

    ms.status_enum = MemberStatusEnum::Delayed;
    ms.missed_count = ms.missed_count.saturating_add(1);
    ms.last_delayed_round = round.round_number;

    let clock = Clock::get()?;
    credit_helpers::record_late(&mut ctx.accounts.credit_profile, &clock);

    Ok(())
}
