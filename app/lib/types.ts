import type { PublicKey } from "@solana/web3.js";
import type BN from "bn.js";

export type CircleStatus = "active" | "completed" | "cancelled";
export type RoundStatusKind = "pending" | "active" | "settled" | "delayed";
export type MemberStatusKind =
  | "active"
  | "paid"
  | "received"
  | "completed"
  | "delayed"
  | "defaulted"
  | "slashed";
export type TrustTier =
  | "tier0New"
  | "tier1Verified"
  | "tier2Trusted"
  | "tier3Prime"
  | "tier4Guarantor";

export interface CircleAccount {
  authority: PublicKey;
  circleId: BN;
  name: string;
  usdcMint: PublicKey;
  vault: PublicKey;
  memberCount: number;
  totalRounds: number;
  currentRound: number;
  contributionAmount: BN;
  roundDuration: BN;
  startedAt: BN;
  status: { active?: object; completed?: object; cancelled?: object };
  members: PublicKey[];
  payoutOrder: Buffer | number[];
  bump: number;
  vaultBump: number;
  collateralVault: PublicKey;
  trustGateEnabled: boolean;
  riskDepositEnabled: boolean;
  lockedReserveEnabled: boolean;
  earlyPositionCollateralRatio: number;
  lockedReserveRatio: number;
  gracePeriodSeconds: BN;
  riskCollateralsCollected: boolean;
  round1Activated: boolean;
}

export interface RoundAccount {
  circle: PublicKey;
  roundNumber: number;
  recipient: PublicKey;
  depositsCount: number;
  status: {
    pending?: object;
    active?: object;
    settled?: object;
    delayed?: object;
  };
  startedAt: BN;
  settledAt: BN | null;
  deposits: PublicKey[];
  bump: number;
  deadline: BN;
  totalCollected: BN;
  payoutAmount: BN;
  reserveAmount: BN;
  delayedAt: BN | null;
}

export interface MemberStatusAccount {
  circle: PublicKey;
  wallet: PublicKey;
  joinedAt: BN;
  totalDeposited: BN;
  depositCount: number;
  missedCount: number;
  receivedAmount: BN;
  receivedAt: BN | null;
  bump: number;
  payoutOrder: number;
  positionNftMint: PublicKey;
  collateralNftMintSome: boolean;
  collateralNftMint: PublicKey;
  defaultCount: number;
  collateralAmount: BN;
  lockedReserveAmount: BN;
  statusEnum: Record<string, object>;
  lockedReserveInitial: BN;
  lockedReserveUnlocksDone: number;
  lastDelayedRound: number;
  lastDefaultedRound: number;
  slashed: boolean;
  shortfall: BN;
}

export interface CreditProfileAccount {
  wallet: PublicKey;
  trustTier: Record<string, object>;
  circlesCompleted: number;
  onTimePayments: number;
  latePayments: number;
  defaults: number;
  totalVolume: BN;
  lastUpdatedAt: BN;
  earlyPositionEligible: boolean;
  sbtMint: PublicKey;
  bump: number;
}
