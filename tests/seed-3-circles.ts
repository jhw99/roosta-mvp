// Demo seed: creates 3 distinct circles in different lifecycle states on devnet.
// Updated for v2 contract at 3i5GgdaySbxcBB133fp2Nyk9ER66d1fEGyTFCxqdjWqv.
// Run with:
//   ANCHOR_PROVIDER_URL=https://api.devnet.solana.com \
//   ANCHOR_WALLET=$HOME/.config/solana/id.json \
//   npx tsx tests/seed-3-circles.ts

import * as anchor from "@coral-xyz/anchor";
import {
  PublicKey,
  Keypair,
  SystemProgram,
  LAMPORTS_PER_SOL,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getOrCreateAssociatedTokenAccount,
  getAssociatedTokenAddressSync,
  mintTo,
} from "@solana/spl-token";
import fs from "fs";
import path from "path";

const PROGRAM_ID = new PublicKey("3i5GgdaySbxcBB133fp2Nyk9ER66d1fEGyTFCxqdjWqv");
const USDC_MINT = new PublicKey("EVfLhS7j4nbC4Ln1VpVh7fHJruwWqZUUEE1tHNuYFkDu");

const ROUND_DURATION = new anchor.BN(7 * 24 * 60 * 60);
const GRACE_PERIOD = new anchor.BN(3 * 24 * 60 * 60);
const FUND_SOL = 0.05;

function loadIdl() {
  return JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "..", "target", "idl", "roosta.json"),
      "utf-8"
    )
  );
}

const u64Le = (n: anchor.BN) => n.toArrayLike(Buffer, "le", 8);
const u8Le = (n: number) => Buffer.from([n]);

interface CircleConfig {
  name: string;
  memberCount: number;
  totalRounds: number;
  contributionUsdc: number;
  state: "forming" | "midflight" | "completed";
  joinedCount?: number;
  completedRounds?: number;
  extraDeposits?: number;
}

const CIRCLES: CircleConfig[] = [
  {
    name: "Seoul Builders",
    memberCount: 5,
    totalRounds: 5,
    contributionUsdc: 100,
    state: "forming",
    joinedCount: 2,
  },
  {
    name: "NYC Saturday Coffee",
    memberCount: 4,
    totalRounds: 4,
    contributionUsdc: 50,
    state: "midflight",
    completedRounds: 1,
    extraDeposits: 2,
  },
  {
    name: "Lagos Devs Quarterly",
    memberCount: 3,
    totalRounds: 3,
    contributionUsdc: 200,
    state: "completed",
  },
];

type Program = anchor.Program;

async function fundLamports(
  provider: anchor.AnchorProvider,
  authority: Keypair,
  to: PublicKey
) {
  const tx = new anchor.web3.Transaction().add(
    SystemProgram.transfer({
      fromPubkey: authority.publicKey,
      toPubkey: to,
      lamports: FUND_SOL * LAMPORTS_PER_SOL,
    })
  );
  await provider.sendAndConfirm(tx, [authority]);
}

async function initCreditProfile(
  program: Program,
  member: Keypair
) {
  const [creditProfile] = PublicKey.findProgramAddressSync(
    [Buffer.from("credit"), member.publicKey.toBuffer()],
    PROGRAM_ID
  );
  const [sbtMint] = PublicKey.findProgramAddressSync(
    [Buffer.from("credit_sbt"), member.publicKey.toBuffer()],
    PROGRAM_ID
  );
  const [sbtAuthority] = PublicKey.findProgramAddressSync(
    [Buffer.from("sbt_authority")],
    PROGRAM_ID
  );
  const sbtTokenAccount = getAssociatedTokenAddressSync(
    sbtMint,
    member.publicKey,
    true,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  await program.methods
    .initCreditProfile()
    .accounts({
      wallet: member.publicKey,
      creditProfile,
      sbtMint,
      sbtTokenAccount,
      sbtAuthority,
      token2022Program: TOKEN_2022_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
    } as never)
    .signers([member])
    .rpc();

  return creditProfile;
}

async function setupMember(
  provider: anchor.AnchorProvider,
  program: Program,
  authority: Keypair,
  member: Keypair,
  contributionLamports: anchor.BN,
  rounds: number
) {
  await fundLamports(provider, authority, member.publicKey);

  const ata = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    authority,
    USDC_MINT,
    member.publicKey
  );
  const mintAmount = BigInt(contributionLamports.toString()) * BigInt(rounds + 1);
  await mintTo(
    provider.connection,
    authority,
    USDC_MINT,
    ata.address,
    authority,
    mintAmount
  );

  const [userVault] = PublicKey.findProgramAddressSync(
    [Buffer.from("user_vault"), member.publicKey.toBuffer()],
    PROGRAM_ID
  );
  const [userVaultAta] = PublicKey.findProgramAddressSync(
    [Buffer.from("user_vault_ata"), member.publicKey.toBuffer()],
    PROGRAM_ID
  );

  await program.methods
    .initUserVault()
    .accounts({
      user: member.publicKey,
      userVault,
      userVaultTokenAccount: userVaultAta,
      usdcMint: USDC_MINT,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
    } as never)
    .signers([member])
    .rpc();

  const topUp = contributionLamports.mul(new anchor.BN(rounds));
  await program.methods
    .topUpVault(topUp)
    .accounts({
      user: member.publicKey,
      userVault,
      userVaultTokenAccount: userVaultAta,
      userTokenAccount: ata.address,
      tokenProgram: TOKEN_PROGRAM_ID,
    } as never)
    .signers([member])
    .rpc();

  // Initialize credit profile (required before deposit_contribution)
  const creditProfile = await initCreditProfile(program, member);

  return { userVault, userVaultAta, mainAta: ata.address, creditProfile };
}

async function seedCircle(
  provider: anchor.AnchorProvider,
  program: Program,
  authority: Keypair,
  cfg: CircleConfig
) {
  const contribution = new anchor.BN(cfg.contributionUsdc * 1_000_000);
  const members = Array.from({ length: cfg.memberCount }, () =>
    Keypair.generate()
  );

  console.log(`\n=== ${cfg.name} (${cfg.state}) ===`);

  const joinTarget =
    cfg.state === "forming" ? cfg.joinedCount ?? cfg.memberCount : cfg.memberCount;

  const memberInfos: {
    uv: PublicKey;
    uvAta: PublicKey;
    creditProfile: PublicKey;
  }[] = [];
  for (let i = 0; i < joinTarget; i++) {
    const info = await setupMember(
      provider,
      program,
      authority,
      members[i],
      contribution,
      cfg.totalRounds
    );
    memberInfos.push({
      uv: info.userVault,
      uvAta: info.userVaultAta,
      creditProfile: info.creditProfile,
    });
  }

  const circleId = new anchor.BN(Date.now() + Math.floor(Math.random() * 1000));
  const [circlePda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("circle"),
      members[0].publicKey.toBuffer(),
      u64Le(circleId),
    ],
    PROGRAM_ID
  );
  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), circlePda.toBuffer()],
    PROGRAM_ID
  );
  const [collateralVaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("collateral_vault"), circlePda.toBuffer()],
    PROGRAM_ID
  );
  const [round1Pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("round"), circlePda.toBuffer(), u8Le(1)],
    PROGRAM_ID
  );

  console.log(`Creating circle ${circlePda.toBase58()}`);
  await program.methods
    .createCircle(
      circleId,
      cfg.name,
      cfg.memberCount,
      cfg.totalRounds,
      contribution,
      ROUND_DURATION,
      false, // trustGateEnabled
      false, // riskDepositEnabled
      false, // lockedReserveEnabled
      0, // earlyPositionCollateralRatio
      0, // lockedReserveRatio
      GRACE_PERIOD
    )
    .accounts({
      authority: members[0].publicKey,
      circle: circlePda,
      vault: vaultPda,
      collateralVault: collateralVaultPda,
      round: round1Pda,
      usdcMint: USDC_MINT,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
    } as never)
    .signers([members[0]])
    .rpc();

  // Join
  for (let i = 0; i < joinTarget; i++) {
    const m = members[i];
    const [memberStatus] = PublicKey.findProgramAddressSync(
      [Buffer.from("member"), circlePda.toBuffer(), m.publicKey.toBuffer()],
      PROGRAM_ID
    );
    await program.methods
      .joinCircle()
      .accounts({
        member: m.publicKey,
        circle: circlePda,
        round: round1Pda,
        memberStatus,
        systemProgram: SystemProgram.programId,
      } as never)
      .signers([m])
      .rpc();
    console.log(`  joined: ${m.publicKey.toBase58()}`);
  }

  // TODO: mint_position_nft skipped in seed; tested via UI
  // Note: riskDepositEnabled=false so round 1 auto-activates after final join.

  if (cfg.state === "forming") {
    console.log(`  -> Forming. ${joinTarget}/${cfg.memberCount} joined.`);
    return circlePda;
  }

  async function runRound(r: number, settle: boolean) {
    const [roundPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("round"), circlePda.toBuffer(), u8Le(r)],
      PROGRAM_ID
    );
    const [nextRoundPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("round"), circlePda.toBuffer(), u8Le(r + 1)],
      PROGRAM_ID
    );

    for (let i = 0; i < cfg.memberCount; i++) {
      const m = members[i];
      const [memberStatus] = PublicKey.findProgramAddressSync(
        [Buffer.from("member"), circlePda.toBuffer(), m.publicKey.toBuffer()],
        PROGRAM_ID
      );
      await program.methods
        .deposit()
        .accounts({
          member: m.publicKey,
          circle: circlePda,
          round: roundPda,
          memberStatus,
          memberVault: memberInfos[i].uv,
          memberVaultTokenAccount: memberInfos[i].uvAta,
          vault: vaultPda,
          creditProfile: memberInfos[i].creditProfile,
          tokenProgram: TOKEN_PROGRAM_ID,
        } as never)
        .signers([m])
        .rpc();
    }

    if (!settle) return;

    const recipientIdx = r - 1;
    const recipient = members[recipientIdx].publicKey;
    const [recipientStatus] = PublicKey.findProgramAddressSync(
      [Buffer.from("member"), circlePda.toBuffer(), recipient.toBuffer()],
      PROGRAM_ID
    );
    await program.methods
      .triggerPayout()
      .accounts({
        caller: authority.publicKey,
        circle: circlePda,
        round: roundPda,
        recipientStatus,
        vault: vaultPda,
        collateralVault: collateralVaultPda,
        recipientVault: memberInfos[recipientIdx].uv,
        recipientVaultTokenAccount: memberInfos[recipientIdx].uvAta,
        nextRound: nextRoundPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      } as never)
      .rpc();
    console.log(`  round ${r} settled -> ${recipient.toBase58()}`);
  }

  if (cfg.state === "completed") {
    for (let r = 1; r <= cfg.totalRounds; r++) {
      await runRound(r, true);
    }
  } else if (cfg.state === "midflight") {
    const completed = cfg.completedRounds ?? 1;
    for (let r = 1; r <= completed; r++) {
      await runRound(r, true);
    }
    const r = completed + 1;
    const [roundPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("round"), circlePda.toBuffer(), u8Le(r)],
      PROGRAM_ID
    );
    const partial = cfg.extraDeposits ?? 1;
    for (let i = 0; i < partial; i++) {
      const m = members[i];
      const [memberStatus] = PublicKey.findProgramAddressSync(
        [Buffer.from("member"), circlePda.toBuffer(), m.publicKey.toBuffer()],
        PROGRAM_ID
      );
      await program.methods
        .deposit()
        .accounts({
          member: m.publicKey,
          circle: circlePda,
          round: roundPda,
          memberStatus,
          memberVault: memberInfos[i].uv,
          memberVaultTokenAccount: memberInfos[i].uvAta,
          vault: vaultPda,
          creditProfile: memberInfos[i].creditProfile,
          tokenProgram: TOKEN_PROGRAM_ID,
        } as never)
        .signers([m])
        .rpc();
    }
    console.log(`  -> mid-flight at round ${r} (${partial}/${cfg.memberCount} deposits)`);
  }

  return circlePda;
}

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const idl = loadIdl();
  const program = new anchor.Program(idl, provider);
  const authority = (provider.wallet as anchor.Wallet).payer;

  console.log("Authority:", authority.publicKey.toBase58());

  const created: { name: string; pk: PublicKey }[] = [];
  for (const cfg of CIRCLES) {
    const pk = await seedCircle(provider, program, authority, cfg);
    created.push({ name: cfg.name, pk });
  }

  console.log("\n=== Seed complete ===");
  for (const c of created) {
    console.log(
      `  ${c.name}: https://explorer.solana.com/address/${c.pk.toBase58()}?cluster=devnet`
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
