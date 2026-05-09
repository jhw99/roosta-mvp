"use client";

import { useEffect, useState } from "react";
import { fetchRelayerStatus } from "@/lib/relayer-client";

export function GaslessIndicator({
  className = "",
  showAdminBalance = false,
}: {
  className?: string;
  showAdminBalance?: boolean;
}) {
  const [status, setStatus] = useState<{
    available: boolean;
    balance: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchRelayerStatus().then((s) => {
      if (!cancelled) setStatus(s);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const dimmed = status !== null && !status.available;
  const tooltip = dimmed
    ? "Relayer is unavailable — your wallet will pay the network fee"
    : "Phase 2 — fee payer enabled. Roosta covers the network fee for this action.";

  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
        dimmed
          ? "bg-[var(--muted)]/15 text-[var(--muted)] opacity-60"
          : "bg-[var(--accent)]/15 text-[var(--accent)]"
      } ${className}`}
      title={tooltip}
    >
      <span aria-hidden>{dimmed ? "•" : "✨"}</span>
      <span>
        {dimmed ? "Gas: wallet (relayer offline)" : "Gas covered by Roosta"}
      </span>
      {showAdminBalance && status && (
        <span className="ml-1 opacity-70">
          {status.balance.toFixed(4)} SOL
        </span>
      )}
    </span>
  );
}
