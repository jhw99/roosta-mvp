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

describe("roosta v2 risk lifecycle", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Roosta as Program<any>;
  const connection = provider.connection;
  const authority = (provider.wallet as anchor.Wallet).payer;

  const MEMBER_COUNT = 5;
  const TOTAL_ROUNDS = 5;
  const CONTRIBUTION = new BN(100_000_000); // 100 USDC
  const ROUND_DURATION = new BN(60 * 60 * 24 * 7);
  const COLLATERAL_RATIO = 100; // base ratio % for position 1
  const RESERVE_RATIO = 50; // base reserve % of payout for position 1

  let usdcMint: PublicKey;
  const members: Keypair[] = [];
  const memberAtas: PublicKey[] = [];
  const memberVaults: PublicKey[] = [];
  const memberVaultAtas: PublicKey[] = [];

  let circleId: BN;
  let circlePda: PublicKey;
  let vaultPda: PublicKey;
  let collateralVaultPda: PublicKey;

  const circleSeed = Buffer.from("circle");
  const vaultSeed = Buffer.from("vault");
  const roundSeed = Buffer.from("round");
  const memberSeed = Buffer.from("member");
  const userVaultSeed = Buffer.from("user_vault");
  const userVaultAtaSeed = Buffer.from("user_vault_ata");
  const collateralVaultSeed = Buffer.from("collateral_vault");
  const creditSeed = Buffer.from("credit");
  const creditPda = (w: PublicKey) =>
    PublicKey.findProgramAddressSync(
      [creditSeed, w.toBuffer()],
      program.programId
    )[0];

  const roundPda = (n: number) =>
    PublicKey.findProgramAddressSync(
      [roundSeed, circlePda.toBuffer(), Buffer.from([n])],
      program.programId
    )[0];
  const memberPda = (w: PublicKey) =>
    PublicKey.findProgramAddressSync(
      [memberSeed, circlePda.toBuffer(), w.toBuffer()],
      program.programId
    )[0];
  const uvPda = (w: PublicKey) =>
    PublicKey.findProgramAddressSync(
      [userVaultSeed, w.toBuffer()],
      program.programId
    )[0];
  const uvAtaPda = (w: PublicKey) =>
    PublicKey.findProgramAddressSync(
      [userVaultAtaSeed, w.toBuffer()],
      program.programId
    )[0];

  before(async () => {
    usdcMint = await createMint(connection, authority, authority.publicKey, null, 6);

    for (let i = 0; i < MEMBER_COUNT; i++) {
      const m = Keypair.generate();
      members.push(m);
      const sig = await connection.requestAirdrop(m.publicKey, 2 * LAMPORTS_PER_SOL);
      await connection.confirmTransaction(sig);
      const ata = await getOrCreateAssociatedTokenAccount(
        connection,
        authority,
        usdcMint,
        m.publicKey
      );
      memberAtas.push(ata.address);
      // mint extra so position 1/2 can fund collateral too
      await mintTo(
        connection,
        authority,
        usdcMint,
        ata.address,
        authority.publicKey,
        2_000_000_000
      );
      memberVaults.push(uvPda(m.publicKey));
      memberVaultAtas.push(uvAtaPda(m.publicKey));
    }

    circleId = new BN(Date.now() + 1);
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
    [collateralVaultPda] = PublicKey.findProgramAddressSync(
      [collateralVaultSeed, circlePda.toBuffer()],
      program.programId
    );
  });

  it("init vaults & top up", async () => {
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
      await program.methods
        .topUpVault(new BN(1_500_000_000))
        .accounts({
          user: m.publicKey,
          userVault: memberVaults[i],
          userVaultTokenAccount: memberVaultAtas[i],
          userTokenAccount: memberAtas[i],
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([m])
        .rpc();
      await program.methods
        .initCreditProfile()
        .accounts(initCreditProfileAccounts(program.programId, m.publicKey))
        .signers([m])
        .rpc();
    }
  });

  it("creates a circle with risk + reserve enabled", async () => {
    await program.methods
      .createCircle(
        circleId,
        "Risk Circle",
        MEMBER_COUNT,
        TOTAL_ROUNDS,
        CONTRIBUTION,
        ROUND_DURATION,
        false,
        true, // risk_deposit_enabled
        true, // locked_reserve_enabled
        COLLATERAL_RATIO,
        RESERVE_RATIO,
        new BN(0)
      )
      .accounts({
        authority: authority.publicKey,
        circle: circlePda,
        vault: vaultPda,
        collateralVault: collateralVaultPda,
        round: roundPda(1),
        usdcMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();
  });

  it("members join (round 1 not auto-activated until collaterals posted)", async () => {
    for (let i = 0; i < MEMBER_COUNT; i++) {
      const m = members[i];
      await program.methods
        .joinCircle()
        .accounts({
          member: m.publicKey,
          circle: circlePda,
          round: roundPda(1),
          memberStatus: memberPda(m.publicKey),
          systemProgram: SystemProgram.programId,
        })
        .signers([m])
        .rpc();
    }
    const c = await program.account.circle.fetch(circlePda);
    assert.equal(c.round1Activated, false);
  });

  it("position 0 and 1 deposit risk collateral; round 1 then activates", async () => {
    for (const i of [0, 1]) {
      const m = members[i];
      await program.methods
        .depositRiskCollateral()
        .accounts({
          member: m.publicKey,
          circle: circlePda,
          memberStatus: memberPda(m.publicKey),
          memberVault: memberVaults[i],
          memberVaultTokenAccount: memberVaultAtas[i],
          collateralVault: collateralVaultPda,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([m])
        .rpc();
    }

    const fullPayout = BigInt(MEMBER_COUNT) * BigInt(CONTRIBUTION.toString());
    const ms0 = await program.account.memberStatus.fetch(memberPda(members[0].publicKey));
    const ms1 = await program.account.memberStatus.fetch(memberPda(members[1].publicKey));
    assert.equal(ms0.collateralAmount.toString(), fullPayout.toString());
    const expected1 = (fullPayout * 60n) / 100n;
    assert.equal(ms1.collateralAmount.toString(), expected1.toString());

    // Now activate round 1 explicitly
    await program.methods
      .tryActivateRound1()
      .accounts({
        caller: authority.publicKey,
        circle: circlePda,
        round: roundPda(1),
      })
      .rpc();
    const c = await program.account.circle.fetch(circlePda);
    assert.equal(c.round1Activated, true);
  });

  it("runs all rounds; verifies payout/reserve splits", async () => {
    const fullPot = BigInt(MEMBER_COUNT) * BigInt(CONTRIBUTION.toString());
    const baseReserve = (fullPot * BigInt(RESERVE_RATIO)) / 100n;
    const reserves = [baseReserve, (baseReserve * 60n) / 100n, 0n, 0n, 0n];

    for (let r = 1; r <= TOTAL_ROUNDS; r++) {
      const cur = roundPda(r);
      const next = roundPda(r + 1);

      for (let i = 0; i < MEMBER_COUNT; i++) {
        const m = members[i];
        await program.methods
          .deposit()
          .accounts({
            member: m.publicKey,
            circle: circlePda,
            round: cur,
            memberStatus: memberPda(m.publicKey),
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
      const balBefore = (await getAccount(connection, memberVaultAtas[recipientIdx])).amount;

      await program.methods
        .triggerPayout()
        .accounts({
          caller: authority.publicKey,
          circle: circlePda,
          round: cur,
          recipientStatus: memberPda(recipient.publicKey),
          vault: vaultPda,
          collateralVault: collateralVaultPda,
          recipientVault: memberVaults[recipientIdx],
          recipientVaultTokenAccount: memberVaultAtas[recipientIdx],
          nextRound: next,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const balAfter = (await getAccount(connection, memberVaultAtas[recipientIdx])).amount;
      const diff = balAfter - balBefore;
      const expectedPayout = fullPot - reserves[r - 1];
      assert.equal(diff.toString(), expectedPayout.toString(), `round ${r} payout mismatch`);

      const settled = await program.account.round.fetch(cur);
      assert.equal(settled.reserveAmount.toString(), reserves[r - 1].toString());
      assert.equal(settled.payoutAmount.toString(), expectedPayout.toString());

      // For rounds 2..N, unlock reserves for early-position members.
      if (r > 1) {
        for (const i of [0, 1]) {
          const ms = await program.account.memberStatus.fetch(memberPda(members[i].publicKey));
          if (Number(ms.lockedReserveAmount.toString()) === 0) continue;
          const before = (await getAccount(connection, memberVaultAtas[i])).amount;
          await program.methods
            .unlockReserve()
            .accounts({
              caller: authority.publicKey,
              circle: circlePda,
              memberStatus: memberPda(members[i].publicKey),
              collateralVault: collateralVaultPda,
              recipientVaultTokenAccount: memberVaultAtas[i],
              tokenProgram: TOKEN_PROGRAM_ID,
            })
            .rpc();
          const after = (await getAccount(connection, memberVaultAtas[i])).amount;
          assert.isTrue(after > before, `member ${i} should receive unlock in round ${r}`);
        }
      }
    }

    const ms0 = await program.account.memberStatus.fetch(memberPda(members[0].publicKey));
    const ms1 = await program.account.memberStatus.fetch(memberPda(members[1].publicKey));
    assert.equal(ms0.lockedReserveAmount.toString(), "0");
    assert.equal(ms1.lockedReserveAmount.toString(), "0");
    assert.equal(ms0.lockedReserveUnlocksDone, TOTAL_ROUNDS - 1);
    assert.equal(ms1.lockedReserveUnlocksDone, TOTAL_ROUNDS - 1);

    const c = await program.account.circle.fetch(circlePda);
    assert.equal(Object.keys(c.status)[0], "completed");
  });
});
