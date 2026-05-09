"use client";

import { useEffect, useState, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  evaluateTrustGate,
  TRUST_TIER_LABEL,
  type TrustGateResult,
  type TrustTier,
} from "@/lib/trust-gate";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type TrustGateCircle = {
  contributionAmount?: bigint | string | number;
  totalRounds?: number;
  name?: string;
} | null | undefined;

type Props = {
  isOpen: boolean;
  onClose: () => void;
  circle: TrustGateCircle;
  desiredPosition: number;
  // Optional overrides; if not provided we infer reasonable defaults.
  hasSufficientCollateral?: boolean;
  agreedToReserve?: boolean;
  onConfirmEligible: (result: TrustGateResult) => void;
  /** When true, render a deterministic mock evaluation result without hitting the API. */
  forcePreview?: boolean;
};

const PREVIEW_RESULT: TrustGateResult = {
  eligible: false,
  reason:
    "Wallet age 12 days (need 30+); Trust Tier 1 (need 3+)",
  trustTier: "Tier1Verified",
  walletData: {
    walletAge_days: 12,
    txCount: 8,
    hasNonEmptyAssetHistory: true,
    recentActivityWithin30d: true,
  },
  creditProfile: null,
  suggestedPositions: [3, 4, 5],
};

const TIER_COLOR: Record<TrustTier, string> = {
  Tier0New: "var(--muted-foreground, #9ca3af)",
  Tier1Verified: "var(--primary)",
  Tier2Trusted: "var(--primary)",
  Tier3Prime: "var(--primary)",
  Tier4Guarantor: "var(--primary)",
};

export function TrustGateModal({
  isOpen,
  onClose,
  circle: _circle,
  desiredPosition,
  hasSufficientCollateral = true,
  agreedToReserve = true,
  onConfirmEligible,
  forcePreview = false,
}: Props) {
  const { publicKey } = useWallet();
  const [position, setPosition] = useState(desiredPosition);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TrustGateResult | null>(null);

  useEffect(() => {
    setPosition(desiredPosition);
  }, [desiredPosition]);

  const runGate = useCallback(
    async (pos: number) => {
      if (forcePreview) {
        setLoading(false);
        setError(null);
        setResult({ ...PREVIEW_RESULT });
        return;
      }
      if (!publicKey) {
        setError("Connect a wallet first.");
        return;
      }
      setLoading(true);
      setError(null);
      setResult(null);
      const controller = new AbortController();
      try {
        const r = await evaluateTrustGate(
          {
            wallet: publicKey.toBase58(),
            desiredPosition: pos,
            hasSufficientCollateral,
            agreedToReserve,
          },
          { signal: controller.signal }
        );
        setResult(r);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
      } finally {
        setLoading(false);
      }
      return () => controller.abort();
    },
    [publicKey, hasSufficientCollateral, agreedToReserve, forcePreview]
  );

  useEffect(() => {
    if (!isOpen) return;
    runGate(position);
  }, [isOpen, position, runGate]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Trust Gate Check</CardTitle>
              <button
                aria-label="Close"
                onClick={onClose}
                className="text-sm opacity-70 hover:opacity-100"
              >
                Close
              </button>
            </div>
            <p className="mt-1 text-sm opacity-70">
              Checking eligibility for position {position}.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading && (
              <div className="py-8 text-center text-sm opacity-70">
                Evaluating wallet history and credit profile...
              </div>
            )}

            {error && !loading && (
              <div className="rounded-[var(--radius-md)] border border-[var(--border)] p-3 text-sm">
                <div className="font-medium">Error</div>
                <div className="opacity-80 mt-1">{error}</div>
                <Button
                  className="mt-3"
                  variant="outline"
                  size="sm"
                  onClick={() => runGate(position)}
                >
                  Retry
                </Button>
              </div>
            )}

            {result && !loading && (
              <>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Stat
                    label="Wallet age"
                    value={`${result.walletData.walletAge_days} d`}
                  />
                  <Stat
                    label="Tx count"
                    value={`${result.walletData.txCount}${
                      result.walletData.txCount >= 1000 ? "+" : ""
                    }`}
                  />
                  <Stat
                    label="Recent activity"
                    value={
                      result.walletData.recentActivityWithin30d
                        ? "Within 30d"
                        : "None"
                    }
                  />
                  <Stat
                    label="Asset holdings"
                    value={
                      result.walletData.hasNonEmptyAssetHistory ? "Yes" : "None"
                    }
                  />
                </div>

                <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border)] p-3">
                  <span className="text-sm opacity-70">Trust Tier</span>
                  <span
                    className="rounded-full px-3 py-1 text-xs font-semibold"
                    style={{
                      background: "var(--card-hover)",
                      color: TIER_COLOR[result.trustTier],
                    }}
                  >
                    {TRUST_TIER_LABEL[result.trustTier]}
                  </span>
                </div>

                {result.creditProfile && (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <Stat
                      label="Circles completed"
                      value={`${result.creditProfile.circles_completed}`}
                    />
                    <Stat
                      label="On-time payments"
                      value={`${result.creditProfile.on_time_payments}`}
                    />
                    <Stat
                      label="Late"
                      value={`${result.creditProfile.late_payments}`}
                    />
                    <Stat
                      label="Defaults"
                      value={`${result.creditProfile.defaults}`}
                    />
                  </div>
                )}

                {result.eligible ? (
                  <div className="rounded-[var(--radius-md)] border border-[var(--border)] p-3 text-sm">
                    <div className="font-medium">Eligible</div>
                    <div className="opacity-80 mt-1">
                      You can claim position {position}.
                    </div>
                    <Button
                      className="mt-3 w-full"
                      onClick={() => onConfirmEligible(result)}
                    >
                      Continue
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-[var(--radius-md)] border border-[var(--border)] p-3 text-sm">
                    <div className="font-medium">Not eligible</div>
                    <div className="opacity-80 mt-1">
                      {result.reason ?? "This position is not available."}
                    </div>
                    {result.suggestedPositions &&
                      result.suggestedPositions.length > 0 && (
                        <div className="mt-3">
                          <div className="text-xs opacity-70 mb-2">
                            Try a later position:
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {result.suggestedPositions
                              .slice(0, 5)
                              .map((p) => (
                                <Button
                                  key={p}
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setPosition(p)}
                                >
                                  Position {p}
                                </Button>
                              ))}
                          </div>
                        </div>
                      )}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border)] p-3">
      <div className="text-xs opacity-70">{label}</div>
      <div className="font-semibold mt-0.5">{value}</div>
    </div>
  );
}
