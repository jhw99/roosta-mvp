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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("roosta v3 default + slash flow", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Roosta as Program<any>;
  const connection = provider.connection;
  const authority = (provider.wallet as anchor.Wallet).payer;

  const MEMBER_COUNT = 5;
  const TOTAL_ROUNDS = 5;
  const CONTRIBUTION = new BN(100_000_000); // 100 USDC
  const ROUND_DURATION = new BN(3);
  const GRACE = new BN(3);
  const COLLATERAL_RATIO = 100;
  const RESERVE_RATIO = 50;

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
  const creditPda = (w: PublicKey) =>
    PublicKey.findProgramAddressSync(
      [creditSeed, w.toBuffer()],
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

    circleId = new BN(Date.now() + 7777);
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

  it("setup vaults, credit profiles, circle, members, collaterals, activate", async () => {
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

    await program.methods
      .createCircle(
        circleId,
        "Default Circle",
        MEMBER_COUNT,
        TOTAL_ROUNDS,
        CONTRIBUTION,
        ROUND_DURATION,
        false,
        true,
        true,
        COLLATERAL_RATIO,
        RESERVE_RATIO,
        GRACE
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

    await program.methods
      .tryActivateRound1()
      .accounts({
        caller: authority.publicKey,
        circle: circlePda,
        round: roundPda(1),
      })
      .rpc();
  });

  it("members 0,2,3,4 deposit; member 1 misses; mark delayed → default → slash → settle", async () => {
    // Members 0,2,3,4 deposit (member 1 with collateral skips)
    for (const i of [0, 2, 3, 4]) {
      const m = members[i];
      await program.methods
        .deposit()
        .accounts({
          member: m.publicKey,
          circle: circlePda,
          round: roundPda(1),
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

    // Wait past deadline
    await sleep((ROUND_DURATION.toNumber() + 1) * 1000);

    await program.methods
      .markDelayed()
      .accounts({
        caller: authority.publicKey,
        circle: circlePda,
        round: roundPda(1),
      })
      .rpc();

    let r = await program.account.round.fetch(roundPda(1));
    assert.equal(Object.keys(r.status)[0], "delayed");
    assert.notEqual(r.delayedAt.toString(), "0");

    // Mark member 1 delayed
    await program.methods
      .markMemberDelayed()
      .accounts({
        caller: authority.publicKey,
        circle: circlePda,
        round: roundPda(1),
        memberStatus: memberPda(members[1].publicKey),
        creditProfile: creditPda(members[1].publicKey),
      })
      .rpc();

    let ms1 = await program.account.memberStatus.fetch(memberPda(members[1].publicKey));
    assert.equal(Object.keys(ms1.statusEnum)[0], "delayed");
    assert.equal(ms1.missedCount, 1);
    assert.equal(ms1.lastDelayedRound, 1);

    let cp1 = await program.account.creditProfile.fetch(creditPda(members[1].publicKey));
    assert.equal(cp1.latePayments, 1);

    // Wait past grace
    await sleep((GRACE.toNumber() + 1) * 1000);

    await program.methods
      .markDefault()
      .accounts({
        caller: authority.publicKey,
        circle: circlePda,
        round: roundPda(1),
        memberStatus: memberPda(members[1].publicKey),
        creditProfile: creditPda(members[1].publicKey),
      })
      .rpc();

    ms1 = await program.account.memberStatus.fetch(memberPda(members[1].publicKey));
    assert.equal(Object.keys(ms1.statusEnum)[0], "defaulted");
    assert.equal(ms1.defaultCount, 1);

    cp1 = await program.account.creditProfile.fetch(creditPda(members[1].publicKey));
    assert.equal(cp1.defaults, 1);

    // Slash
    const collateralBefore = ms1.collateralAmount.toString();
    assert.notEqual(collateralBefore, "0");

    await program.methods
      .slashCollateral()
      .accounts({
        caller: authority.publicKey,
        circle: circlePda,
        round: roundPda(1),
        memberStatus: memberPda(members[1].publicKey),
        collateralVault: collateralVaultPda,
        vault: vaultPda,
        creditProfile: creditPda(members[1].publicKey),
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    ms1 = await program.account.memberStatus.fetch(memberPda(members[1].publicKey));
    assert.equal(Object.keys(ms1.statusEnum)[0], "slashed");
    assert.equal(ms1.slashed, true);
    assert.equal(ms1.collateralAmount.toString(), "0");
    assert.equal(ms1.lockedReserveAmount.toString(), "0");

    cp1 = await program.account.creditProfile.fetch(creditPda(members[1].publicKey));
    assert.equal(Object.keys(cp1.trustTier)[0], "tier0New");

    r = await program.account.round.fetch(roundPda(1));
    assert.equal(r.depositsCount, MEMBER_COUNT);
    assert.equal(r.deposits.length, MEMBER_COUNT);

    // Trigger payout (status is Delayed but deposits met)
    const recipient = members[0];
    const balBefore = (await getAccount(connection, memberVaultAtas[0])).amount;

    await program.methods
      .triggerPayout()
      .accounts({
        caller: authority.publicKey,
        circle: circlePda,
        round: roundPda(1),
        recipientStatus: memberPda(recipient.publicKey),
        vault: vaultPda,
        collateralVault: collateralVaultPda,
        recipientVault: memberVaults[0],
        recipientVaultTokenAccount: memberVaultAtas[0],
        nextRound: roundPda(2),
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const balAfter = (await getAccount(connection, memberVaultAtas[0])).amount;
    assert.isTrue(balAfter > balBefore);

    const settled = await program.account.round.fetch(roundPda(1));
    assert.equal(Object.keys(settled.status)[0], "settled");
  });
});
