import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import {
  PublicKey,
  Keypair,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  getAccount,
} from "@solana/spl-token";
import { assert } from "chai";
import { initCreditProfileAccounts } from "./sbt-helpers";

describe("roosta", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Roosta as Program<any>;
  const connection = provider.connection;
  const authority = (provider.wallet as anchor.Wallet).payer;

  const MEMBER_COUNT = 5;
  const TOTAL_ROUNDS = 5;
  const CONTRIBUTION = new BN(100_000_000); // 100 USDC (6 decimals)
  const ROUND_DURATION = new BN(60 * 60 * 24 * 7); // 7 days

  let usdcMint: PublicKey;
  const members: Keypair[] = [];
  const memberAtas: PublicKey[] = [];
  const memberVaults: PublicKey[] = [];
  const memberVaultAtas: PublicKey[] = [];

  let circleId: BN;
  let circlePda: PublicKey;
  let vaultPda: PublicKey;

  const circleSeed = Buffer.from("circle");
  const vaultSeed = Buffer.from("vault");
  const roundSeed = Buffer.from("round");
  const memberSeed = Buffer.from("member");
  const userVaultSeed = Buffer.from("user_vault");
  const userVaultAtaSeed = Buffer.from("user_vault_ata");
  const collateralVaultSeed = Buffer.from("collateral_vault");
  const creditSeed = Buffer.from("credit");

  function creditPda(wallet: PublicKey): PublicKey {
    return PublicKey.findProgramAddressSync(
      [creditSeed, wallet.toBuffer()],
      program.programId
    )[0];
  }

  function roundPda(circle: PublicKey, n: number): PublicKey {
    return PublicKey.findProgramAddressSync(
      [roundSeed, circle.toBuffer(), Buffer.from([n])],
      program.programId
    )[0];
  }

  function memberPda(circle: PublicKey, wallet: PublicKey): PublicKey {
    return PublicKey.findProgramAddressSync(
      [memberSeed, circle.toBuffer(), wallet.toBuffer()],
      program.programId
    )[0];
  }

  function userVaultPda(wallet: PublicKey): PublicKey {
    return PublicKey.findProgramAddressSync(
      [userVaultSeed, wallet.toBuffer()],
      program.programId
    )[0];
  }

  function userVaultAtaPda(wallet: PublicKey): PublicKey {
    return PublicKey.findProgramAddressSync(
      [userVaultAtaSeed, wallet.toBuffer()],
      program.programId
    )[0];
  }

  before(async () => {
    usdcMint = await createMint(
      connection,
      authority,
      authority.publicKey,
      null,
      6
    );

    for (let i = 0; i < MEMBER_COUNT; i++) {
      const m = Keypair.generate();
      members.push(m);
      const sig = await connection.requestAirdrop(
        m.publicKey,
        2 * LAMPORTS_PER_SOL
      );
      await connection.confirmTransaction(sig);

      const ata = await getOrCreateAssociatedTokenAccount(
        connection,
        authority,
        usdcMint,
        m.publicKey
      );
      memberAtas.push(ata.address);

      await mintTo(
        connection,
        authority,
        usdcMint,
        ata.address,
        authority.publicKey,
        1_000_000_000
      );

      memberVaults.push(userVaultPda(m.publicKey));
      memberVaultAtas.push(userVaultAtaPda(m.publicKey));
    }

    circleId = new BN(Date.now());

    [circlePda] = PublicKey.findProgramAddressSync(
      [
        circleSeed,
        authority.publicKey.toBuffer(),
        circleId.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    [vaultPda] = PublicKey.findProgramAddressSync(
      [vaultSeed, circlePda.toBuffer()],
      program.programId
    );
  });

  it("initializes user vaults & tops them up", async () => {
    for (let i = 0; i < MEMBER_COUNT; i++) {
      const m = members[i];
      await program.methods
        .initUserVault()
        .accounts({
          user: m.publicKey,
          userVault: memberVaults[i],
          userVaultTokenAccount: memberVaultAtas[i],
          usdcMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([m])
        .rpc();

      // Top up vault with enough USDC for all rounds + buffer
      await program.methods
        .topUpVault(new BN(600_000_000)) // 600 USDC > 5 * 100
        .accounts({
          user: m.publicKey,
          userVault: memberVaults[i],
          userVaultTokenAccount: memberVaultAtas[i],
          userTokenAccount: memberAtas[i],
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([m])
        .rpc();

      const vaultBal = (await getAccount(connection, memberVaultAtas[i])).amount;
      assert.equal(vaultBal.toString(), "600000000");

      await program.methods
        .initCreditProfile()
        .accounts(initCreditProfileAccounts(program.programId, m.publicKey))
        .signers([m])
        .rpc();
    }
  });

  it("creates a circle", async () => {
    const round1 = roundPda(circlePda, 1);
    const [collateralVaultPda] = PublicKey.findProgramAddressSync(
      [collateralVaultSeed, circlePda.toBuffer()],
      program.programId
    );

    await program.methods
      .createCircle(
        circleId,
        "Test Circle",
        MEMBER_COUNT,
        TOTAL_ROUNDS,
        CONTRIBUTION,
        ROUND_DURATION,
        false, // trust_gate_enabled
        false, // risk_deposit_enabled
        false, // locked_reserve_enabled
        0, // early_position_collateral_ratio
        0, // locked_reserve_ratio
        new BN(0) // grace_period_seconds
      )
      .accounts({
        authority: authority.publicKey,
        circle: circlePda,
        vault: vaultPda,
        collateralVault: collateralVaultPda,
        round: round1,
        usdcMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    const circle = await program.account.circle.fetch(circlePda);
    assert.equal(circle.memberCount, MEMBER_COUNT);
  });

  it("joins all members", async () => {
    const round1 = roundPda(circlePda, 1);

    for (let i = 0; i < MEMBER_COUNT; i++) {
      const m = members[i];
      const ms = memberPda(circlePda, m.publicKey);
      await program.methods
        .joinCircle()
        .accounts({
          member: m.publicKey,
          circle: circlePda,
          round: round1,
          memberStatus: ms,
          systemProgram: SystemProgram.programId,
        })
        .signers([m])
        .rpc();
    }

    const circle = await program.account.circle.fetch(circlePda);
    assert.equal(circle.members.length, MEMBER_COUNT);
  });

  it("runs all rounds with vault deposits and vault payouts", async () => {
    for (let r = 1; r <= TOTAL_ROUNDS; r++) {
      const currentRound = roundPda(circlePda, r);
      const nextRound = roundPda(circlePda, r + 1);

      for (let i = 0; i < MEMBER_COUNT; i++) {
        const m = members[i];
        const ms = memberPda(circlePda, m.publicKey);
        await program.methods
          .deposit()
          .accounts({
            member: m.publicKey,
            circle: circlePda,
            round: currentRound,
            memberStatus: ms,
            memberVault: memberVaults[i],
            memberVaultTokenAccount: memberVaultAtas[i],
            vault: vaultPda,
            creditProfile: creditPda(m.publicKey),
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([m])
          .rpc();
      }

      const recipientIdx = r - 1;
      const recipient = members[recipientIdx];
      const recipientStatus = memberPda(circlePda, recipient.publicKey);

      const balBefore = (
        await getAccount(connection, memberVaultAtas[recipientIdx])
      ).amount;

      const [collateralVaultPda] = PublicKey.findProgramAddressSync(
        [collateralVaultSeed, circlePda.toBuffer()],
        program.programId
      );
      await program.methods
        .triggerPayout()
        .accounts({
          caller: authority.publicKey,
          circle: circlePda,
          round: currentRound,
          recipientStatus,
          vault: vaultPda,
          collateralVault: collateralVaultPda,
          recipientVault: memberVaults[recipientIdx],
          recipientVaultTokenAccount: memberVaultAtas[recipientIdx],
          nextRound,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const balAfter = (
        await getAccount(connection, memberVaultAtas[recipientIdx])
      ).amount;

      const diff = balAfter - balBefore;
      const expected = BigInt(MEMBER_COUNT) * BigInt(CONTRIBUTION.toString());
      assert.equal(diff.toString(), expected.toString());

      const settled = await program.account.round.fetch(currentRound);
      assert.equal(Object.keys(settled.status)[0], "settled");
    }

    const circle = await program.account.circle.fetch(circlePda);
    assert.equal(Object.keys(circle.status)[0], "completed");
  });

  it("withdraws from vault back to user ATA", async () => {
    const m = members[0];
    const before = (await getAccount(connection, memberAtas[0])).amount;
    const vaultBefore = (await getAccount(connection, memberVaultAtas[0])).amount;

    const amount = new BN(50_000_000);
    await program.methods
      .withdrawVault(amount)
      .accounts({
        user: m.publicKey,
        userVault: memberVaults[0],
        userVaultTokenAccount: memberVaultAtas[0],
        userTokenAccount: memberAtas[0],
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([m])
      .rpc();

    const after = (await getAccount(connection, memberAtas[0])).amount;
    const vaultAfter = (await getAccount(connection, memberVaultAtas[0])).amount;
    assert.equal((after - before).toString(), "50000000");
    assert.equal((vaultBefore - vaultAfter).toString(), "50000000");
  });
});
