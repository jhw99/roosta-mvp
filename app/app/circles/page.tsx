"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CircleCard, type CircleEntry } from "@/components/circle-card";

type Filter = "all" | "mine";

interface CircleApiEntry {
  publicKey: string;
  account: {
    authority: string;
    circleId: string;
    name: string;
    memberCount: number;
    totalRounds: number;
    currentRound: number;
    contributionAmount: string;
    roundDuration: string;
    startedAt: string;
    status: unknown;
    members: string[];
    payoutOrder: number[];
  };
}

function hydrate(e: CircleApiEntry): CircleEntry {
  return {
    publicKey: new PublicKey(e.publicKey),
    account: {
      authority: new PublicKey(e.account.authority),
      circleId: new BN(e.account.circleId),
      name: e.account.name,
      memberCount: e.account.memberCount,
      totalRounds: e.account.totalRounds,
      currentRound: e.account.currentRound,
      contributionAmount: new BN(e.account.contributionAmount),
      roundDuration: new BN(e.account.roundDuration),
      startedAt: new BN(e.account.startedAt),
      status: e.account.status as never,
      members: e.account.members.map((m) => new PublicKey(m)),
      payoutOrder: e.account.payoutOrder,
    } as unknown as CircleEntry["account"],
  };
}

export default function CirclesPage() {
  const wallet = useAnchorWallet();
  const [loading, setLoading] = useState(true);
  const [circles, setCircles] = useState<CircleEntry[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/circles");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "fetch failed");
        if (cancelled) return;
        const all = (data.circles as CircleApiEntry[]).map(hydrate);
        const sorted = [...all].sort((a, b) => {
          const av = a.account.startedAt?.toString() ?? "0";
          const bv = b.account.startedAt?.toString() ?? "0";
          return bv.localeCompare(av, undefined, { numeric: true });
        });
        setCircles(sorted);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered =
    filter === "mine" && wallet
      ? circles.filter((c) =>
          c.account.members.some(
            (m) => m.toBase58() === wallet.publicKey.toBase58()
          )
        )
      : circles;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1
            className="text-3xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Circles
          </h1>
          <p className="text-sm text-[var(--muted)] mt-1">
            All Roosta savings circles on devnet.
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <div className="flex rounded-[var(--radius-md)] border border-[var(--border)] overflow-hidden text-sm">
            <button
              type="button"
              className={`px-3 h-9 ${
                filter === "all"
                  ? "bg-[var(--primary)] text-white"
                  : "hover:bg-[var(--card-hover)]"
              }`}
              onClick={() => setFilter("all")}
            >
              All
            </button>
            <button
              type="button"
              className={`px-3 h-9 border-l border-[var(--border)] ${
                filter === "mine"
                  ? "bg-[var(--primary)] text-white"
                  : "hover:bg-[var(--card-hover)]"
              }`}
              onClick={() => setFilter("mine")}
              disabled={!wallet}
              title={wallet ? "" : "Connect wallet"}
            >
              Mine
            </button>
          </div>
          <Link href="/circles/new">
            <Button>+ New circle</Button>
          </Link>
        </div>
      </div>

      {loading && <p className="text-[var(--muted)]">Loading…</p>}
      {error && <p className="text-[var(--error)] text-sm">Error: {error}</p>}

      {!loading && filtered.length === 0 && !error && (
        <Card>
          <CardContent className="p-10 text-center">
            <p className="text-[var(--muted)] mb-4">
              {filter === "mine"
                ? "You have not joined any circles yet."
                : "No circles yet — be the first."}
            </p>
            <Link href="/circles/new">
              <Button>Create a circle</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((c) => (
          <CircleCard key={c.publicKey.toBase58()} entry={c} />
        ))}
      </div>
    </div>
  );
}
