"use client";

import { Suspense, use, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Keypair, PublicKey } from "@solana/web3.js";
import { useConnection, useAnchorWallet } from "@solana/wallet-adapter-react";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
  getProgram,
  getReadOnlyProgram,
  memberPda,
  roundPda,
  collateralVaultPda,
  creditProfilePda,
  userVaultPda,
  userVaultAtaPda,
} from "@/lib/anchor-client";
import {
  formatUsdc,
  shortAddr,
  explorerTx,
} from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrustGateModal } from "@/components/trust-gate-modal";
import { GaslessIndicator } from "@/components/gasless-indicator";
import { buildAndSubmitGasless } from "@/lib/relayer-client";
import type { CircleAccount } from "@/lib/types";
import BN from "bn.js";

type PageProps = { params: Promise<{ id: string }> };

export default function JoinCirclePage(props: PageProps) {
  return (
    <Suspense fallback={<div className="max-w-3xl mx-auto px-4 py-10"><p className="text-[var(--muted)]">Loading…</p></div>}>
      <JoinCirclePageInner {...props} />
    </Suspense>
  );
}

function JoinCirclePageInner({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const previewMode = searchParams?.get("preview") === "1";

  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  const circlePk = (() => {
    try {
      return new PublicKey(id);
    } catch {
      return null;
    }
  })();

  const [circle, setCircle] = useState<CircleAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [position, setPosition] = useState(1);
  const [gateOpen, setGateOpen] = useState(false);
  const [eligible, setEligible] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!circlePk) return;
    if (previewMode) {
      // Provide a mock circle so the page renders without RPC
      const mock: Partial<CircleAccount> = {
        name: "Seoul Builders",
        memberCount: 5,
        members: [],
        contributionAmount: new BN(100_000_000), // 100 USDC
        totalRounds: 5,
        currentRound: 1,
        trustGateEnabled: true,
        riskDepositEnabled: true,
      };
      setCircle(mock as CircleAccount);
      setPosition(1);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const program = wallet
        ? getProgram(wallet, connection)
        : getReadOnlyProgram(connection);
      const c = (await program.account.circle.fetch(
        circlePk
      )) as unknown as CircleAccount;
      setCircle(c);
      setPosition(Math.max(1, c.members.length + 1));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [circlePk, wallet, connection, previewMode]);

  useEffect(() => {
    load();
  }, [load]);

  // Auto-open Trust Gate modal in preview mode
  useEffect(() => {
    if (previewMode && circle) {
      setPosition(1);
      setGateOpen(true);
    }
  }, [previewMode, circle]);

  if (!circlePk) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <p className="text-[var(--error)]">Invalid circle id.</p>
      </div>
    );
  }

  async function ensureCreditProfile() {
    if (!wallet) return;
    const program = getProgram(wallet, connection);
    const [credit] = creditProfilePda(wallet.publicKey);
    const info = await connection.getAccountInfo(credit);
    if (info) return;
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
  }

  async function performJoin() {
    if (!wallet || !circle || !circlePk) return;
    setBusy(true);
    try {
      const [uv] = userVaultPda(wallet.publicKey);
      const uvInfo = await connection.getAccountInfo(uv);
      if (!uvInfo) {
        alert(
          "Your Roosta vault isn't initialized. Open the wallet menu and initialize first."
        );
        setBusy(false);
        return;
      }

      await ensureCreditProfile();

      const program = getProgram(wallet, connection);
      const [memberStatus] = memberPda(circlePk, wallet.publicKey);
      const [roundPk] = roundPda(circlePk, circle.currentRound);

      const joinBuilder = program.methods
        .joinCircle()
        .accounts({
          member: wallet.publicKey,
          circle: circlePk,
          round: roundPk,
          memberStatus,
        } as never);
      const joinOut = await buildAndSubmitGasless({
        connection,
        wallet,
        methodBuilder: joinBuilder,
      });
      const joinSig = joinOut.signature;

      let nftSig: string | null = null;
      try {
        const positionMint = Keypair.generate();
        const nftBuilder = program.methods
          .mintPositionNft()
          .accounts({
            member: wallet.publicKey,
            circle: circlePk,
            memberStatus,
            positionMint: positionMint.publicKey,
          } as never)
          .signers([positionMint]);
        const nftOut = await buildAndSubmitGasless({
          connection,
          wallet,
          methodBuilder: nftBuilder,
          extraSigners: [positionMint],
        });
        nftSig = nftOut.signature;
      } catch (e) {
        console.warn("mint_position_nft failed; you can retry from circle page", e);
      }

      const myPosition = position - 1;
      if (
        circle.riskDepositEnabled &&
        myPosition < 2 &&
        confirm(
          "You're in an early position. Deposit risk collateral now? (recommended)"
        )
      ) {
        try {
          const [memberVault] = userVaultPda(wallet.publicKey);
          const [memberVaultTokenAccount] = userVaultAtaPda(wallet.publicKey);
          const [collateralVault] = collateralVaultPda(circlePk);
          const riskBuilder = program.methods
            .depositRiskCollateral()
            .accounts({
              member: wallet.publicKey,
              circle: circlePk,
              memberStatus,
              memberVault,
              memberVaultTokenAccount,
              collateralVault,
              tokenProgram: TOKEN_PROGRAM_ID,
            } as never);
          await buildAndSubmitGasless({
            connection,
            wallet,
            methodBuilder: riskBuilder,
          });
        } catch (e) {
          alert(
            `Risk collateral deposit failed: ${(e as Error).message}\nYou can retry from the circle page.`
          );
        }
      }

      const lines = [`Joined!`, explorerTx(joinSig)];
      if (nftSig) lines.push(`NFT: ${explorerTx(nftSig)}`);
      alert(lines.join("\n"));
      router.push(`/circles/${circlePk.toBase58()}`);
    } catch (e) {
      alert(`Error: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <p className="text-[var(--muted)]">Loading…</p>
      </div>
    );
  }

  if (error || !circle) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <p className="text-[var(--error)]">{error || "Circle not found."}</p>
      </div>
    );
  }

  const positions = Array.from(
    { length: circle.memberCount },
    (_, i) => i + 1
  );
  const filled = circle.members.length;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <div>
        <h1
          className="text-3xl font-bold tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Join {circle.name}
        </h1>
        <p className="text-sm text-[var(--muted)] mt-1">
          {shortAddr(circlePk.toBase58())} · {filled} / {circle.memberCount}{" "}
          members · {formatUsdc(circle.contributionAmount)} USDC per round
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pick your position</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[var(--muted)] mb-3">
            Earlier positions get paid out sooner — but require a Trust Gate
            check and (when enabled) risk collateral.
          </p>
          <div className="flex flex-wrap gap-2">
            {positions.map((p) => {
              const taken = p <= filled;
              const active = p === position;
              return (
                <button
                  key={p}
                  onClick={() => {
                    if (taken) return;
                    setPosition(p);
                    setEligible(false);
                  }}
                  disabled={taken}
                  className={`h-10 min-w-10 px-3 rounded-[var(--radius-md)] border text-sm font-semibold transition-colors ${
                    active
                      ? "border-[var(--primary)] text-[var(--primary)] bg-[var(--card-hover)]"
                      : "border-[var(--border)]"
                  } ${taken ? "opacity-40 cursor-not-allowed" : "hover:border-[var(--primary)]"}`}
                >
                  #{p}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Trust Gate</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-[var(--muted)]">
            {circle.trustGateEnabled
              ? "This circle has Trust Gate enabled. Confirm your eligibility for the selected position."
              : "Trust Gate is disabled for this circle — anyone can join any open position."}
          </p>
          {circle.trustGateEnabled ? (
            <Button onClick={() => setGateOpen(true)} disabled={!previewMode && !wallet}>
              Run Trust Gate check
            </Button>
          ) : (
            <Button onClick={() => setEligible(true)} disabled={!previewMode && !wallet}>
              Confirm eligibility
            </Button>
          )}
          {eligible && (
            <div className="rounded-[var(--radius-md)] border border-[var(--border)] p-3 text-sm bg-success/10">
              ✓ Eligible for position #{position}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={performJoin} disabled={!eligible || busy || (!previewMode && !wallet)}>
          {busy ? "Joining…" : "Confirm join"}
        </Button>
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <GaslessIndicator />
      </div>

      <TrustGateModal
        isOpen={gateOpen}
        onClose={() => setGateOpen(false)}
        circle={{
          contributionAmount: circle.contributionAmount.toString(),
          totalRounds: circle.totalRounds,
          name: circle.name,
        }}
        desiredPosition={position}
        forcePreview={previewMode}
        onConfirmEligible={(_r) => {
          setEligible(true);
          setGateOpen(false);
        }}
      />
    </div>
  );
}
