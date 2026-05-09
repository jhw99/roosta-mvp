import { NextRequest, NextResponse } from "next/server";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  VersionedTransaction,
  SendTransactionError,
} from "@solana/web3.js";
import bs58 from "bs58";

export const runtime = "nodejs";

// Allowlisted program IDs that the relayer is willing to pay fees for.
const ALLOWED_PROGRAMS = new Set<string>([
  "3i5GgdaySbxcBB133fp2Nyk9ER66d1fEGyTFCxqdjWqv", // Roosta
  "11111111111111111111111111111111", // System
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", // SPL Token
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb", // Token-2022
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL", // Associated Token
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s", // Metaplex Token Metadata
  "SysvarRent111111111111111111111111111111111", // Sysvar Rent (pseudo-program; harmless)
  "ComputeBudget111111111111111111111111111111", // Compute budget
]);

// In-memory rate limit (best-effort; resets on serverless cold-start).
const RATE_WINDOW_MS = 5 * 60 * 1000;
const RATE_LIMIT = 30;
const ipBuckets: Map<string, number[]> = new Map();

function rateLimit(ip: string): boolean {
  const now = Date.now();
  const arr = (ipBuckets.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (arr.length >= RATE_LIMIT) {
    ipBuckets.set(ip, arr);
    return false;
  }
  arr.push(now);
  ipBuckets.set(ip, arr);
  return true;
}

function loadRelayer(): Keypair {
  const secret = process.env.RELAYER_SECRET || process.env.FAUCET_SECRET;
  if (!secret) throw new Error("relayer not configured");
  const decode = (bs58 as unknown as { default?: typeof bs58 }).default ?? bs58;
  return Keypair.fromSecretKey(decode.decode(secret));
}

type AnyTx =
  | { kind: "legacy"; tx: Transaction }
  | { kind: "versioned"; tx: VersionedTransaction };

function deserialize(buf: Buffer): AnyTx {
  // Try versioned first; fall back to legacy.
  try {
    const v = VersionedTransaction.deserialize(buf);
    return { kind: "versioned", tx: v };
  } catch {
    const legacy = Transaction.from(buf);
    return { kind: "legacy", tx: legacy };
  }
}

function getProgramIdsAndFeePayer(
  any: AnyTx
): { programIds: PublicKey[]; feePayer: PublicKey } {
  if (any.kind === "legacy") {
    const tx = any.tx;
    const ids = tx.instructions.map((ix) => ix.programId);
    const feePayer = tx.feePayer;
    if (!feePayer) throw new Error("missing fee payer");
    return { programIds: ids, feePayer };
  }
  const msg = any.tx.message;
  const keys = msg.staticAccountKeys;
  const ids: PublicKey[] = [];
  for (const ix of msg.compiledInstructions) {
    ids.push(keys[ix.programIdIndex]);
  }
  const feePayer = keys[0];
  return { programIds: ids, feePayer };
}

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";
    if (!rateLimit(ip)) {
      return NextResponse.json(
        { error: "rate limited — try again in a few minutes" },
        { status: 429 }
      );
    }

    const { tx } = (await req.json()) as { tx?: string };
    if (!tx || typeof tx !== "string") {
      return NextResponse.json({ error: "missing tx" }, { status: 400 });
    }

    const buf = Buffer.from(tx, "base64");
    const parsed = deserialize(buf);
    const relayer = loadRelayer();

    const { programIds, feePayer } = getProgramIdsAndFeePayer(parsed);

    if (!feePayer.equals(relayer.publicKey)) {
      return NextResponse.json(
        { error: "fee payer is not the relayer" },
        { status: 400 }
      );
    }

    for (const pid of programIds) {
      if (!ALLOWED_PROGRAMS.has(pid.toBase58())) {
        return NextResponse.json(
          { error: `program ${pid.toBase58()} not allowlisted` },
          { status: 400 }
        );
      }
    }

    const rpc =
      process.env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com";
    const connection = new Connection(rpc, "confirmed");

    let raw: Buffer;
    if (parsed.kind === "legacy") {
      // Sign with relayer (adds signature without overwriting user sigs).
      parsed.tx.partialSign(relayer);
      raw = parsed.tx.serialize() as Buffer;
    } else {
      parsed.tx.sign([relayer]);
      raw = Buffer.from(parsed.tx.serialize());
    }

    const sig = await connection.sendRawTransaction(raw, {
      skipPreflight: false,
      maxRetries: 3,
    });

    const latest = await connection.getLatestBlockhash("confirmed");
    await connection.confirmTransaction(
      {
        signature: sig,
        blockhash: latest.blockhash,
        lastValidBlockHeight: latest.lastValidBlockHeight,
      },
      "confirmed"
    );

    return NextResponse.json({ signature: sig });
  } catch (e: unknown) {
    const msg =
      e instanceof SendTransactionError
        ? e.message
        : e instanceof Error
        ? e.message
        : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
