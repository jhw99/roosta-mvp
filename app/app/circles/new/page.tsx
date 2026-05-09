"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useConnection, useAnchorWallet } from "@solana/wallet-adapter-react";
import BN from "bn.js";
import {
  getProgram,
  circlePda,
  vaultPda,
  roundPda,
  collateralVaultPda,
  USDC_MINT,
} from "@/lib/anchor-client";
import { parseUsdc, explorerTx } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { GaslessIndicator } from "@/components/gasless-indicator";

export default function NewCirclePage() {
  const router = useRouter();
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  const [name, setName] = useState("");
  const [memberCount, setMemberCount] = useState(3);
  const [totalRounds, setTotalRounds] = useState(3);
  const [contribution, setContribution] = useState("10");
  const [durationDays, setDurationDays] = useState(7);
  const [submitting, setSubmitting] = useState(false);

  // Risk parameters
  const [showRisk, setShowRisk] = useState(false);
  const [trustGateEnabled, setTrustGateEnabled] = useState(true);
  const [riskDepositEnabled, setRiskDepositEnabled] = useState(true);
  const [lockedReserveEnabled, setLockedReserveEnabled] = useState(true);
  const [earlyCollateralRatio, setEarlyCollateralRatio] = useState(100);
  const [lockedReserveRatio, setLockedReserveRatio] = useState(50);
  const [graceDays, setGraceDays] = useState(3);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!wallet) {
      alert("Connect your wallet first.");
      return;
    }
    if (!name.trim()) {
      alert("Name is required.");
      return;
    }
    setSubmitting(true);
    try {
      const program = getProgram(wallet, connection);
      const circleId = new BN(Date.now());
      const [circle] = circlePda(wallet.publicKey, circleId);
      const [vault] = vaultPda(circle);
      const [collateralVault] = collateralVaultPda(circle);
      const [round0] = roundPda(circle, 1);

      const sig = await program.methods
        .createCircle(
          circleId,
          name.trim(),
          memberCount,
          totalRounds,
          parseUsdc(contribution),
          new BN(durationDays * 24 * 60 * 60),
          trustGateEnabled,
          riskDepositEnabled,
          lockedReserveEnabled,
          earlyCollateralRatio,
          lockedReserveRatio,
          new BN(graceDays * 24 * 60 * 60)
        )
        .accounts({
          authority: wallet.publicKey,
          circle,
          vault,
          collateralVault,
          round: round0,
          usdcMint: USDC_MINT,
        } as never)
        .rpc();

      alert(`Circle created!\n\n${explorerTx(sig)}`);
      router.push(`/circles/${circle.toBase58()}`);
    } catch (e) {
      console.error(e);
      alert(`Error: ${(e as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-3xl font-bold tracking-tight mb-2">
        Create a Circle
      </h1>
      <p className="text-sm text-[var(--muted)] mb-8">
        Configure your savings circle. You will be the first member.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Circle Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Family Savings"
                maxLength={32}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="members">Member count (2–10)</Label>
                <Input
                  id="members"
                  type="number"
                  min={2}
                  max={10}
                  value={memberCount}
                  onChange={(e) => {
                    const n = parseInt(e.target.value || "2", 10);
                    setMemberCount(n);
                    setTotalRounds(n);
                  }}
                  required
                />
              </div>
              <div>
                <Label htmlFor="rounds">Total rounds</Label>
                <Input
                  id="rounds"
                  type="number"
                  min={1}
                  max={20}
                  value={totalRounds}
                  onChange={(e) =>
                    setTotalRounds(parseInt(e.target.value || "1", 10))
                  }
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="contribution">Contribution (USDC per round)</Label>
              <Input
                id="contribution"
                type="number"
                step="0.01"
                min="0.01"
                value={contribution}
                onChange={(e) => setContribution(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="duration">Round duration (days)</Label>
              <Input
                id="duration"
                type="number"
                min={1}
                max={90}
                value={durationDays}
                onChange={(e) =>
                  setDurationDays(parseInt(e.target.value || "1", 10))
                }
                required
              />
            </div>

            {/* Risk parameters */}
            <div className="border-t border-[var(--border)] pt-4">
              <button
                type="button"
                className="text-sm font-semibold flex items-center gap-2"
                onClick={() => setShowRisk((s) => !s)}
              >
                <span>{showRisk ? "▾" : "▸"}</span>
                Risk parameters
                <span className="text-xs text-[var(--muted)] font-normal">
                  (advanced)
                </span>
              </button>

              {showRisk && (
                <div className="mt-4 space-y-4">
                  <Toggle
                    label="Trust Gate"
                    description="Score new members before they can take early positions."
                    checked={trustGateEnabled}
                    onChange={setTrustGateEnabled}
                  />
                  <Toggle
                    label="Risk Deposit"
                    description="Members in positions 1 & 2 post collateral."
                    checked={riskDepositEnabled}
                    onChange={setRiskDepositEnabled}
                  />
                  <Toggle
                    label="Locked Reserve"
                    description="Hold a portion of early payouts as bonded reserve."
                    checked={lockedReserveEnabled}
                    onChange={setLockedReserveEnabled}
                  />

                  <SliderField
                    label="Early-position collateral ratio"
                    suffix="%"
                    min={50}
                    max={100}
                    value={earlyCollateralRatio}
                    onChange={setEarlyCollateralRatio}
                  />
                  <SliderField
                    label="Locked reserve ratio"
                    suffix="%"
                    min={0}
                    max={60}
                    value={lockedReserveRatio}
                    onChange={setLockedReserveRatio}
                  />
                  <SliderField
                    label="Grace period"
                    suffix="d"
                    min={1}
                    max={7}
                    value={graceDays}
                    onChange={setGraceDays}
                  />
                </div>
              )}
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={submitting || !wallet}>
                {submitting ? "Creating…" : "Create Circle"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <GaslessIndicator />
            </div>

            {!wallet && (
              <p className="text-xs text-[var(--muted)]">
                Connect your wallet to create a circle.
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (b: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-3 cursor-pointer">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {description && (
          <div className="text-xs text-[var(--muted)] mt-0.5">{description}</div>
        )}
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 accent-[var(--primary)]"
      />
    </label>
  );
}

function SliderField({
  label,
  suffix,
  min,
  max,
  value,
  onChange,
}: {
  label: string;
  suffix: string;
  min: number;
  max: number;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="font-semibold">
          {value}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="w-full mt-1.5 accent-[var(--primary)]"
      />
      <div className="flex justify-between text-[10px] text-[var(--muted)]">
        <span>
          {min}
          {suffix}
        </span>
        <span>
          {max}
          {suffix}
        </span>
      </div>
    </div>
  );
}
