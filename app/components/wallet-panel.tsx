"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  useAnchorWallet,
  useConnection,
  useWallet,
} from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import {
  getAccount,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import {
  getProgram,
  USDC_MINT,
  userVaultAtaPda,
  userVaultPda,
} from "@/lib/anchor-client";
import { formatUsdc, parseUsdc, shortAddr, explorerAddr } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CircleAccount } from "@/lib/types";
import { buildAndSubmitGasless } from "@/lib/relayer-client";

interface MyCircle {
  publicKey: PublicKey;
  account: CircleAccount;
}

const PREVIEW_PUBKEY_STR = "Demo111111111111111111111111111111111111111";
const PREVIEW_USDC_WALLET = BigInt(850_500_000); // 850.50
const PREVIEW_USDC_VAULT = BigInt(320_000_000); // 320.00

type PreviewCircle = {
  id: string;
  name: string;
  currentRound: number;
  totalRounds: number;
};

const PREVIEW_CIRCLES: PreviewCircle[] = [
  {
    id: "Seou1Bui1ders111111111111111111111111111111",
    name: "Seoul Builders",
    currentRound: 1,
    totalRounds: 5,
  },
  {
    id: "NYCSat111Coffee11111111111111111111111111111",
    name: "NYC Saturday Coffee",
    currentRound: 2,
    totalRounds: 4,
  },
];

export function WalletPanelTrigger() {
  return (
    <Suspense fallback={<WalletPanelFallback />}>
      <WalletPanelTriggerInner />
    </Suspense>
  );
}

function WalletPanelFallback() {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-2 h-10 px-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] text-sm font-semibold opacity-60"
      disabled
    >
      …
    </button>
  );
}

function WalletPanelTriggerInner() {
  const searchParams = useSearchParams();
  const previewMode = searchParams?.get("preview") === "1";

  const { connected, publicKey, disconnect } = useWallet();
  const wallet = useAnchorWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();

  const [open, setOpen] = useState(false);
  const [walletBalance, setWalletBalance] = useState<bigint | null>(null);
  const [vaultBalance, setVaultBalance] = useState<bigint | null>(null);
  const [vaultInitialized, setVaultInitialized] = useState<boolean>(false);
  const [myCircles, setMyCircles] = useState<MyCircle[]>([]);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"none" | "topup" | "withdraw">("none");
  const [amount, setAmount] = useState("");
  const [copied, setCopied] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const loadBalances = useCallback(async () => {
    if (!publicKey) {
      setWalletBalance(null);
      setVaultBalance(null);
      setVaultInitialized(false);
      return;
    }
    // Main wallet ATA
    try {
      const ata = getAssociatedTokenAddressSync(USDC_MINT, publicKey);
      const acc = await getAccount(connection, ata);
      setWalletBalance(acc.amount);
    } catch {
      setWalletBalance(BigInt(0));
    }
    // Vault ATA
    try {
      const [vaultAta] = userVaultAtaPda(publicKey);
      const acc = await getAccount(connection, vaultAta);
      setVaultBalance(acc.amount);
      setVaultInitialized(true);
    } catch {
      setVaultBalance(null);
      setVaultInitialized(false);
    }
  }, [connection, publicKey]);

  const loadMyCircles = useCallback(async () => {
    if (!wallet) {
      setMyCircles([]);
      return;
    }
    try {
      const program = getProgram(wallet, connection);
      const all = (await program.account.circle.all()) as unknown as MyCircle[];
      const me = wallet.publicKey.toBase58();
      setMyCircles(
        all.filter((c) =>
          c.account.members.some((m) => m.toBase58() === me)
        )
      );
    } catch (e) {
      console.error(e);
    }
  }, [wallet, connection]);

  useEffect(() => {
    if (previewMode) return;
    loadBalances();
    loadMyCircles();
    if (!connected) return;
    const id = setInterval(() => {
      loadBalances();
    }, 10_000);
    return () => clearInterval(id);
  }, [connected, loadBalances, loadMyCircles, previewMode]);

  // Auto-open panel in preview mode
  useEffect(() => {
    if (previewMode) setOpen(true);
  }, [previewMode]);

  // close on outside click
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  async function handleInitVault() {
    if (!wallet) return;
    setBusy(true);
    try {
      const program = getProgram(wallet, connection);
      const [userVault] = userVaultPda(wallet.publicKey);
      const [userVaultTokenAccount] = userVaultAtaPda(wallet.publicKey);
      const builder = program.methods
        .initUserVault()
        .accounts({
          user: wallet.publicKey,
          userVault,
          userVaultTokenAccount,
          usdcMint: USDC_MINT,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        } as never);
      await buildAndSubmitGasless({
        connection,
        wallet,
        methodBuilder: builder,
      });
      await loadBalances();
    } catch (e) {
      alert(`Error: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleTopUp() {
    if (!wallet || !amount) return;
    setBusy(true);
    try {
      const program = getProgram(wallet, connection);
      const [userVault] = userVaultPda(wallet.publicKey);
      const [userVaultTokenAccount] = userVaultAtaPda(wallet.publicKey);
      const userTokenAccount = getAssociatedTokenAddressSync(
        USDC_MINT,
        wallet.publicKey
      );
      const builder = program.methods
        .topUpVault(parseUsdc(amount))
        .accounts({
          user: wallet.publicKey,
          userVault,
          userVaultTokenAccount,
          userTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        } as never);
      await buildAndSubmitGasless({
        connection,
        wallet,
        methodBuilder: builder,
      });
      setAmount("");
      setMode("none");
      await loadBalances();
    } catch (e) {
      alert(`Error: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleWithdraw() {
    if (!wallet || !amount) return;
    setBusy(true);
    try {
      const program = getProgram(wallet, connection);
      const [userVault] = userVaultPda(wallet.publicKey);
      const [userVaultTokenAccount] = userVaultAtaPda(wallet.publicKey);
      const userTokenAccount = getAssociatedTokenAddressSync(
        USDC_MINT,
        wallet.publicKey
      );
      const builder = program.methods
        .withdrawVault(parseUsdc(amount))
        .accounts({
          user: wallet.publicKey,
          userVault,
          userVaultTokenAccount,
          userTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        } as never);
      await buildAndSubmitGasless({
        connection,
        wallet,
        methodBuilder: builder,
      });
      setAmount("");
      setMode("none");
      await loadBalances();
    } catch (e) {
      alert(`Error: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleFaucet() {
    if (!publicKey) return;
    setBusy(true);
    try {
      const res = await fetch("/api/faucet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: publicKey.toBase58() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "faucet failed");
      await loadBalances();
    } catch (e) {
      alert(`Error: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function copyAddress() {
    const addr = previewMode ? PREVIEW_PUBKEY_STR : publicKey?.toBase58();
    if (!addr) return;
    try {
      await navigator.clipboard.writeText(addr);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  // PREVIEW MODE: render mock connected UI
  if (previewMode) {
    const displayAddr = PREVIEW_PUBKEY_STR;
    const previewWalletBal = PREVIEW_USDC_WALLET;
    const previewVaultBal = PREVIEW_USDC_VAULT;
    return (
      <div className="relative" ref={panelRef}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-2 h-10 px-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--card-hover)] transition-colors text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          aria-haspopup="true"
          aria-expanded={open}
        >
          <span
            className="w-2 h-2 rounded-full bg-[var(--primary)]"
            aria-hidden
          />
          <span style={{ fontFamily: "var(--font-mono)" }}>
            {shortAddr(displayAddr)}
          </span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            aria-hidden
            className={`transition-transform ${open ? "rotate-180" : ""}`}
          >
            <path
              d="M3 4.5L6 7.5L9 4.5"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {open && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/10"
              onClick={() => setOpen(false)}
              aria-hidden
            />
            <div
              role="dialog"
              className="absolute right-0 mt-2 w-[360px] max-w-[92vw] z-50 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] shadow-xl overflow-hidden"
            >
              <div className="p-4 border-b border-[var(--border)]">
                <div className="text-xs text-[var(--muted)] mb-1">Connected</div>
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs flex-1 truncate"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {displayAddr}
                  </span>
                  <button
                    onClick={copyAddress}
                    className="text-xs px-2 py-1 rounded-[var(--radius-sm)] border border-[var(--border)] hover:bg-[var(--card-hover)]"
                    title="Copy"
                  >
                    {copied ? "✓" : "Copy"}
                  </button>
                  <a
                    href={explorerAddr(displayAddr)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs px-2 py-1 rounded-[var(--radius-sm)] border border-[var(--border)] hover:bg-[var(--card-hover)]"
                    title="Open in explorer"
                  >
                    ↗
                  </a>
                </div>
              </div>

              <div className="p-4 border-b border-[var(--border)]">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-[var(--muted)]">
                      Wallet balance
                    </div>
                    <div className="text-lg font-semibold">
                      {formatUsdc(previewWalletBal)} USDC
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {}}
                  >
                    Get 1000 mock USDC
                  </Button>
                </div>
              </div>

              <div className="p-4 border-b border-[var(--border)]">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                    Roosta vault
                  </div>
                </div>
                <div className="text-lg font-semibold mb-3">
                  {formatUsdc(previewVaultBal)} USDC
                </div>
                {mode === "none" && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => setMode("topup")}>
                      + Top up
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setMode("withdraw")}
                    >
                      ↓ Withdraw
                    </Button>
                  </div>
                )}
                {mode !== "none" && (
                  <div className="flex gap-2 items-center">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Amount"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="!h-9"
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        setAmount("");
                        setMode("none");
                      }}
                      disabled={!amount}
                    >
                      {mode === "topup" ? "Top up" : "Withdraw"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setMode("none");
                        setAmount("");
                      }}
                    >
                      ✕
                    </Button>
                  </div>
                )}
              </div>

              <div className="p-4 border-b border-[var(--border)] max-h-48 overflow-y-auto">
                <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)] mb-2">
                  My circles
                </div>
                <ul className="space-y-1.5">
                  {PREVIEW_CIRCLES.map((c) => (
                    <li key={c.id}>
                      <div className="flex items-center justify-between text-sm py-1.5 px-2 rounded-[var(--radius-sm)] hover:bg-[var(--card-hover)]">
                        <span className="truncate font-medium">{c.name}</span>
                        <span className="text-xs text-[var(--muted)] ml-2 shrink-0">
                          R{c.currentRound}/{c.totalRounds}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => setOpen(false)}
                >
                  Disconnect
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  if (!connected || !publicKey) {
    return (
      <Button
        onClick={() => setVisible(true)}
        className="!h-10"
        size="md"
      >
        Connect Wallet
      </Button>
    );
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 h-10 px-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--card-hover)] transition-colors text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <span
          className="w-2 h-2 rounded-full bg-[var(--primary)]"
          aria-hidden
        />
        <span style={{ fontFamily: "var(--font-mono)" }}>
          {shortAddr(publicKey.toBase58())}
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          aria-hidden
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path
            d="M3 4.5L6 7.5L9 4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/10"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            role="dialog"
            className="absolute right-0 mt-2 w-[360px] max-w-[92vw] z-50 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] shadow-xl overflow-hidden"
          >
            <div className="p-4 border-b border-[var(--border)]">
              <div className="text-xs text-[var(--muted)] mb-1">Connected</div>
              <div className="flex items-center gap-2">
                <span
                  className="text-xs flex-1 truncate"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {publicKey.toBase58()}
                </span>
                <button
                  onClick={copyAddress}
                  className="text-xs px-2 py-1 rounded-[var(--radius-sm)] border border-[var(--border)] hover:bg-[var(--card-hover)]"
                  title="Copy"
                >
                  {copied ? "✓" : "Copy"}
                </button>
                <a
                  href={explorerAddr(publicKey.toBase58())}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs px-2 py-1 rounded-[var(--radius-sm)] border border-[var(--border)] hover:bg-[var(--card-hover)]"
                  title="Open in explorer"
                >
                  ↗
                </a>
              </div>
            </div>

            {/* Wallet balance */}
            <div className="p-4 border-b border-[var(--border)]">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-[var(--muted)]">
                    Wallet balance
                  </div>
                  <div className="text-lg font-semibold">
                    {walletBalance === null
                      ? "—"
                      : `${formatUsdc(walletBalance)} USDC`}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleFaucet}
                  disabled={busy}
                >
                  Get test USDC
                </Button>
              </div>
            </div>

            {/* Roosta vault */}
            <div className="p-4 border-b border-[var(--border)]">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Roosta vault
                </div>
              </div>
              {!vaultInitialized ? (
                <div>
                  <div className="text-sm text-[var(--muted)] mb-2">
                    Not yet activated
                  </div>
                  <Button
                    onClick={handleInitVault}
                    disabled={busy}
                    size="sm"
                  >
                    {busy ? "Initializing…" : "Initialize vault"}
                  </Button>
                </div>
              ) : (
                <>
                  <div className="text-lg font-semibold mb-3">
                    {formatUsdc(vaultBalance ?? BigInt(0))} USDC
                  </div>
                  {mode === "none" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => setMode("topup")}
                        disabled={busy}
                      >
                        + Top up
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setMode("withdraw")}
                        disabled={busy}
                      >
                        ↓ Withdraw
                      </Button>
                    </div>
                  )}
                  {mode !== "none" && (
                    <div className="flex gap-2 items-center">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Amount"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="!h-9"
                      />
                      <Button
                        size="sm"
                        onClick={
                          mode === "topup" ? handleTopUp : handleWithdraw
                        }
                        disabled={busy || !amount}
                      >
                        {busy
                          ? "…"
                          : mode === "topup"
                          ? "Top up"
                          : "Withdraw"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setMode("none");
                          setAmount("");
                        }}
                      >
                        ✕
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* My circles */}
            <div className="p-4 border-b border-[var(--border)] max-h-48 overflow-y-auto">
              <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)] mb-2">
                My circles
              </div>
              {myCircles.length === 0 ? (
                <div className="text-sm text-[var(--muted)]">
                  You haven&apos;t joined any circles yet.
                </div>
              ) : (
                <ul className="space-y-1.5">
                  {myCircles.map((c) => (
                    <li key={c.publicKey.toBase58()}>
                      <Link
                        href={`/circles/${c.publicKey.toBase58()}`}
                        onClick={() => setOpen(false)}
                        className="flex items-center justify-between text-sm py-1.5 px-2 rounded-[var(--radius-sm)] hover:bg-[var(--card-hover)]"
                      >
                        <span className="truncate font-medium">
                          {c.account.name}
                        </span>
                        <span className="text-xs text-[var(--muted)] ml-2 shrink-0">
                          R{Math.min(c.account.currentRound, c.account.totalRounds)}
                          /{c.account.totalRounds}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="p-3">
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={async () => {
                  setOpen(false);
                  await disconnect();
                }}
              >
                Disconnect
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
