import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  PublicKey,
  Keypair,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  LAMPORTS_PER_SOL,
  Transaction,
} from "@solana/web3.js";
import {
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  getAccount,
  createTransferInstruction,
} from "@solana/spl-token";
import { assert } from "chai";

describe("credit_profile", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Roosta as Program<any>;
  const connection = provider.connection;

  const creditSeed = Buffer.from("credit");
  const sbtMintSeed = Buffer.from("credit_sbt");
  const sbtAuthoritySeed = Buffer.from("sbt_authority");

  function creditPda(wallet: PublicKey): PublicKey {
    return PublicKey.findProgramAddressSync(
      [creditSeed, wallet.toBuffer()],
      program.programId
    )[0];
  }

  function sbtMintPda(wallet: PublicKey): PublicKey {
    return PublicKey.findProgramAddressSync(
      [sbtMintSeed, wallet.toBuffer()],
      program.programId
    )[0];
  }

  const sbtAuthorityPda = PublicKey.findProgramAddressSync(
    [sbtAuthoritySeed],
    program.programId
  )[0];

  function buildAccounts(wallet: PublicKey) {
    const sbtMint = sbtMintPda(wallet);
    const sbtAta = getAssociatedTokenAddressSync(
      sbtMint,
      wallet,
      false,
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    return {
      wallet,
      creditProfile: creditPda(wallet),
      sbtMint,
      sbtTokenAccount: sbtAta,
      sbtAuthority: sbtAuthorityPda,
      token2022Program: TOKEN_2022_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
    };
  }

  it("initializes a credit profile, mints SBT, and is idempotent", async () => {
    const user = Keypair.generate();
    const sig = await connection.requestAirdrop(user.publicKey, 2 * LAMPORTS_PER_SOL);
    await connection.confirmTransaction(sig);

    const cp = creditPda(user.publicKey);
    const expectedSbtMint = sbtMintPda(user.publicKey);
    const sbtAta = getAssociatedTokenAddressSync(
      expectedSbtMint,
      user.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    await program.methods
      .initCreditProfile()
      .accounts(buildAccounts(user.publicKey))
      .signers([user])
      .rpc();

    const acc1 = await program.account.creditProfile.fetch(cp);
    assert.equal(acc1.wallet.toBase58(), user.publicKey.toBase58());
    assert.equal(Object.keys(acc1.trustTier)[0], "tier0New");
    assert.equal(acc1.circlesCompleted, 0);
    assert.equal(acc1.onTimePayments, 0);
    assert.equal(acc1.latePayments, 0);
    assert.equal(acc1.defaults, 0);
    assert.equal(acc1.totalVolume.toString(), "0");
    assert.equal(acc1.earlyPositionEligible, false);
    assert.notEqual(acc1.sbtMint.toBase58(), PublicKey.default.toBase58());
    assert.equal(acc1.sbtMint.toBase58(), expectedSbtMint.toBase58());
    const firstUpdated = acc1.lastUpdatedAt.toString();

    // SBT was minted: balance should be exactly 1.
    const tokenAcc = await getAccount(
      connection,
      sbtAta,
      undefined,
      TOKEN_2022_PROGRAM_ID
    );
    assert.equal(tokenAcc.amount.toString(), "1");
    assert.equal(tokenAcc.mint.toBase58(), expectedSbtMint.toBase58());
    assert.equal(tokenAcc.owner.toBase58(), user.publicKey.toBase58());

    // Attempt a transfer; the NonTransferable extension must reject it.
    const recipient = Keypair.generate();
    const recipientAta = getAssociatedTokenAddressSync(
      expectedSbtMint,
      recipient.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    // Try to transfer the SBT - this MUST fail. We attempt a raw transfer
    // instruction directly (the recipient ATA does not need to exist; the
    // NonTransferable check rejects before the missing-account error).
    let transferFailed = false;
    let transferErr: any = null;
    try {
      const tx = new Transaction().add(
        createTransferInstruction(
          sbtAta,
          recipientAta,
          user.publicKey,
          1,
          [],
          TOKEN_2022_PROGRAM_ID
        )
      );
      tx.feePayer = user.publicKey;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      tx.sign(user);
      await connection.sendRawTransaction(tx.serialize(), {
        skipPreflight: false,
      });
    } catch (e: any) {
      transferFailed = true;
      transferErr = e;
    }
    assert.isTrue(
      transferFailed,
      "Token-2022 NonTransferable mint must reject any transfer"
    );
    const errStr = (transferErr?.message || JSON.stringify(transferErr || {})).toLowerCase();
    // SPL Token-2022 returns "NonTransferable" / custom program error 0x25.
    assert.isTrue(
      errStr.includes("non") ||
        errStr.includes("transfer") ||
        errStr.includes("0x25") ||
        errStr.includes("custom"),
      `expected NonTransferable rejection, got: ${transferErr}`
    );

    // Second call should be a no-op (idempotent) and not throw.
    await program.methods
      .initCreditProfile()
      .accounts(buildAccounts(user.publicKey))
      .signers([user])
      .rpc();

    const acc2 = await program.account.creditProfile.fetch(cp);
    assert.equal(acc2.wallet.toBase58(), user.publicKey.toBase58());
    // Defaults preserved (not re-written).
    assert.equal(acc2.lastUpdatedAt.toString(), firstUpdated);
    // SBT mint unchanged.
    assert.equal(acc2.sbtMint.toBase58(), expectedSbtMint.toBase58());
    // Balance still 1 (not re-minted).
    const tokenAcc2 = await getAccount(
      connection,
      sbtAta,
      undefined,
      TOKEN_2022_PROGRAM_ID
    );
    assert.equal(tokenAcc2.amount.toString(), "1");
  });
});
