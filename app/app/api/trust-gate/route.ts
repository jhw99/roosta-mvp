import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import idl from "@/lib/roosta-idl.json";
import type { Roosta } from "@/lib/roosta-types";
import type { WalletHistory } from "../wallet-history/route";

export const runtime = "nodejs";

export type TrustTier =
  | "Tier0New"
  | "Tier1Verified"
  | "Tier2Trusted"
  | "Tier3Prime"
  | "Tier4Guarantor";

export type CreditProfileSummary = {
  circles_completed: number;
  on_time_payments: number;
  late_payments: number;
  defaults: number;
  total_volume: string;
};

export type TrustGateResult = {
  eligible: boolean;
  reason?: string;
  trustTier: TrustTier;
  walletData: WalletHistory;
  creditProfile: CreditProfileSummary | null;
  suggestedPositions?: number[];
};

const TX_CAP = 1000;
const PAGE_SIZE = 1000;

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
  if (!res.ok) throw new Error(`RPC ${method} failed: ${res.status}`);
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
    const page = await rpcCall<Sig[]>(rpcUrl, "getSignaturesForAddress", params);
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
  const res = await fetch(apiUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "trust-gate",
      method: "searchAssets",
      params: { ownerAddress, tokenType: "all", page: 1, limit: 1 },
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

async function getWalletHistory(wallet: string): Promise<WalletHistory> {
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
    signatures = await fetchSignaturesPaginated(fallbackRpc, wallet);
    usedFallback = true;
  }

  const now = Math.floor(Date.now() / 1000);
  const thirtyDaysAgo = now - 30 * 24 * 3600;
  const newestBlockTime =
    signatures.find((s) => s.blockTime != null)?.blockTime ?? null;
  let oldestBlockTime: number | null = null;
  for (let i = signatures.length - 1; i >= 0; i--) {
    if (signatures[i].blockTime != null) {
      oldestBlockTime = signatures[i].blockTime;
      break;
    }
  }
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

  return {
    walletAge_days,
    txCount: signatures.length,
    hasNonEmptyAssetHistory,
    recentActivityWithin30d,
  };
}

function creditPda(wallet: PublicKey): PublicKey {
  const programId = new PublicKey(
    process.env.NEXT_PUBLIC_PROGRAM_ID ||
      "3i5GgdaySbxcBB133fp2Nyk9ER66d1fEGyTFCxqdjWqv"
  );
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("credit"), wallet.toBuffer()],
    programId
  );
  return pda;
}

async function fetchCreditProfile(
  connection: Connection,
  wallet: PublicKey
): Promise<CreditProfileSummary | null> {
  const provider = new anchor.AnchorProvider(
    connection,
    {} as anchor.Wallet,
    { commitment: "confirmed" }
  );
  const program = new anchor.Program(idl as Roosta, provider);
  const pda = creditPda(wallet);
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const acc: any = await (program.account as any).creditProfile.fetchNullable(
      pda
    );
    if (!acc) return null;
    return {
      circles_completed: Number(acc.circlesCompleted ?? 0),
      on_time_payments: Number(acc.onTimePayments ?? 0),
      late_payments: Number(acc.latePayments ?? 0),
      defaults: Number(acc.defaults ?? 0),
      total_volume: (acc.totalVolume ?? 0).toString(),
    };
  } catch {
    return null;
  }
}

function computeTrustTier(
  wallet: WalletHistory,
  credit: CreditProfileSummary | null
): TrustTier {
  const completed = credit?.circles_completed ?? 0;
  const late = credit?.late_payments ?? 0;
  const defaults = credit?.defaults ?? 0;

  if (defaults > 0) return "Tier0New";
  if (wallet.walletAge_days < 30 || wallet.txCount < 5) return "Tier0New";
  if (completed === 0) {
    return wallet.recentActivityWithin30d ? "Tier1Verified" : "Tier0New";
  }
  if (completed >= 5 && late === 0) return "Tier4Guarantor";
  if (completed >= 3 && late <= 1) return "Tier3Prime";
  if (completed >= 1 && late <= 2) return "Tier2Trusted";
  return "Tier1Verified";
}

const TIER_RANK: Record<TrustTier, number> = {
  Tier0New: 0,
  Tier1Verified: 1,
  Tier2Trusted: 2,
  Tier3Prime: 3,
  Tier4Guarantor: 4,
};

function defaultSuggestedPositions(): number[] {
  return [3, 4, 5];
}

function decideEligibility(
  trustTier: TrustTier,
  wallet: WalletHistory,
  desiredPosition: number,
  hasSufficientCollateral: boolean,
  agreedToReserve: boolean
): { eligible: boolean; reason?: string; suggestedPositions?: number[] } {
  const rank = TIER_RANK[trustTier];

  if (desiredPosition <= 0 || !Number.isInteger(desiredPosition)) {
    return { eligible: false, reason: "Invalid desired position" };
  }

  if (desiredPosition === 1) {
    if (rank < TIER_RANK.Tier3Prime) {
      return {
        eligible: false,
        reason:
          "Position 1 requires Tier3 Prime or higher. Build history by completing circles in later positions.",
        suggestedPositions: defaultSuggestedPositions(),
      };
    }
    if (!hasSufficientCollateral) {
      return {
        eligible: false,
        reason: "Position 1 requires sufficient collateral.",
        suggestedPositions: defaultSuggestedPositions(),
      };
    }
    if (!agreedToReserve) {
      return {
        eligible: false,
        reason: "Position 1 requires agreement to lock collateral as reserve.",
        suggestedPositions: defaultSuggestedPositions(),
      };
    }
    return { eligible: true };
  }

  if (desiredPosition === 2) {
    if (rank < TIER_RANK.Tier2Trusted) {
      return {
        eligible: false,
        reason:
          "Position 2 requires Tier2 Trusted or higher. Complete a circle in a later position first.",
        suggestedPositions: defaultSuggestedPositions(),
      };
    }
    if (!hasSufficientCollateral) {
      return {
        eligible: false,
        reason: "Position 2 requires sufficient collateral.",
        suggestedPositions: defaultSuggestedPositions(),
      };
    }
    return { eligible: true };
  }

  // Position 3+
  if (wallet.walletAge_days < 1) {
    return {
      eligible: false,
      reason: "Wallet must be at least 1 day old to join a circle.",
    };
  }
  return { eligible: true };
}

export async function POST(req: NextRequest) {
  let wallet: string;
  let desiredPosition: number;
  let hasSufficientCollateral: boolean;
  let agreedToReserve: boolean;

  try {
    const body = await req.json();
    wallet = body?.wallet;
    desiredPosition = Number(body?.desiredPosition);
    hasSufficientCollateral = Boolean(body?.hasSufficientCollateral);
    agreedToReserve = Boolean(body?.agreedToReserve);

    if (!wallet || typeof wallet !== "string") {
      return NextResponse.json(
        { error: "missing or invalid wallet" },
        { status: 400 }
      );
    }
    new PublicKey(wallet);
    if (!Number.isFinite(desiredPosition) || desiredPosition < 1) {
      return NextResponse.json(
        { error: "desiredPosition must be a positive integer" },
        { status: 400 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: "invalid request body" },
      { status: 400 }
    );
  }

  let walletData: WalletHistory;
  try {
    walletData = await getWalletHistory(wallet);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: `wallet history failed: ${msg}` },
      { status: 502 }
    );
  }

  const rpc =
    process.env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com";
  const connection = new Connection(rpc, "confirmed");
  const creditProfile = await fetchCreditProfile(
    connection,
    new PublicKey(wallet)
  );

  const trustTier = computeTrustTier(walletData, creditProfile);
  const decision = decideEligibility(
    trustTier,
    walletData,
    desiredPosition,
    hasSufficientCollateral,
    agreedToReserve
  );

  const result: TrustGateResult = {
    eligible: decision.eligible,
    reason: decision.reason,
    trustTier,
    walletData,
    creditProfile,
    suggestedPositions: decision.suggestedPositions,
  };

  return NextResponse.json(result);
}
