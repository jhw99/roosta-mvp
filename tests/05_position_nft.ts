import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import {
  PublicKey,
  Keypair,
  SystemProgram,
  LAMPORTS_PER_SOL,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  getAssociatedTokenAddressSync,
  getAccount,
  AccountState,
} from "@solana/spl-token";
import { assert } from "chai";
import { initCreditProfileAccounts } from "./sbt-helpers";

const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

describe("position_nft", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Roosta as Program<any>;
  const connection = provider.connection;
  const authority = (provider.wallet as anchor.Wallet).payer;

  const MEMBER_COUNT = 5;
  const TOTAL_ROUNDS = 5;
  const CONTRIBUTION = new BN(100_000_000);
  const ROUND_DURATION = new BN(60 * 60 * 24 * 7);

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
  const positionAuthoritySeed = Buffer.from("position_authority");

  function pda(seeds: (Buffer | Uint8Array)[]): PublicKey {
    return PublicKey.findProgramAddressSync(seeds, program.programId)[0];
  }

  function metadataPda(mint: PublicKey): PublicKey {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    )[0];
  }

  function masterEditionPda(mint: PublicKey): PublicKey {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
        Buffer.from("edition"),
      ],
      TOKEN_METADATA_PROGRAM_ID
    )[0];
  }

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
      await mintTo(connection, authority, usdcMint, ata.address, authority.publicKey, 1_000_000_000);

      memberVaults.push(pda([userVaultSeed, m.publicKey.toBuffer()]));
      memberVaultAtas.push(pda([userVaultAtaSeed, m.publicKey.toBuffer()]));
    }

    circleId = new BN(Date.now() + 12345);
    circlePda = pda([circleSeed, authority.publicKey.toBuffer(), circleId.toArrayLike(Buffer, "le", 8)]);
    vaultPda = pda([vaultSeed, circlePda.toBuffer()]);
    collateralVaultPda = pda([collateralVaultSeed, circlePda.toBuffer()]);
  });

  it("sets up vaults, credit profiles, creates circle, joins members and mints position NFTs", async () => {
    // init vaults + top up + credit profile
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
          rent: SYSVAR_RENT_PUBKEY,
        })
        .signers([m])
        .rpc();

      await program.methods
        .topUpVault(new BN(600_000_000))
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

    // create circle
    const round1 = pda([roundSeed, circlePda.toBuffer(), Buffer.from([1])]);
    await program.methods
      .createCircle(
        circleId,
        "NFT Circle",
        MEMBER_COUNT,
        TOTAL_ROUNDS,
        CONTRIBUTION,
        ROUND_DURATION,
        false,
        false,
        false,
        0,
        0,
        new BN(0)
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
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    const positionAuthority = pda([positionAuthoritySeed, circlePda.toBuffer()]);

    let firstMintSig = "";

    // join + mint NFT for each member
    for (let i = 0; i < MEMBER_COUNT; i++) {
      const m = members[i];
      const ms = pda([memberSeed, circlePda.toBuffer(), m.publicKey.toBuffer()]);

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

      const positionMint = Keypair.generate();
      const ata = getAssociatedTokenAddressSync(positionMint.publicKey, m.publicKey);
      const meta = metadataPda(positionMint.publicKey);
      const masterEd = masterEditionPda(positionMint.publicKey);

      const sig = await program.methods
        .mintPositionNft()
        .accounts({
          member: m.publicKey,
          circle: circlePda,
          memberStatus: ms,
          positionAuthority,
          positionMint: positionMint.publicKey,
          positionTokenAccount: ata,
          metadata: meta,
          masterEdition: masterEd,
          tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .signers([m, positionMint])
        .rpc();

      if (i === 0) firstMintSig = sig;

      // Verify member_status updated.
      const msAcc = await program.account.memberStatus.fetch(ms);
      assert.equal(msAcc.positionNftMint.toBase58(), positionMint.publicKey.toBase58());

      // Verify token account holds 1 token and is frozen.
      const tokenAcc = await getAccount(connection, ata);
      assert.equal(tokenAcc.amount.toString(), "1");
      assert.isTrue(tokenAcc.isFrozen, "position token account should be frozen");

      // Verify metadata account exists.
      const metaInfo = await connection.getAccountInfo(meta);
      assert.isNotNull(metaInfo);
      assert.equal(metaInfo!.owner.toBase58(), TOKEN_METADATA_PROGRAM_ID.toBase58());

      // Verify master edition exists.
      const meInfo = await connection.getAccountInfo(masterEd);
      assert.isNotNull(meInfo);
    }

    console.log("First Position NFT mint signature:", firstMintSig);
  });

  it("rejects double-mint of position NFT for same member", async () => {
    const m = members[0];
    const ms = pda([memberSeed, circlePda.toBuffer(), m.publicKey.toBuffer()]);
    const positionAuthority = pda([positionAuthoritySeed, circlePda.toBuffer()]);
    const positionMint = Keypair.generate();
    const ata = getAssociatedTokenAddressSync(positionMint.publicKey, m.publicKey);

    let threw = false;
    try {
      await program.methods
        .mintPositionNft()
        .accounts({
          member: m.publicKey,
          circle: circlePda,
          memberStatus: ms,
          positionAuthority,
          positionMint: positionMint.publicKey,
          positionTokenAccount: ata,
          metadata: metadataPda(positionMint.publicKey),
          masterEdition: masterEditionPda(positionMint.publicKey),
          tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .signers([m, positionMint])
        .rpc();
    } catch (e: any) {
      threw = true;
      assert.match(e.toString(), /PositionNftAlreadyMinted/);
    }
    assert.isTrue(threw, "expected PositionNftAlreadyMinted error");
  });
});
