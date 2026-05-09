"use client";

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import type { AnchorWallet } from "@solana/wallet-adapter-react";
// Loose typing for Anchor MethodsBuilder to avoid IDL coupling.
type MethodsBuilderLike = {
  transaction: () => Promise<Transaction>;
  rpc: () => Promise<string>;
};

export interface GaslessOutcome {
  signature: string;
  gasless: boolean;
  fallbackReason?: string;
}

export const RELAYER_PUBKEY: PublicKey | null = (() => {
  const p = process.env.NEXT_PUBLIC_RELAYER_PUBKEY;
  if (!p) return null;
  try {
    return new PublicKey(p);
  } catch {
    return null;
  }
})();

export const ESTIMATED_FEE_SOL = 0.00001;

export async function buildAndSubmitGasless(args: {
  connection: Connection;
  wallet: AnchorWallet;
  methodBuilder: MethodsBuilderLike;
  extraSigners?: Keypair[];
}): Promise<GaslessOutcome> {
  const { connection, wallet, methodBuilder, extraSigners = [] } = args;

  // If relayer not configured, fall back to user-paid rpc.
  if (!RELAYER_PUBKEY) {
    const sig = await methodBuilder.rpc();
    return {
      signature: sig,
      gasless: false,
      fallbackReason: "relayer not configured",
    };
  }

  try {
    const tx = await methodBuilder.transaction();
    tx.feePayer = RELAYER_PUBKEY;
    const { blockhash } = await connection.getLatestBlockhash("confirmed");
    tx.recentBlockhash = blockhash;

    // Sign extra signers first (e.g. position mint keypair).
    if (extraSigners.length) tx.partialSign(...extraSigners);

    // User wallet signs (Phantom etc).
    const signed = await wallet.signTransaction(tx);

    const serialized = signed.serialize({ requireAllSignatures: false });
    const b64 =
      typeof Buffer !== "undefined"
        ? Buffer.from(serialized).toString("base64")
        : btoa(String.fromCharCode(...new Uint8Array(serialized)));

    const res = await fetch("/api/relayer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tx: b64 }),
    });
    const data = (await res.json()) as { signature?: string; error?: string };
    if (!res.ok || !data.signature) {
      throw new Error(data.error || `relayer http ${res.status}`);
    }
    return { signature: data.signature, gasless: true };
  } catch (e) {
    // Fallback to user-paid rpc.
    const reason = (e as Error).message;
    try {
      const sig = await methodBuilder.rpc();
      return { signature: sig, gasless: false, fallbackReason: reason };
    } catch (rpcErr) {
      // Surface combined error
      throw new Error(
        `gasless failed (${reason}); fallback failed (${(rpcErr as Error).message})`
      );
    }
  }
}

export async function fetchRelayerStatus(): Promise<{
  available: boolean;
  balance: number;
  pubkey?: string;
}> {
  try {
    const res = await fetch("/api/relayer/status", { cache: "no-store" });
    if (!res.ok) return { available: false, balance: 0 };
    return (await res.json()) as {
      available: boolean;
      balance: number;
      pubkey?: string;
    };
  } catch {
    return { available: false, balance: 0 };
  }
}
