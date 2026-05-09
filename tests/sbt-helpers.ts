import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import {
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";

const CREDIT_SEED = Buffer.from("credit");
const SBT_MINT_SEED = Buffer.from("credit_sbt");
const SBT_AUTHORITY_SEED = Buffer.from("sbt_authority");

export function creditPdaFor(programId: PublicKey, wallet: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [CREDIT_SEED, wallet.toBuffer()],
    programId
  )[0];
}

export function sbtMintPdaFor(programId: PublicKey, wallet: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [SBT_MINT_SEED, wallet.toBuffer()],
    programId
  )[0];
}

export function sbtAuthorityPdaFor(programId: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [SBT_AUTHORITY_SEED],
    programId
  )[0];
}

export function initCreditProfileAccounts(
  programId: PublicKey,
  wallet: PublicKey
) {
  const sbtMint = sbtMintPdaFor(programId, wallet);
  const sbtTokenAccount = getAssociatedTokenAddressSync(
    sbtMint,
    wallet,
    false,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  return {
    wallet,
    creditProfile: creditPdaFor(programId, wallet),
    sbtMint,
    sbtTokenAccount,
    sbtAuthority: sbtAuthorityPdaFor(programId),
    token2022Program: TOKEN_2022_PROGRAM_ID,
    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
    rent: SYSVAR_RENT_PUBKEY,
  };
}
