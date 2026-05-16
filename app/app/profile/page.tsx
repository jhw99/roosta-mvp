"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import {
  getProgram,
  creditProfilePda,
} from "@/lib/anchor-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditSbtBadge } from "@/components/credit-sbt-badge";
import { PositionNftBadge } from "@/components/position-nft-badge";
import { GaslessIndicator } from "@/components/gasless-indicator";
import { buildAndSubmitGasless } from "@/lib/relayer-client";
import { formatUsdc, shortAddr } from "@/lib/utils";
import { anchorTierToTrustTier } from "@/lib/trust-gate";
import type {
  MemberStatusAccount,
  CreditProfileAccount,
} from "@/lib/types";
import type { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

interface MemberEntry {
  publicKey: PublicKey;
  account: MemberStatusAccount;
}

const PREVIEW_SBT_MINT = "SBTPrime11111111111111111111111111111111111";
const PREVIEW_WALLET = "Demo111111111111111111111111111111111111111";

const PREVIEW_NFTS = [
  {
    mint: "PosNFT1Seoul1Builders111111111111111111111",
    position: 2,
    circleName: "Seoul Builders",
  },
  {
    mint: "PosNFT2NYCSatCoffee1111111111111111111111",
    position: 1,
    circleName: "NYC Saturday Coffee",
  },
  {
    mint: "PosNFT3LisbonDevs11111111111111111111111111",
    position: 3,
    circleName: "Lisbon Devs",
  },
];

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="max-w-4xl mx-auto px-4 sm:px-6 py-10"><p className="text-[var(--muted)]">Loading…</p></div>}>
      <ProfilePageInner />
    </Suspense>
  );
}

function ProfilePageInner() {
  const searchParams = useSearchParams();
  const previewMode = searchParams?.get("preview") === "1";

  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const [entries, setEntries] = useState<MemberEntry[]>([]);
  const [credit, setCredit] = useState<CreditProfileAccount | null>(null);
  const [creditMissing, setCreditMissing] = useState(false);
  // In preview mode we don't fetch anything, so start with loading=false to
  // avoid the early setLoading(false) call inside the effect body (which
  // Next 16's react-hooks/set-state-in-effect would flag).
  const [loading, setLoading] = useState(!previewMode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (previewMode) return;
    let cancelled = false;
    async function load() {
      if (!wallet) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const program = getProgram(wallet, connection);
        const all = (await program.account.memberStatus.all([
          {
            memcmp: {
              offset: 8 + 32,
              bytes: wallet.publicKey.toBase58(),
            },
          },
        ])) as unknown as MemberEntry[];

        // Credit profile
        let cp: CreditProfileAccount | null = null;
        let missing = false;
        try {
          const [cpPda] = creditProfilePda(wallet.publicKey);
          cp = (await program.account.creditProfile.fetch(
            cpPda
          )) as unknown as CreditProfileAccount;
        } catch {
          missing = true;
        }

        if (!cancelled) {
          setEntries(all);
          setCredit(cp);
          setCreditMissing(missing);
        }
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
  }, [wallet, connection, previewMode]);

  async function handleInitProfile() {
    if (!wallet) return;
    setBusy(true);
    try {
      const program = getProgram(wallet, connection);
      const builder = program.methods
        .initCreditProfile()
        .accounts({
          wallet: wallet.publicKey,
        } as never);
      await buildAndSubmitGasless({
        connection,
        wallet,
        methodBuilder: builder,
      });
      // re-trigger load
      setCreditMissing(false);
      const [cpPda] = creditProfilePda(wallet.publicKey);
      const cp = (await program.account.creditProfile.fetch(
        cpPda
      )) as unknown as CreditProfileAccount;
      setCredit(cp);
    } catch (e) {
      alert(`Error: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  // PREVIEW MODE
  if (previewMode) {
    const totalVolume = new BN(2_400_000_000); // 2400 USDC

    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
          <p className="text-sm text-[var(--muted)] font-mono mt-1">
            {shortAddr(PREVIEW_WALLET)}
          </p>
        </div>

        <CreditSbtBadge tier="Tier3Prime" sbtMint={PREVIEW_SBT_MINT} />

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-5">
              <div className="text-xs text-[var(--muted)]">Circles completed</div>
              <div className="text-2xl font-bold">4</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="text-xs text-[var(--muted)]">On-time</div>
              <div className="text-2xl font-bold">18</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="text-xs text-[var(--muted)]">Late</div>
              <div className="text-2xl font-bold">1</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="text-xs text-[var(--muted)]">Defaults</div>
              <div className="text-2xl font-bold">0</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="text-xs text-[var(--muted)]">Total volume</div>
              <div className="text-2xl font-bold">
                {formatUsdc(totalVolume)} USDC
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="text-xs text-[var(--muted)]">
                Early-position eligible
              </div>
              <div className="text-2xl font-bold">Yes</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Position NFTs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {PREVIEW_NFTS.map((n) => (
                <PositionNftBadge
                  key={n.mint}
                  position={n.position}
                  mint={n.mint}
                  circleName={n.circleName}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totals = entries.reduce(
    (acc, e) => {
      acc.deposited = acc.deposited.add(e.account.totalDeposited);
      acc.received = acc.received.add(e.account.receivedAmount);
      acc.depositCount += e.account.depositCount;
      acc.missedCount += e.account.missedCount;
      return acc;
    },
    {
      deposited: new BN(0),
      received: new BN(0),
      depositCount: 0,
      missedCount: 0,
    }
  );

  const tier = anchorTierToTrustTier(credit?.trustTier);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        {wallet && (
          <p className="text-sm text-[var(--muted)] font-mono mt-1">
            {shortAddr(wallet.publicKey)}
          </p>
        )}
      </div>

      {!wallet && (
        <Card>
          <CardContent className="p-8 text-center text-[var(--muted)]">
            Connect your wallet to see your stats.
          </CardContent>
        </Card>
      )}

      {wallet && loading && (
        <p className="text-[var(--muted)]">Loading…</p>
      )}

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {wallet && !loading && (
        <>
          {creditMissing ? (
            <Card>
              <CardHeader>
                <CardTitle>Credit profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-[var(--muted)]">
                  You don&apos;t have an on-chain credit profile yet. Initialize
                  one to mint your Credit SBT and start building reputation.
                </p>
                <div className="flex items-center gap-3">
                  <Button onClick={handleInitProfile} disabled={busy}>
                    {busy ? "Initializing…" : "Initialize credit profile"}
                  </Button>
                  <GaslessIndicator />
                </div>
              </CardContent>
            </Card>
          ) : credit ? (
            <CreditSbtBadge tier={tier} sbtMint={credit.sbtMint} />
          ) : null}

          {credit && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-5">
                  <div className="text-xs text-[var(--muted)]">
                    Circles completed
                  </div>
                  <div className="text-2xl font-bold">
                    {credit.circlesCompleted}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <div className="text-xs text-[var(--muted)]">On-time</div>
                  <div className="text-2xl font-bold">
                    {credit.onTimePayments}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <div className="text-xs text-[var(--muted)]">Late</div>
                  <div className="text-2xl font-bold">
                    {credit.latePayments}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <div className="text-xs text-[var(--muted)]">Defaults</div>
                  <div className="text-2xl font-bold">{credit.defaults}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <div className="text-xs text-[var(--muted)]">
                    Total volume
                  </div>
                  <div className="text-2xl font-bold">
                    {formatUsdc(credit.totalVolume)} USDC
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <div className="text-xs text-[var(--muted)]">
                    Early-position eligible
                  </div>
                  <div className="text-2xl font-bold">
                    {credit.earlyPositionEligible ? "Yes" : "No"}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-5">
                <div className="text-xs text-[var(--muted)]">
                  Total Deposited
                </div>
                <div className="text-2xl font-bold">
                  {formatUsdc(totals.deposited)} USDC
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="text-xs text-[var(--muted)]">Deposits Made</div>
                <div className="text-2xl font-bold">{totals.depositCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="text-xs text-[var(--muted)]">Missed</div>
                <div className="text-2xl font-bold">{totals.missedCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="text-xs text-[var(--muted)]">
                  Total Received
                </div>
                <div className="text-2xl font-bold">
                  {formatUsdc(totals.received)} USDC
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Position NFTs</CardTitle>
            </CardHeader>
            <CardContent>
              {entries.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">
                  No positions yet. Join a circle to mint your first NFT.
                </p>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {entries.map((e) => (
                    <PositionNftBadge
                      key={e.publicKey.toBase58()}
                      position={e.account.payoutOrder}
                      mint={e.account.positionNftMint}
                      circleName={shortAddr(e.account.circle)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Per-Circle Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {entries.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">
                  No activity yet. Join or create a circle to get started.
                </p>
              ) : (
                <ul className="divide-y divide-[var(--border)]">
                  {entries.map((e) => (
                    <li
                      key={e.publicKey.toBase58()}
                      className="py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm"
                    >
                      <div>
                        <div className="text-xs text-[var(--muted)]">
                          Circle
                        </div>
                        <div className="font-mono">
                          {shortAddr(e.account.circle)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-[var(--muted)]">
                          Deposited
                        </div>
                        <div className="font-semibold">
                          {formatUsdc(e.account.totalDeposited)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-[var(--muted)]">
                          Deposits / Missed
                        </div>
                        <div className="font-semibold">
                          {e.account.depositCount} / {e.account.missedCount}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-[var(--muted)]">
                          Received
                        </div>
                        <div className="font-semibold">
                          {formatUsdc(e.account.receivedAmount)}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
