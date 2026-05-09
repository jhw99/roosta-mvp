"use client";

import type { PublicKey } from "@solana/web3.js";
import { explorerAddr, shortAddr } from "@/lib/utils";

type Props = {
  position: number;
  mint: PublicKey | string | null | undefined;
  circleName?: string;
};

export function PositionNftBadge({ position, mint, circleName }: Props) {
  const mintStr =
    typeof mint === "string" ? mint : mint ? mint.toBase58() : null;
  const isMinted = !!mintStr && mintStr !== "11111111111111111111111111111111";

  return (
    <div
      className="relative rounded-[var(--radius-md)] border border-[var(--border)] p-3 overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, var(--card) 0%, color-mix(in oklab, var(--primary) 8%, var(--card)) 100%)",
      }}
    >
      <div
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage: "url(/roosta-icon.svg)",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right -12px bottom -12px",
          backgroundSize: "96px 96px",
        }}
      />
      <div className="relative">
        <div className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
          Position NFT
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span
            className="text-lg font-bold"
            style={{ fontFamily: "var(--font-display)" }}
          >
            #{position + 1}
          </span>
          {circleName && (
            <span className="text-xs text-[var(--muted)] truncate">
              · {circleName}
            </span>
          )}
        </div>
        <div className="mt-1.5 text-[11px]">
          {isMinted ? (
            <a
              href={explorerAddr(mintStr!)}
              target="_blank"
              rel="noreferrer"
              className="text-[var(--primary)] hover:underline"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {shortAddr(mintStr!)} ↗
            </a>
          ) : (
            <span className="text-[var(--muted)]">Not minted</span>
          )}
        </div>
      </div>
    </div>
  );
}
