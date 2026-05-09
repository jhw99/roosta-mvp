export type TrustTier =
  | "Tier0New"
  | "Tier1Verified"
  | "Tier2Trusted"
  | "Tier3Prime"
  | "Tier4Guarantor";

export type WalletHistory = {
  walletAge_days: number;
  txCount: number;
  hasNonEmptyAssetHistory: boolean;
  recentActivityWithin30d: boolean;
};

export type CreditProfileSummary = {
  circles_completed: number;
  on_time_payments: number;
  late_payments: number;
  defaults: number;
  total_volume: string;
};

export type TrustGateResult = {
  eligible: boolean;
  reason?: string;
  trustTier: TrustTier;
  walletData: WalletHistory;
  creditProfile: CreditProfileSummary | null;
  suggestedPositions?: number[];
};

export type EvaluateTrustGateArgs = {
  wallet: string;
  desiredPosition: number;
  hasSufficientCollateral: boolean;
  agreedToReserve: boolean;
};

export const TRUST_TIER_LABEL: Record<TrustTier, string> = {
  Tier0New: "Tier 0 - New",
  Tier1Verified: "Tier 1 - Verified",
  Tier2Trusted: "Tier 2 - Trusted",
  Tier3Prime: "Tier 3 - Prime",
  Tier4Guarantor: "Tier 4 - Guarantor",
};

/** Convert an Anchor enum object (lowercase keys) into our TrustTier string. */
export function anchorTierToTrustTier(
  raw: Record<string, unknown> | undefined | null
): TrustTier {
  if (!raw) return "Tier0New";
  const k = Object.keys(raw)[0] || "";
  switch (k) {
    case "tier1Verified":
      return "Tier1Verified";
    case "tier2Trusted":
      return "Tier2Trusted";
    case "tier3Prime":
      return "Tier3Prime";
    case "tier4Guarantor":
      return "Tier4Guarantor";
    default:
      return "Tier0New";
  }
}

export async function evaluateTrustGate(
  args: EvaluateTrustGateArgs,
  init?: { signal?: AbortSignal }
): Promise<TrustGateResult> {
  const res = await fetch("/api/trust-gate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(args),
    signal: init?.signal,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`trust-gate failed: ${res.status} ${text}`);
  }
  return (await res.json()) as TrustGateResult;
}
