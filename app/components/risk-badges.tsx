"use client";

import type { CircleAccount } from "@/lib/types";

function Pill({
  on,
  label,
}: {
  on: boolean;
  label: string;
}) {
  return (
    <span
      className="text-[11px] px-2 py-0.5 rounded-full font-medium border"
      style={{
        background: on
          ? "color-mix(in oklab, var(--success) 15%, var(--card))"
          : "var(--card)",
        color: on ? "var(--success)" : "var(--muted)",
        borderColor: on
          ? "color-mix(in oklab, var(--success) 35%, transparent)"
          : "var(--border)",
      }}
    >
      {on ? "✓" : "·"} {label}
    </span>
  );
}

export function RiskBadges({ circle }: { circle: CircleAccount }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Pill on={circle.trustGateEnabled} label="Trust Gate" />
      <Pill on={circle.riskDepositEnabled} label="Risk Deposit" />
      <Pill on={circle.lockedReserveEnabled} label="Locked Reserve" />
      <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--card)] border border-[var(--border)] text-[var(--muted)]">
        Early collat: {circle.earlyPositionCollateralRatio}%
      </span>
      <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--card)] border border-[var(--border)] text-[var(--muted)]">
        Reserve: {circle.lockedReserveRatio}%
      </span>
      <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--card)] border border-[var(--border)] text-[var(--muted)]">
        Grace: {Math.round(Number(circle.gracePeriodSeconds.toString()) / 86400)}d
      </span>
    </div>
  );
}
