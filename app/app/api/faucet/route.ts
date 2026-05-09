import { NextRequest, NextResponse } from "next/server";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import {
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import bs58 from "bs58";

export const runtime = "nodejs";

const FAUCET_AMOUNT = BigInt(1000_000_000); // 1000 mock USDC (6 decimals)

export async function POST(req: NextRequest) {
  try {
    const { wallet } = await req.json();
    if (!wallet) {
      return NextResponse.json({ error: "missing wallet" }, { status: 400 });
    }

    const mintStr = process.env.NEXT_PUBLIC_USDC_MINT;
    const rpc = process.env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com";
    const secret = process.env.FAUCET_SECRET;
    if (!mintStr || !secret) {
      return NextResponse.json(
        { error: "faucet not configured" },
        { status: 500 }
      );
    }

    const connection = new Connection(rpc, "confirmed");
    const decode = (bs58 as unknown as { default?: typeof bs58 }).default ?? bs58;
    const authority = Keypair.fromSecretKey(decode.decode(secret));
    const mint = new PublicKey(mintStr);
    const owner = new PublicKey(wallet);

    const ata = await getOrCreateAssociatedTokenAccount(
      connection,
      authority,
      mint,
      owner
    );

    const sig = await mintTo(
      connection,
      authority,
      mint,
      ata.address,
      authority,
      FAUCET_AMOUNT
    );

    return NextResponse.json({ signature: sig, ata: ata.address.toBase58() });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
