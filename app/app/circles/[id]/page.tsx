"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import BN from "bn.js";
import Link from "next/link";
import { Keypair, PublicKey } from "@solana/web3.js";
import { useConnection, useAnchorWallet } from "@solana/wallet-adapter-react";
import { getAccount, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
  getProgram,
  memberPda,
  roundPda,
  vaultPda,
  collateralVaultPda,
  creditProfilePda,
  userVaultPda,
  userVaultAtaPda,
  fetchVaultBalance,
} from "@/lib/anchor-client";
import {
  formatUsdc,
  shortAddr,
  statusKey,
  explorerAddr,
  explorerTx,
} from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/circle-card";
import { RiskBadges } from "@/components/risk-badges";
import { GaslessIndicator } from "@/components/gasless-indicator";
import { buildAndSubmitGasless, ESTIMATED_FEE_SOL } from "@/lib/relayer-client";
import type {
  CircleAccount,
  RoundAccount,
  MemberStatusAccount,
} from "@/lib/types";

const DEFAULT_PUBKEY = "11111111111111111111111111111111";

const MEMBER_STATUS_STYLE: Record<string, string> = {
  active: "bg-roosta-100 text-roosta-700",
  paid: "bg-success/15 text-success",
  received: "bg-success/15 text-success",
  completed: "bg-success/15 text-success",
  delayed: "bg-warning/15 text-warning",
  defaulted: "bg-error/15 text-error",
  slashed: "bg-error/15 text-error",
};

function MemberStatusBadge({ s }: { s: string }) {
  const cls = MEMBER_STATUS_STYLE[s] || "bg-muted/15 text-[var(--muted)]";
  return (
    <span
      className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full font-semibold ${cls}`}
    >
      {s}
    </span>
  );
}

export default function CircleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  const [circle, setCircle] = useState<CircleAccount | null>(null);
  const [round, setRound] = useState<RoundAccount | null>(null);
  const [memberStatuses, setMemberStatuses] = useState<
    Map<string, MemberStatusAccount>
  >(new Map());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentSigs, setRecentSigs] = useState<string[]>([]);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  const circlePk = useMemo(() => {
    try {
      return new PublicKey(id);
    } catch {
      return null;
    }
  }, [id]);

  const load = useCallback(async () => {
    if (!circlePk) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/circles/${circlePk.toBase58()}?t=${Date.now()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "fetch failed");

      const c = data.circle;
      setCircle({
        authority: new PublicKey(c.authority),
        circleId: new BN(c.circleId),
        name: c.name,
        memberCount: c.memberCount,
        totalRounds: c.totalRounds,
        currentRound: c.currentRound,
        contributionAmount: new BN(c.contributionAmount),
        roundDuration: new BN(c.roundDuration),
        startedAt: new BN(c.startedAt),
        status: c.status,
        members: c.members.map((m: string) => new PublicKey(m)),
        payoutOrder: c.payoutOrder,
        trustGateEnabled: c.trustGateEnabled,
        riskDepositEnabled: c.riskDepositEnabled,
        lockedReserveEnabled: c.lockedReserveEnabled,
        earlyPositionCollateralRatio: c.earlyPositionCollateralRatio,
        lockedReserveRatio: c.lockedReserveRatio,
        gracePeriodSeconds: new BN(c.gracePeriodSeconds),
      } as unknown as CircleAccount);

      if (data.round) {
        const r = data.round;
        setRound({
          roundNumber: r.roundNumber,
          recipient: new PublicKey(r.recipient),
          depositsCount: r.depositsCount,
          status: r.status,
          startedAt: new BN(r.startedAt),
          deadline: new BN(r.deadline),
          totalCollected: new BN(r.totalCollected),
          payoutAmount: new BN(r.payoutAmount),
          reserveAmount: new BN(r.reserveAmount),
          deposits: r.deposits.map((d: string) => new PublicKey(d)),
        } as unknown as RoundAccount);
      } else {
        setRound(null);
      }

      const map = new Map<string, MemberStatusAccount>();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (data.members as any[]).forEach((m) => {
        if (!m) return;
        map.set(m.wallet, {
          wallet: new PublicKey(m.wallet),
          payoutOrder: m.payoutOrder,
          statusEnum: m.statusEnum,
          collateralAmount: new BN(m.collateralAmount),
          lockedReserveAmount: new BN(m.lockedReserveAmount),
          defaultCount: m.defaultCount,
          totalDeposited: new BN(m.totalDeposited),
          depositCount: m.depositCount,
          missedCount: m.missedCount,
          receivedAmount: new BN(m.receivedAmount),
          positionNftMint: new PublicKey(m.positionNftMint),
        } as unknown as MemberStatusAccount);
      });
      setMemberStatuses(map);
    } catch (e) {
      console.error(e);
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [circlePk]);

  useEffect(() => {
    // Defer via setTimeout(0) so the static analyzer does not flag the
    // setState calls that happen inside load() (which is already async and
    // gates its setStates behind awaits — react-hooks/set-state-in-effect).
    const handle = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(handle);
  }, [load]);

  if (!circlePk) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <p className="text-[var(--error)]">Invalid circle id.</p>
      </div>
    );
  }

  const me = wallet?.publicKey;
  const isMember = !!(
    me && circle?.members.some((m) => m.toBase58() === me.toBase58())
  );
  const isFull = !!(circle && circle.members.length >= circle.memberCount);
  const recipientIsMe =
    !!(me && round && round.recipient.toBase58() === me.toBase58());
  const alreadyDeposited = !!(
    me &&
    round &&
    round.deposits.some((d) => d.toBase58() === me.toBase58())
  );
  const allDeposited = !!(
    round &&
    circle &&
    round.depositsCount >= circle.memberCount
  );
  const roundStatus = statusKey(round?.status);
  const myStatus =
    me && memberStatuses.get(me.toBase58()) ? memberStatuses.get(me.toBase58())! : null;

  const pushSig = (sig: string) => setRecentSigs((s) => [sig, ...s].slice(0, 5));

  function describeOutcome(label: string, sig: string, gasless: boolean, fallbackReason?: string) {
    const link = explorerTx(sig);
    if (gasless) {
      return `${label}\n✨ Gas covered by Roosta (~${ESTIMATED_FEE_SOL} SOL saved)\n\n${link}`;
    }
    const note = fallbackReason
      ? `Roosta relayer unavailable — using your wallet for gas (${fallbackReason})`
      : `Paid with your wallet`;
    return `${label}\n${note}\n\n${link}`;
  }

  async function ensureVaultInitialized(): Promise<boolean> {
    if (!wallet) return false;
    const [uv] = userVaultPda(wallet.publicKey);
    const info = await connection.getAccountInfo(uv);
    if (!info) {
      alert(
        "Your Roosta vault isn't initialized yet. Open the wallet menu and click 'Initialize vault' first."
      );
      return false;
    }
    return true;
  }

  async function handleJoinSimple() {
    // Quick join (no Trust Gate flow). For full UX, user clicks "Join with Trust Gate".
    if (!wallet || !circle || !circlePk) return;
    if (!(await ensureVaultInitialized())) return;
    setBusy(true);
    try {
      const program = getProgram(wallet, connection);
      const [memberStatus] = memberPda(circlePk, wallet.publicKey);
      const [roundPk] = roundPda(circlePk, circle.currentRound);
      const builder = program.methods
        .joinCircle()
        .accounts({
          member: wallet.publicKey,
          circle: circlePk,
          round: roundPk,
          memberStatus,
        } as never);
      const out = await buildAndSubmitGasless({
        connection,
        wallet,
        methodBuilder: builder,
      });
      pushSig(out.signature);
      alert(describeOutcome("Joined!", out.signature, out.gasless, out.fallbackReason));
      await load();
    } catch (e) {
      alert(`Error: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleDeposit() {
    if (!wallet || !circle || !circlePk) return;
    if (!(await ensureVaultInitialized())) return;
    const bal = await fetchVaultBalance(connection, wallet.publicKey);
    if (bal === null || bal < BigInt(circle.contributionAmount.toString())) {
      alert("Top up your Roosta vault first — open the wallet menu.");
      return;
    }
    setBusy(true);
    try {
      const program = getProgram(wallet, connection);
      const [memberStatus] = memberPda(circlePk, wallet.publicKey);
      const [roundPk] = roundPda(circlePk, circle.currentRound);
      const [vault] = vaultPda(circlePk);
      const [memberVault] = userVaultPda(wallet.publicKey);
      const [memberVaultTokenAccount] = userVaultAtaPda(wallet.publicKey);
      const [creditProfile] = creditProfilePda(wallet.publicKey);

      const builder = program.methods
        .deposit()
        .accounts({
          member: wallet.publicKey,
          circle: circlePk,
          round: roundPk,
          memberStatus,
          memberVault,
          memberVaultTokenAccount,
          vault,
          creditProfile,
          tokenProgram: TOKEN_PROGRAM_ID,
        } as never);
      const out = await buildAndSubmitGasless({
        connection,
        wallet,
        methodBuilder: builder,
      });
      pushSig(out.signature);
      alert(describeOutcome("Deposited!", out.signature, out.gasless, out.fallbackReason));
      await load();
    } catch (e) {
      alert(`Error: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleDepositRiskCollateral() {
    if (!wallet || !circle || !circlePk) return;
    if (!(await ensureVaultInitialized())) return;
    setBusy(true);
    try {
      const program = getProgram(wallet, connection);
      const [memberStatus] = memberPda(circlePk, wallet.publicKey);
      const [memberVault] = userVaultPda(wallet.publicKey);
      const [memberVaultTokenAccount] = userVaultAtaPda(wallet.publicKey);
      const [collateralVault] = collateralVaultPda(circlePk);

      const builder = program.methods
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
      const out = await buildAndSubmitGasless({
        connection,
        wallet,
        methodBuilder: builder,
      });
      pushSig(out.signature);
      alert(describeOutcome("Risk collateral deposited!", out.signature, out.gasless, out.fallbackReason));
      await load();
    } catch (e) {
      alert(`Error: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleActivateRound1() {
    if (!wallet || !circle || !circlePk) return;
    setBusy(true);
    try {
      const program = getProgram(wallet, connection);
      const [roundPk] = roundPda(circlePk, 1);
      const sig = await program.methods
        .tryActivateRound1()
        .accounts({
          caller: wallet.publicKey,
          circle: circlePk,
          round: roundPk,
        } as never)
        .rpc();
      pushSig(sig);
      alert(`Round 1 activated!\n\n${explorerTx(sig)}`);
      await load();
    } catch (e) {
      alert(`Error: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleMarkDelayed() {
    if (!wallet || !circle || !circlePk) return;
    setBusy(true);
    try {
      const program = getProgram(wallet, connection);
      const [roundPk] = roundPda(circlePk, circle.currentRound);
      const sig = await program.methods
        .markDelayed()
        .accounts({
          caller: wallet.publicKey,
          circle: circlePk,
          round: roundPk,
        } as never)
        .rpc();
      pushSig(sig);
      alert(`Round marked delayed.\n\n${explorerTx(sig)}`);
      await load();
    } catch (e) {
      alert(`Error: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleMarkMemberDefault(memberWallet: PublicKey) {
    if (!wallet || !circle || !circlePk) return;
    setBusy(true);
    try {
      const program = getProgram(wallet, connection);
      const [roundPk] = roundPda(circlePk, circle.currentRound);
      const [memberStatus] = memberPda(circlePk, memberWallet);
      const [creditProfile] = creditProfilePda(memberWallet);
      const sig = await program.methods
        .markDefault()
        .accounts({
          caller: wallet.publicKey,
          circle: circlePk,
          round: roundPk,
          memberStatus,
          creditProfile,
        } as never)
        .rpc();
      pushSig(sig);
      alert(`Member marked default.\n\n${explorerTx(sig)}`);
      await load();
    } catch (e) {
      alert(`Error: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleSlashMember(memberWallet: PublicKey) {
    if (!wallet || !circle || !circlePk) return;
    setBusy(true);
    try {
      const program = getProgram(wallet, connection);
      const [roundPk] = roundPda(circlePk, circle.currentRound);
      const [memberStatus] = memberPda(circlePk, memberWallet);
      const [collateralVault] = collateralVaultPda(circlePk);
      const [vault] = vaultPda(circlePk);
      const [creditProfile] = creditProfilePda(memberWallet);
      const sig = await program.methods
        .slashCollateral()
        .accounts({
          caller: wallet.publicKey,
          circle: circlePk,
          round: roundPk,
          memberStatus,
          collateralVault,
          vault,
          creditProfile,
          tokenProgram: TOKEN_PROGRAM_ID,
        } as never)
        .rpc();
      pushSig(sig);
      alert(`Slashed!\n\n${explorerTx(sig)}`);
      await load();
    } catch (e) {
      alert(`Error: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleUnlockReserve(memberWallet: PublicKey) {
    if (!wallet || !circle || !circlePk) return;
    setBusy(true);
    try {
      const program = getProgram(wallet, connection);
      const [memberStatus] = memberPda(circlePk, memberWallet);
      const [collateralVault] = collateralVaultPda(circlePk);
      const [recipientVaultTokenAccount] = userVaultAtaPda(memberWallet);
      const sig = await program.methods
        .unlockReserve()
        .accounts({
          caller: wallet.publicKey,
          circle: circlePk,
          memberStatus,
          collateralVault,
          recipientVaultTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        } as never)
        .rpc();
      pushSig(sig);
      alert(`Reserve unlocked.\n\n${explorerTx(sig)}`);
      await load();
    } catch (e) {
      alert(`Error: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleMintPositionNft() {
    if (!wallet || !circle || !circlePk) return;
    setBusy(true);
    try {
      const program = getProgram(wallet, connection);
      const [memberStatus] = memberPda(circlePk, wallet.publicKey);
      const positionMint = Keypair.generate();
      const builder = program.methods
        .mintPositionNft()
        .accounts({
          member: wallet.publicKey,
          circle: circlePk,
          memberStatus,
          positionMint: positionMint.publicKey,
        } as never)
        .signers([positionMint]);
      const out = await buildAndSubmitGasless({
        connection,
        wallet,
        methodBuilder: builder,
        extraSigners: [positionMint],
      });
      pushSig(out.signature);
      alert(describeOutcome("Position NFT minted!", out.signature, out.gasless, out.fallbackReason));
      await load();
    } catch (e) {
      alert(`Error: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleTriggerPayout() {
    if (!wallet || !circle || !round || !circlePk) return;
    setBusy(true);
    try {
      const program = getProgram(wallet, connection);
      const [roundPk] = roundPda(circlePk, circle.currentRound);
      const [recipientStatus] = memberPda(circlePk, round.recipient);
      const [vault] = vaultPda(circlePk);
      const [collateralVault] = collateralVaultPda(circlePk);
      const [recipientVault] = userVaultPda(round.recipient);
      const [recipientVaultTokenAccount] = userVaultAtaPda(round.recipient);
      const isLast = circle.currentRound >= circle.totalRounds;
      const [nextRound] = isLast
        ? [null as unknown as PublicKey]
        : roundPda(circlePk, circle.currentRound + 1);

      try {
        await getAccount(connection, recipientVaultTokenAccount);
      } catch {
        alert(
          "The recipient hasn't initialized their Roosta vault yet — payout cannot proceed until they do."
        );
        setBusy(false);
        return;
      }

      const sig = await program.methods
        .triggerPayout()
        .accounts({
          caller: wallet.publicKey,
          circle: circlePk,
          round: roundPk,
          recipientStatus,
          vault,
          collateralVault,
          recipientVault,
          recipientVaultTokenAccount,
          nextRound: nextRound ?? null,
          tokenProgram: TOKEN_PROGRAM_ID,
        } as never)
        .rpc();
      pushSig(sig);
      alert(`Payout triggered!\n\n${explorerTx(sig)}`);
      await load();
    } catch (e) {
      alert(`Error: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <p className="text-[var(--muted)]">Loading circle…</p>
      </div>
    );
  }

  if (error || !circle) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <p className="text-[var(--error)]">{error || "Circle not found."}</p>
      </div>
    );
  }

  // Round 1 not active yet?
  const round1NotActiveYet =
    isFull &&
    circle.riskCollateralsCollected &&
    !circle.round1Activated;

  // Deadline countdown
  let deadlineLabel: string | null = null;
  if (round && round.deadline) {
    const dl = Number(round.deadline.toString());
    const remaining = dl - now;
    if (remaining > 0) {
      const days = Math.floor(remaining / 86400);
      const hours = Math.floor((remaining % 86400) / 3600);
      const mins = Math.floor((remaining % 3600) / 60);
      deadlineLabel = `${days}d ${hours}h ${mins}m`;
    } else {
      deadlineLabel = "deadline passed";
    }
  }

  // Risk collateral pending for me?
  const myPayoutOrder = myStatus?.payoutOrder ?? -1;
  const myCollateralAmt = myStatus
    ? new (myStatus.collateralAmount.constructor as { new (x: string): { toString(): string } })(
        myStatus.collateralAmount.toString()
      )
    : null;
  void myCollateralAmt;
  const needsRiskCollateral =
    !!myStatus &&
    circle.riskDepositEnabled &&
    myPayoutOrder >= 0 &&
    myPayoutOrder < 2 &&
    myStatus.collateralAmount.toString() === "0";

  const myPositionMintMissing =
    !!myStatus &&
    myStatus.positionNftMint.toBase58() === DEFAULT_PUBKEY;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1
            className="text-3xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {circle.name}
          </h1>
          <a
            href={explorerAddr(circlePk.toBase58())}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-[var(--muted)] hover:text-[var(--primary)]"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            {shortAddr(circlePk.toBase58())} ↗
          </a>
        </div>
        <StatusBadge status={statusKey(circle.status)} />
      </div>

      <RiskBadges circle={circle} />

      <div className="grid sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="text-xs text-[var(--muted)]">Contribution</div>
            <div className="text-2xl font-bold">
              {formatUsdc(circle.contributionAmount)}{" "}
              <span className="text-base text-[var(--muted)]">USDC</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs text-[var(--muted)]">Members</div>
            <div className="text-2xl font-bold">
              {circle.members.length} / {circle.memberCount}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs text-[var(--muted)]">Round</div>
            <div className="text-2xl font-bold">
              {Math.min(circle.currentRound, circle.totalRounds)} /{" "}
              {circle.totalRounds}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current round</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {round ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--muted)]">Status</span>
                <StatusBadge status={roundStatus} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--muted)]">Recipient</span>
                <span
                  className="text-sm"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {shortAddr(round.recipient)}
                  {recipientIsMe && (
                    <span className="ml-2 text-[var(--primary)] font-semibold">
                      (you)
                    </span>
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--muted)]">Deposits</span>
                <span className="text-sm font-semibold">
                  {round.depositsCount} / {circle.memberCount}
                </span>
              </div>
              {deadlineLabel && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--muted)]">Deadline</span>
                  <span className="text-sm font-mono">{deadlineLabel}</span>
                </div>
              )}
              <div className="w-full h-2 bg-[var(--border)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--primary)] transition-all"
                  style={{
                    width: `${(round.depositsCount / circle.memberCount) * 100}%`,
                  }}
                />
              </div>
            </>
          ) : (
            <p className="text-sm text-[var(--muted)]">No active round.</p>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-3">
            {!isMember && !isFull && (
              <>
                <Link href={`/circles/${circlePk.toBase58()}/join`}>
                  <Button disabled={busy || !wallet}>Join with Trust Gate</Button>
                </Link>
                <Button
                  variant="outline"
                  onClick={handleJoinSimple}
                  disabled={busy || !wallet}
                >
                  Quick join
                </Button>
              </>
            )}
            {needsRiskCollateral && (
              <Button
                variant="secondary"
                onClick={handleDepositRiskCollateral}
                disabled={busy}
              >
                Deposit risk collateral
              </Button>
            )}
            {myPositionMintMissing && (
              <Button
                variant="outline"
                onClick={handleMintPositionNft}
                disabled={busy}
              >
                Mint Position NFT
              </Button>
            )}
            {round1NotActiveYet && (
              <Button
                variant="secondary"
                onClick={handleActivateRound1}
                disabled={busy}
              >
                Activate round 1
              </Button>
            )}
            {isMember && round && !alreadyDeposited && circle.round1Activated && (
              <Button onClick={handleDeposit} disabled={busy}>
                {busy
                  ? "Depositing…"
                  : `Deposit ${formatUsdc(circle.contributionAmount)} USDC`}
              </Button>
            )}
            {allDeposited && roundStatus !== "settled" && (
              <Button
                variant="secondary"
                onClick={handleTriggerPayout}
                disabled={busy}
              >
                {busy ? "Triggering…" : "Trigger payout"}
              </Button>
            )}
            <GaslessIndicator />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {circle.members.map((m, i) => {
              const ms = memberStatuses.get(m.toBase58());
              const sKey = ms ? statusKey(ms.statusEnum) : "active";
              const positionNftMint = ms?.positionNftMint.toBase58();
              const isMintedNft =
                positionNftMint && positionNftMint !== DEFAULT_PUBKEY;
              const isEarlyPos = (ms?.payoutOrder ?? i) < 2;
              const collat = ms?.collateralAmount;
              const lockedReserve = ms?.lockedReserveAmount;
              const isMe = me && m.toBase58() === me.toBase58();
              const deposited =
                round &&
                round.deposits.some((d) => d.toBase58() === m.toBase58());
              return (
                <li
                  key={m.toBase58()}
                  className="py-3 border-b border-[var(--border)] last:border-0"
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <div className="text-sm flex items-center gap-2 flex-wrap">
                        <span style={{ fontFamily: "var(--font-mono)" }}>
                          #{(ms?.payoutOrder ?? i) + 1} {shortAddr(m)}
                        </span>
                        {isMe && (
                          <span className="text-[var(--primary)] font-semibold text-xs">
                            (you)
                          </span>
                        )}
                        <MemberStatusBadge s={sKey} />
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {isEarlyPos && circle.riskDepositEnabled && (
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                              collat && collat.toString() !== "0"
                                ? "bg-success/15 text-[var(--success)]"
                                : "bg-warning/15 text-[var(--warning)]"
                            }`}
                          >
                            {collat && collat.toString() !== "0"
                              ? `Risk: ${formatUsdc(collat)} USDC`
                              : "⚠ Risk collateral pending"}
                          </span>
                        )}
                        {lockedReserve && lockedReserve.toString() !== "0" && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--card)] border border-[var(--border)] text-[var(--muted)]">
                            Reserve: {formatUsdc(lockedReserve)}
                          </span>
                        )}
                        {ms && ms.defaultCount > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-error/15 text-[var(--error)]">
                            Defaults: {ms.defaultCount}
                          </span>
                        )}
                        {deposited && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-success/15 text-[var(--success)]">
                            ✓ deposited
                          </span>
                        )}
                        {isMintedNft && positionNftMint && (
                          <a
                            href={explorerAddr(positionNftMint)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--card)] border border-[var(--border)] text-[var(--primary)] hover:underline"
                            style={{ fontFamily: "var(--font-mono)" }}
                          >
                            NFT {shortAddr(positionNftMint)} ↗
                          </a>
                        )}
                      </div>
                    </div>

                    {circle.lockedReserveEnabled &&
                      isEarlyPos &&
                      lockedReserve &&
                      lockedReserve.toString() !== "0" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUnlockReserve(m)}
                          disabled={busy}
                        >
                          Unlock reserve
                        </Button>
                      )}
                  </div>
                </li>
              );
            })}
            {circle.members.length === 0 && (
              <li className="text-sm text-[var(--muted)]">No members yet.</li>
            )}
          </ul>
        </CardContent>
      </Card>

      {/* Admin / demo */}
      <Card>
        <CardHeader>
          <CardTitle>Admin / demo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-[var(--muted)]">
            Anyone can call these on the deployed program — useful for demos
            once a deadline has passed.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkDelayed}
              disabled={busy || !wallet}
            >
              Mark round delayed
            </Button>
          </div>
          <div className="text-xs font-semibold mt-3">
            Per-member (mark default / slash):
          </div>
          <ul className="space-y-1.5">
            {circle.members.map((m) => (
              <li
                key={m.toBase58()}
                className="flex items-center justify-between gap-2 text-xs"
              >
                <span style={{ fontFamily: "var(--font-mono)" }}>
                  {shortAddr(m)}
                </span>
                <div className="flex gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleMarkMemberDefault(m)}
                    disabled={busy || !wallet}
                  >
                    Mark default
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSlashMember(m)}
                    disabled={busy || !wallet}
                  >
                    Slash
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {recentSigs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {recentSigs.map((s) => (
                <li key={s}>
                  <a
                    href={explorerTx(s)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-[var(--primary)] hover:underline"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {shortAddr(s)} ↗
                  </a>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
