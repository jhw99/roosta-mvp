use anchor_lang::prelude::*;

#[error_code]
pub enum RoostaError {
    #[msg("Caller is not a member of this circle")]
    NotMember,
    #[msg("Member has already deposited for this round")]
    AlreadyDeposited,
    #[msg("Circle is already full")]
    CircleFull,
    #[msg("Member has already joined this circle")]
    AlreadyJoined,
    #[msg("Round is not currently active")]
    RoundNotActive,
    #[msg("Circle is not active")]
    CircleNotActive,
    #[msg("Not all deposits received for this round")]
    NotAllDepositsReceived,
    #[msg("Round has already been settled")]
    AlreadySettled,
    #[msg("Invalid round number")]
    InvalidRoundNumber,
    #[msg("Name exceeds maximum length")]
    NameTooLong,
    #[msg("User vault is not initialized")]
    VaultNotInitialized,
    #[msg("Insufficient vault balance")]
    InsufficientVaultBalance,
    #[msg("Risk deposit not enabled for this circle")]
    RiskDepositNotEnabled,
    #[msg("Position does not require risk collateral")]
    PositionNotEligibleForCollateral,
    #[msg("Collateral already deposited")]
    CollateralAlreadyDeposited,
    #[msg("Circle has already started rounds")]
    CircleAlreadyStarted,
    #[msg("No locked reserve to unlock")]
    NoLockedReserve,
    #[msg("Reserve already fully unlocked")]
    ReserveAlreadyUnlocked,
    #[msg("Circle round 1 is not yet eligible to activate")]
    Round1NotReady,
    #[msg("Round 1 already activated")]
    Round1AlreadyActivated,
    #[msg("Round deadline has not yet passed")]
    DeadlineNotPassed,
    #[msg("Round is not in delayed state")]
    RoundNotDelayed,
    #[msg("Member already deposited this round")]
    MemberAlreadyPaid,
    #[msg("Member already marked delayed for this round")]
    AlreadyDelayed,
    #[msg("Grace period has not yet elapsed")]
    GracePeriodNotElapsed,
    #[msg("Member is not in delayed state")]
    MemberNotDelayed,
    #[msg("Member already marked defaulted for this round")]
    AlreadyDefaulted,
    #[msg("Member is not defaulted")]
    MemberNotDefaulted,
    #[msg("Member already slashed")]
    AlreadySlashed,
    #[msg("Credit profile not initialized")]
    CreditProfileNotInitialized,
    #[msg("Position NFT already minted for this member")]
    PositionNftAlreadyMinted,
}
