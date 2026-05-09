"use client";

import Link from "next/link";
import type { PublicKey } from "@solana/web3.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatUsdc, shortAddr, statusKey } from "@/lib/utils";
import type { CircleAccount } from "@/lib/types";

export interface CircleEntry {
  publicKey: PublicKey;
  account: CircleAccount;
}

const STATUS_STYLES: Record<string, string> = {
  active: "bg-roosta-100 text-roosta-700",
  completed: "bg-success/15 text-success",
  cancelled: "bg-error/15 text-error",
  settled: "bg-success/15 text-success",
  delayed: "bg-warning/15 text-warning",
  pending: "bg-muted/15 text-muted",
};

export function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_STYLES[status] || "bg-roosta-100 text-roosta-700";
  return (
    <span
      className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${cls}`}
    >
      {status}
    </span>
  );
}

export function CircleCard({ entry }: { entry: CircleEntry }) {
  const { account: c, publicKey } = entry;
  const status = statusKey(c.status);
  const filled = c.members.length;
  const total = c.memberCount;
  const pct = total > 0 ? (filled / total) * 100 : 0;

  return (
    <Link href={`/circles/${publicKey.toBase58()}`} className="block">
      <Card className="hover:border-[var(--primary)] transition-colors cursor-pointer h-full">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="truncate">{c.name}</CardTitle>
            <StatusBadge status={status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between text-xs text-[var(--muted)] mb-1.5">
              <span>Members</span>
              <span className="font-semibold text-[var(--foreground)]">
                {filled} / {total}
              </span>
            </div>
            <div className="w-full h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--primary)] transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-[var(--muted)] text-xs">Contribution</div>
              <div className="font-semibold">
                {formatUsdc(c.contributionAmount)} USDC
              </div>
            </div>
            <div>
              <div className="text-[var(--muted)] text-xs">Round</div>
              <div className="font-semibold">
                {Math.min(c.currentRound, c.totalRounds)} / {c.totalRounds}
              </div>
            </div>
            <div className="col-span-2">
              <div className="text-[var(--muted)] text-xs">Authority</div>
              <div
                className="font-mono text-xs"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {shortAddr(c.authority)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
