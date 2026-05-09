"use client";

import type { PublicKey } from "@solana/web3.js";
import { explorerAddr, shortAddr } from "@/lib/utils";
import { TRUST_TIER_LABEL, type TrustTier } from "@/lib/trust-gate";

const TIER_COLORS: Record<TrustTier, string> = {
  Tier0New: "var(--muted)",
  Tier1Verified: "#7aa3ff",
  Tier2Trusted: "#5cc8a5",
  Tier3Prime: "var(--primary)",
  Tier4Guarantor: "var(--accent)",
};

type Props = {
  tier: TrustTier;
  sbtMint: PublicKey | string | null | undefined;
};

export function CreditSbtBadge({ tier, sbtMint }: Props) {
  const mintStr =
    typeof sbtMint === "string" ? sbtMint : sbtMint ? sbtMint.toBase58() : null;
  const isMinted = !!mintStr && mintStr !== "11111111111111111111111111111111";
  const color = TIER_COLORS[tier] ?? "var(--primary)";

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border)] p-4 flex items-center justify-between gap-3">
      <div>
        <div className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
          Credit SBT
        </div>
        <div
          className="mt-1 text-base font-semibold"
          style={{ color, fontFamily: "var(--font-display)" }}
        >
          {TRUST_TIER_LABEL[tier]}
        </div>
        {isMinted && mintStr && (
          <a
            href={explorerAddr(mintStr)}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-block text-[11px] text-[var(--primary)] hover:underline"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            {shortAddr(mintStr)} ↗
          </a>
        )}
      </div>
      <div
        className="h-12 w-12 rounded-full flex items-center justify-center text-xl font-bold"
        style={{
          background: `color-mix(in oklab, ${color} 18%, var(--card))`,
          color,
        }}
        aria-hidden
      >
        ★
      </div>
    </div>
  );
}
