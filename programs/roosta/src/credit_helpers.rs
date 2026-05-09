use anchor_lang::prelude::*;

use crate::state::{CreditProfile, TrustTier};

pub fn record_on_time(profile: &mut CreditProfile, clock: &Clock) {
    profile.on_time_payments = profile.on_time_payments.saturating_add(1);
    profile.last_updated_at = clock.unix_timestamp;
}

pub fn record_late(profile: &mut CreditProfile, clock: &Clock) {
    profile.late_payments = profile.late_payments.saturating_add(1);
    profile.last_updated_at = clock.unix_timestamp;
}

pub fn record_default(profile: &mut CreditProfile, clock: &Clock) {
    profile.defaults = profile.defaults.saturating_add(1);
    profile.last_updated_at = clock.unix_timestamp;
}

pub fn record_slash(profile: &mut CreditProfile, clock: &Clock) {
    profile.trust_tier = TrustTier::Tier0New;
    profile.last_updated_at = clock.unix_timestamp;
    // defaults already incremented in mark_default; do not double count
}
