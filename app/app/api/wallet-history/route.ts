import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";

export const runtime = "nodejs";
export const revalidate = 300;

export type WalletHistory = {
  walletAge_days: number;
  txCount: number;
  hasNonEmptyAssetHistory: boolean;
  recentActivityWithin30d: boolean;
};

type CacheEntry = { value: WalletHistory; expiresAt: number };
const CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;
const TX_CAP = 1000;
const PAGE_SIZE = 1000;

function getCached(wallet: string): WalletHistory | null {
  const entry = CACHE.get(wallet);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    CACHE.delete(wallet);
    return null;
  }
  return entry.value;
}

function setCached(wallet: string, value: WalletHistory) {
  CACHE.set(wallet, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

type Sig = {
  signature: string;
  blockTime: number | null;
  slot: number;
};

async function rpcCall<T>(
  url: string,
  method: string,
  params: unknown[]
): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`RPC ${method} failed: ${res.status}`);
  }
  const json = (await res.json()) as { result?: T; error?: { message: string } };
  if (json.error) throw new Error(json.error.message);
  return json.result as T;
}

async function fetchSignaturesPaginated(
  rpcUrl: string,
  address: string
): Promise<Sig[]> {
  const all: Sig[] = [];
  let before: string | undefined = undefined;
  while (all.length < TX_CAP) {
    const params: unknown[] = [
      address,
      { limit: PAGE_SIZE, ...(before ? { before } : {}) },
    ];
    const page = await rpcCall<Sig[]>(
      rpcUrl,
      "getSignaturesForAddress",
      params
    );
    if (!page || page.length === 0) break;
    all.push(...page);
    if (page.length < PAGE_SIZE) break;
    before = page[page.length - 1].signature;
  }
  return all.slice(0, TX_CAP);
}

async function dasSearchAssets(
  apiUrl: string,
  ownerAddress: string
): Promise<boolean> {
  // Helius DAS searchAssets - returns NFTs and fungible tokens for owner.
  const res = await fetch(apiUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "trust-gate",
      method: "searchAssets",
      params: {
        ownerAddress,
        tokenType: "all",
        page: 1,
        limit: 1,
      },
    }),
    cache: "no-store",
  });
  if (!res.ok) return false;
  const json = (await res.json()) as {
    result?: { items?: unknown[]; total?: number };
  };
  const items = json.result?.items ?? [];
  const total = json.result?.total ?? items.length;
  return total > 0;
}

export async function POST(req: NextRequest) {
  let wallet: string;
  try {
    const body = await req.json();
    wallet = body?.wallet;
    if (!wallet || typeof wallet !== "string") {
      return NextResponse.json(
        { error: "missing or invalid wallet" },
        { status: 400 }
      );
    }
    // Validate
    new PublicKey(wallet);
  } catch {
    return NextResponse.json(
      { error: "invalid wallet address" },
      { status: 400 }
    );
  }

  const cached = getCached(wallet);
  if (cached) {
    return NextResponse.json(cached);
  }

  const heliusKey = process.env.HELIUS_API_KEY;
  const heliusRpc = heliusKey
    ? `https://devnet.helius-rpc.com/?api-key=${heliusKey}`
    : null;
  const heliusDas = heliusKey
    ? `https://api-devnet.helius.xyz/?api-key=${heliusKey}`
    : null;
  const fallbackRpc = "https://api.devnet.solana.com";

  let signatures: Sig[] | null = null;
  let usedFallback = false;

  if (heliusRpc) {
    try {
      signatures = await fetchSignaturesPaginated(heliusRpc, wallet);
    } catch {
      signatures = null;
    }
  }

  if (!signatures) {
    try {
      signatures = await fetchSignaturesPaginated(fallbackRpc, wallet);
      usedFallback = true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json(
        { error: `failed to fetch signatures: ${msg}` },
        { status: 502 }
      );
    }
  }

  const txCount = signatures.length;
  const now = Math.floor(Date.now() / 1000);
  const thirtyDaysAgo = now - 30 * 24 * 3600;

  // Newest first per Solana RPC. Oldest is last in the list.
  const newestBlockTime = signatures.find((s) => s.blockTime != null)?.blockTime ?? null;
  // Walk from end for oldest with blockTime
  let oldestBlockTime: number | null = null;
  for (let i = signatures.length - 1; i >= 0; i--) {
    if (signatures[i].blockTime != null) {
      oldestBlockTime = signatures[i].blockTime;
      break;
    }
  }

  // If we hit the cap we may not have the actual oldest; but capped age is
  // still a lower bound — acceptable per spec.
  const walletAge_days = oldestBlockTime
    ? Math.max(0, Math.floor((now - oldestBlockTime) / 86400))
    : 0;
  const recentActivityWithin30d = newestBlockTime
    ? newestBlockTime > thirtyDaysAgo
    : false;

  let hasNonEmptyAssetHistory = false;
  if (heliusDas && !usedFallback) {
    try {
      hasNonEmptyAssetHistory = await dasSearchAssets(heliusDas, wallet);
    } catch {
      hasNonEmptyAssetHistory = false;
    }
  }

  const result: WalletHistory = {
    walletAge_days,
    txCount,
    hasNonEmptyAssetHistory,
    recentActivityWithin30d,
  };
  setCached(wallet, result);

  return NextResponse.json(result);
}
