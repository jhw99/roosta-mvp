"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SCENARIOS = [
  {
    key: "happy-path",
    title: "Happy path",
    blurb:
      "5-member circle where everyone joins on time, deposits each round, and receives their payout in turn.",
    steps: [
      "Create a circle (5 members, 5 rounds, $10/round, 1-day rounds).",
      "Have 5 wallets join — they each pick an open position.",
      "Once full, click ‘Activate round 1’.",
      "Each member deposits each round; click ‘Trigger payout’ at the end of each round.",
    ],
    cta: { label: "Create a Happy Path circle", href: "/circles/new" },
  },
  {
    key: "trust-gate-rejection",
    title: "Trust Gate rejection",
    blurb:
      "A brand-new wallet attempts to claim position #1 in a Trust-Gate-enabled circle and gets rejected.",
    steps: [
      "Find or create a Trust-Gate-enabled circle.",
      "Connect a fresh wallet (no history, no credit profile).",
      "Click ‘Join with Trust Gate’ and pick position 1.",
      "The Trust Gate modal will explain why you’re ineligible and suggest later positions.",
    ],
    cta: { label: "Browse circles", href: "/circles" },
  },
  {
    key: "default-slash",
    title: "Default + Slash",
    blurb:
      "An early-position member fails to deposit on time. After the grace period, anyone can mark them defaulted and slash their collateral.",
    steps: [
      "Create a circle with a short round duration (1 day) and 1-day grace.",
      "Have an early-position member skip a deposit.",
      "After the deadline, anyone calls ‘Mark round delayed’ → ‘Mark default’ on the missing member.",
      "Once the grace window elapses, anyone can ‘Slash’ — the collateral is transferred into the round vault.",
    ],
    cta: {
      label: "Create a fast circle",
      href: "/circles/new",
    },
  },
];

export default function DemoPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <div>
        <h1
          className="text-3xl font-bold tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Demo scenarios
        </h1>
        <p className="text-sm text-[var(--muted)] mt-1 max-w-2xl">
          Three guided demos that exercise the v2 protocol end-to-end. Each
          scenario is currently driven manually from the UI — full one-click
          server-side seeding is planned for a follow-up phase.
        </p>
      </div>

      <div className="grid gap-4">
        {SCENARIOS.map((s) => (
          <Card key={s.key}>
            <CardHeader>
              <CardTitle>{s.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm">{s.blurb}</p>
              <ol className="text-sm text-[var(--muted)] list-decimal pl-5 space-y-1">
                {s.steps.map((st, i) => (
                  <li key={i}>{st}</li>
                ))}
              </ol>
              <div className="pt-2">
                <Link href={s.cta.href}>
                  <Button variant="outline" size="sm">
                    {s.cta.label}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reset / cleanup</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[var(--muted)]">
            Devnet circles persist on chain. To start fresh, create new circles
            with a different name and ignore the old ones — there is no global
            cleanup endpoint yet.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
