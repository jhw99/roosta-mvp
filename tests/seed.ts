// Demo seed: spins up a 5-member, 5-round circle on devnet using the deployed
// program + mock USDC mint. Run with: ANCHOR_PROVIDER_URL=https://api.devnet.solana.com \
//   ANCHOR_WALLET=~/.config/solana/id.json npx ts-node tests/seed.ts
import * as anchor from "@coral-xyz/anchor";
import {
  PublicKey,
  Keypair,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  getAccount,
} from "@solana/spl-token";
import fs from "fs";
import path from "path";

const PROGRAM_ID = new PublicKey("3i5GgdaySbxcBB133fp2Nyk9ER66d1fEGyTFCxqdjWqv");
const USDC_MINT = new PublicKey("EVfLhS7j4nbC4Ln1VpVh7fHJruwWqZUUEE1tHNuYFkDu");
const MEMBER_COUNT = 5;
const CONTRIBUTION = new anchor.BN(100_000_000); // 100 mock USDC
const ROUND_DURATION = new anchor.BN(7 * 24 * 60 * 60);

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

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const idl = loadIdl();
  const program = new anchor.Program(idl, provider);

  const authority = (provider.wallet as anchor.Wallet).payer;
  console.log("Authority:", authority.publicKey.toBase58());

  const members: Keypair[] = Array.from({ length: MEMBER_COUNT }, () => Keypair.generate());
  console.log("Funding members with 0.05 SOL each...");
  for (const m of members) {
    const tx = new anchor.web3.Transaction().add(
      SystemProgram.transfer({
        fromPubkey: authority.publicKey,
        toPubkey: m.publicKey,
        lamports: 0.05 * LAMPORTS_PER_SOL,
      })
    );
    await provider.sendAndConfirm(tx, [authority]);
  }

  console.log("Minting 1000 mock USDC to each member...");
  const memberAtas: PublicKey[] = [];
  for (const m of members) {
    const ata = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      authority,
      USDC_MINT,
      m.publicKey
    );
    await mintTo(provider.connection, authority, USDC_MINT, ata.address, authority, BigInt(1_000_000_000));
    memberAtas.push(ata.address);
  }

  // Compute user vault PDAs and init + top up each.
  const memberVaults: PublicKey[] = [];
  const memberVaultAtas: PublicKey[] = [];
  for (let i = 0; i < MEMBER_COUNT; i++) {
    const m = members[i];
    const [uv] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_vault"), m.publicKey.toBuffer()],
      PROGRAM_ID
    );
    const [uvAta] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_vault_ata"), m.publicKey.toBuffer()],
      PROGRAM_ID
    );
    memberVaults.push(uv);
    memberVaultAtas.push(uvAta);

    console.log(`Init user vault for member ${i}: ${m.publicKey.toBase58()}`);
    await program.methods
      .initUserVault()
      .accounts({
        user: m.publicKey,
        userVault: uv,
        userVaultTokenAccount: uvAta,
        usdcMint: USDC_MINT,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      } as never)
      .signers([m])
      .rpc();

    console.log(`Top up vault for member ${i}: 600 USDC`);
    await program.methods
      .topUpVault(new anchor.BN(600_000_000))
      .accounts({
        user: m.publicKey,
        userVault: uv,
        userVaultTokenAccount: uvAta,
        userTokenAccount: memberAtas[i],
        tokenProgram: TOKEN_PROGRAM_ID,
      } as never)
      .signers([m])
      .rpc();
  }

  // create_circle by members[0]
  const circleId = new anchor.BN(Date.now());
  const [circlePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("circle"), members[0].publicKey.toBuffer(), u64Le(circleId)],
    PROGRAM_ID
  );
  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), circlePda.toBuffer()],
    PROGRAM_ID
  );
  const [round1Pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("round"), circlePda.toBuffer(), u8Le(1)],
    PROGRAM_ID
  );

  console.log("Creating circle:", circlePda.toBase58());
  await program.methods
    .createCircle(
      circleId,
      "Demo Builders Circle",
      MEMBER_COUNT,
      MEMBER_COUNT,
      CONTRIBUTION,
      ROUND_DURATION
    )
    .accounts({
      authority: members[0].publicKey,
      circle: circlePda,
      vault: vaultPda,
      round: round1Pda,
      usdcMint: USDC_MINT,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    } as never)
    .signers([members[0]])
    .rpc();

  for (let i = 0; i < MEMBER_COUNT; i++) {
    const m = members[i];
    const [memberPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("member"), circlePda.toBuffer(), m.publicKey.toBuffer()],
      PROGRAM_ID
    );
    console.log(`Member ${i} joining: ${m.publicKey.toBase58()}`);
    await program.methods
      .joinCircle()
      .accounts({
        member: m.publicKey,
        circle: circlePda,
        round: round1Pda,
        memberStatus: memberPda,
        systemProgram: SystemProgram.programId,
      } as never)
      .signers([m])
      .rpc();
  }

  for (let r = 1; r <= MEMBER_COUNT; r++) {
    const [roundPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("round"), circlePda.toBuffer(), u8Le(r)],
      PROGRAM_ID
    );
    const [nextRoundPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("round"), circlePda.toBuffer(), u8Le(r + 1)],
      PROGRAM_ID
    );

    for (let i = 0; i < MEMBER_COUNT; i++) {
      const m = members[i];
      const [memberPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("member"), circlePda.toBuffer(), m.publicKey.toBuffer()],
        PROGRAM_ID
      );
      console.log(`Round ${r}: member ${i} depositing from vault...`);
      await program.methods
        .deposit()
        .accounts({
          member: m.publicKey,
          circle: circlePda,
          round: roundPda,
          memberStatus: memberPda,
          memberVault: memberVaults[i],
          memberVaultTokenAccount: memberVaultAtas[i],
          vault: vaultPda,
          tokenProgram: TOKEN_PROGRAM_ID,
        } as never)
        .signers([m])
        .rpc();
    }

    const recipientIdx = r - 1;
    const recipient = members[recipientIdx].publicKey;
    const [recipientStatus] = PublicKey.findProgramAddressSync(
      [Buffer.from("member"), circlePda.toBuffer(), recipient.toBuffer()],
      PROGRAM_ID
    );
    console.log(`Round ${r}: payout to vault of ${recipient.toBase58()}`);
    await program.methods
      .triggerPayout()
      .accounts({
        caller: authority.publicKey,
        circle: circlePda,
        round: roundPda,
        recipientStatus,
        vault: vaultPda,
        recipientVault: memberVaults[recipientIdx],
        recipientVaultTokenAccount: memberVaultAtas[recipientIdx],
        nextRound: nextRoundPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      } as never)
      .rpc();
  }

  console.log("\nSeed complete.");
  console.log("Circle:", circlePda.toBase58());

  // Final balances
  const circleVault = await getAccount(provider.connection, vaultPda);
  console.log(`Circle vault PDA balance: ${circleVault.amount.toString()}`);
  for (let i = 0; i < MEMBER_COUNT; i++) {
    const bal = (await getAccount(provider.connection, memberVaultAtas[i])).amount;
    console.log(`Member ${i} vault balance: ${bal.toString()}  (${members[i].publicKey.toBase58()})`);
  }
  console.log("Explorer:", `https://explorer.solana.com/address/${circlePda.toBase58()}?cluster=devnet`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
