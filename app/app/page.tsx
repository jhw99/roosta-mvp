"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/logo";
import { CircleCard, type CircleEntry } from "@/components/circle-card";

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

export default function HomePage() {
  const [circles, setCircles] = useState<CircleEntry[]>([]);
  const [loading, setLoading] = useState(true);
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

  const top = circles.slice(0, 10);
  const hasMore = circles.length > 10;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      {/* Hero */}
      <section className="text-center max-w-3xl mx-auto">
        <div className="flex justify-center mb-6">
          <Logo variant="stacked" priority height={104} />
        </div>
        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-[var(--accent)]/20 text-[var(--dark-primary)] mb-5">
          Devnet · MVP
        </span>
        <h1
          className="text-4xl sm:text-5xl font-extrabold tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          On-chain social savings on Solana
        </h1>
        <p className="mt-5 text-lg text-[var(--muted)]">
          Roosta lets friends form rotating savings circles backed entirely by
          smart contracts. Everyone deposits each round; one member receives
          the full pool. Trustless, transparent, and powered by USDC on Solana.
        </p>
        <div className="mt-7 flex items-center justify-center gap-3 flex-wrap">
          <Link href="/circles/new">
            <Button size="lg">Create a circle</Button>
          </Link>
          <Link href="/circles">
            <Button size="lg" variant="outline">
              Browse all circles
            </Button>
          </Link>
        </div>
      </section>

      {/* Active circles */}
      <section className="mt-16">
        <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
          <div>
            <h2
              className="text-2xl font-bold tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Active circles
            </h2>
            <p className="text-sm text-[var(--muted)] mt-1">
              The latest savings circles on Roosta.
            </p>
          </div>
          {hasMore && (
            <Link href="/circles">
              <Button variant="outline" size="sm">
                View all →
              </Button>
            </Link>
          )}
        </div>

        {loading && (
          <p className="text-[var(--muted)] text-sm">Loading circles…</p>
        )}

        {error && (
          <p className="text-[var(--error)] text-sm">Error: {error}</p>
        )}

        {!loading && !error && top.length === 0 && (
          <Card>
            <CardContent className="p-10 text-center">
              <p className="text-[var(--muted)] mb-4">
                No circles yet — create the first one.
              </p>
              <Link href="/circles/new">
                <Button>Create the first circle</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {top.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {top.map((c) => (
              <CircleCard key={c.publicKey.toBase58()} entry={c} />
            ))}
          </div>
        )}

        {hasMore && (
          <div className="mt-6 text-center">
            <Link href="/circles">
              <Button variant="outline">More circles →</Button>
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
