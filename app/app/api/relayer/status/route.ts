import { NextResponse } from "next/server";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const pubkeyStr = process.env.NEXT_PUBLIC_RELAYER_PUBKEY;
    const secret = process.env.RELAYER_SECRET || process.env.FAUCET_SECRET;
    if (!pubkeyStr && !secret) {
      return NextResponse.json({ available: false, balance: 0 });
    }

    let pubkey: PublicKey;
    if (pubkeyStr) {
      pubkey = new PublicKey(pubkeyStr);
    } else {
      const decode =
        (bs58 as unknown as { default?: typeof bs58 }).default ?? bs58;
      pubkey = Keypair.fromSecretKey(decode.decode(secret!)).publicKey;
    }

    const rpc =
      process.env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com";
    const connection = new Connection(rpc, "confirmed");
    const lamports = await connection.getBalance(pubkey, "confirmed");

    // Available if has at least 0.005 SOL for ~500 txs
    const available = lamports >= 5_000_000;

    return NextResponse.json({
      available,
      balance: lamports / 1_000_000_000,
      pubkey: pubkey.toBase58(),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { available: false, balance: 0, error: msg },
      { status: 200 }
    );
  }
}
