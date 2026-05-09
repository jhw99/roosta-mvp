"use client";

import * as anchor from "@coral-xyz/anchor";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import { getAccount } from "@solana/spl-token";
import type { AnchorWallet } from "@solana/wallet-adapter-react";
import BN from "bn.js";
import idl from "@/lib/roosta-idl.json";
import type { Roosta } from "@/lib/roosta-types";

export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID ||
    "3i5GgdaySbxcBB133fp2Nyk9ER66d1fEGyTFCxqdjWqv"
);

export const USDC_MINT = new PublicKey(
  process.env.NEXT_PUBLIC_USDC_MINT ||
    "EVfLhS7j4nbC4Ln1VpVh7fHJruwWqZUUEE1tHNuYFkDu"
);

export function getProgram(
  wallet: AnchorWallet,
  connection: Connection
): Program<Roosta> {
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  anchor.setProvider(provider);
  return new Program(idl as unknown as Roosta, provider);
}

export function getReadOnlyProgram(connection: Connection): Program<Roosta> {
  const dummyWallet = {
    publicKey: PublicKey.default,
    signTransaction: async () => {
      throw new Error("read-only");
    },
    signAllTransactions: async () => {
      throw new Error("read-only");
    },
  } as unknown as AnchorWallet;
  const provider = new AnchorProvider(connection, dummyWallet, {
    commitment: "confirmed",
  });
  return new Program(idl as unknown as Roosta, provider);
}

export function circlePda(authority: PublicKey, circleId: BN): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("circle"),
      authority.toBuffer(),
      circleId.toArrayLike(Buffer, "le", 8),
    ],
    PROGRAM_ID
  );
}

export function vaultPda(circle: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), circle.toBuffer()],
    PROGRAM_ID
  );
}

export function memberPda(
  circle: PublicKey,
  wallet: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("member"), circle.toBuffer(), wallet.toBuffer()],
    PROGRAM_ID
  );
}

export function roundPda(
  circle: PublicKey,
  roundNumber: number
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("round"), circle.toBuffer(), Buffer.from([roundNumber])],
    PROGRAM_ID
  );
}

export function userVaultPda(wallet: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("user_vault"), wallet.toBuffer()],
    PROGRAM_ID
  );
}

export function userVaultAtaPda(wallet: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("user_vault_ata"), wallet.toBuffer()],
    PROGRAM_ID
  );
}

export function collateralVaultPda(circle: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("collateral_vault"), circle.toBuffer()],
    PROGRAM_ID
  );
}

export function creditProfilePda(wallet: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("credit"), wallet.toBuffer()],
    PROGRAM_ID
  );
}

export function sbtMintPda(wallet: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("credit_sbt"), wallet.toBuffer()],
    PROGRAM_ID
  );
}

export function sbtAuthorityPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("sbt_authority")],
    PROGRAM_ID
  );
}

export function positionAuthorityPda(circle: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("position_authority"), circle.toBuffer()],
    PROGRAM_ID
  );
}

/**
 * Fetch the USDC balance of the user's Roosta vault token account.
 * Returns null if the vault has not been initialized yet.
 */
export async function fetchVaultBalance(
  connection: Connection,
  wallet: PublicKey
): Promise<bigint | null> {
  const [ata] = userVaultAtaPda(wallet);
  try {
    const acc = await getAccount(connection, ata);
    return acc.amount;
  } catch {
    return null;
  }
}
