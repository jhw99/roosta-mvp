/**
 * F-005 regression: Trust Gate is enforced OFF-CHAIN only.
 *
 * The frontend gates `join_circle` calls behind a Helius-backed trust check
 * (POST /api/trust-gate). The on-chain handler at programs/roosta/src/
 * instructions/join_circle.rs does NOT re-verify trust_tier from the
 * member's CreditProfile — it only checks circle.status == Active, not
 * full, and not already joined.
 *
 * This test demonstrates that a freshly-generated wallet (no credit
 * profile, no Helius history → would be rejected by the off-chain gate)
 * can still call `joinCircle` directly via the Anchor SDK and succeed.
 * It is a SECURITY FINDING, not a correctness test of the program — it
 * exists so any future change that DOES enforce on-chain trust will trip
 * this test and force a docs/spec update at the same time.
 *
 * If/when the program adds an on-chain Tier check, flip the expectation
 * from "join should succeed" to "join should fail with TrustGateRejected".
 */
import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import {
  PublicKey,
  Keypair,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { assert } from "chai";

describe("F-005 — Trust Gate on-chain bypass (security finding)", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const program = anchor.workspace.Roosta as Program<any>;
  const connection = provider.connection;
  const authority = (provider.wallet as anchor.Wallet).payer;

  const CIRCLE_SEED = Buffer.from("circle");
  const ROUND_SEED = Buffer.from("round");
  const VAULT_SEED = Buffer.from("vault");
  const MEMBER_SEED = Buffer.from("member");
  const COLLATERAL_VAULT_SEED = Buffer.from("collateral_vault");

  it("a Tier 0 wallet that bypasses the off-chain trust gate can still join via direct RPC", async () => {
    // 1. Build a 5-member Active circle with the project authority.
    const circleId = new BN(Date.now() & 0xffffffff); // unique-ish id
    const [circlePda] = PublicKey.findProgramAddressSync(
      [CIRCLE_SEED, authority.publicKey.toBuffer(), circleId.toBuffer("le", 8)],
      program.programId,
    );
    const [vaultPda] = PublicKey.findProgramAddressSync(
      [VAULT_SEED, circlePda.toBuffer()],
      program.programId,
    );
    const [collateralVaultPda] = PublicKey.findProgramAddressSync(
      [COLLATERAL_VAULT_SEED, circlePda.toBuffer()],
      program.programId,
    );
    const [round1Pda] = PublicKey.findProgramAddressSync(
      [ROUND_SEED, circlePda.toBuffer(), Buffer.from([1])],
      program.programId,
    );

    // Minimal mint for the circle's USDC vault.
    const usdcMint = await (await import("@solana/spl-token")).createMint(
      connection,
      authority,
      authority.publicKey,
      null,
      6,
    );

    await program.methods
      .createCircle(
        circleId,
        "f005-bypass",
        5, // member_count
        5, // total_rounds
        new BN(100_000_000),
        new BN(60 * 60 * 24 * 7),
        false, // trust_gate_enabled (this flag is informational; on-chain join still doesn't check tier)
        false,
        false,
        0,
        0,
        new BN(60 * 60),
      )
      .accounts({
        authority: authority.publicKey,
        circle: circlePda,
        vault: vaultPda,
        collateralVault: collateralVaultPda,
        round: round1Pda,
        usdcMint,
        tokenProgram: (await import("@solana/spl-token")).TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    // 2. Brand-new wallet — no credit profile, no Helius history. This is
    //    exactly the wallet shape that /api/trust-gate would reject.
    const attacker = Keypair.generate();
    const airdrop = await connection.requestAirdrop(
      attacker.publicKey,
      2 * LAMPORTS_PER_SOL,
    );
    await connection.confirmTransaction(airdrop);

    const [attackerMemberStatus] = PublicKey.findProgramAddressSync(
      [MEMBER_SEED, circlePda.toBuffer(), attacker.publicKey.toBuffer()],
      program.programId,
    );

    // 3. Attacker calls joinCircle directly via Anchor SDK — no Trust Gate.
    //    Currently this SUCCEEDS, which is the F-005 security finding.
    await program.methods
      .joinCircle()
      .accounts({
        member: attacker.publicKey,
        circle: circlePda,
        round: round1Pda,
        memberStatus: attackerMemberStatus,
        systemProgram: SystemProgram.programId,
      })
      .signers([attacker])
      .rpc();

    // 4. Confirm join succeeded on chain — this assertion FAILING in the
    //    future means an on-chain Tier check was added; update the spec
    //    and flip this test to expect rejection.
    const circleAcc = (await program.account.circle.fetch(
      circlePda,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    )) as any;
    const memberKeys = (circleAcc.members as PublicKey[]).map((p) => p.toBase58());
    assert.include(
      memberKeys,
      attacker.publicKey.toBase58(),
      "BYPASS REGRESSION: attacker wallet should currently be in circle.members; if this assertion fails, the program now enforces on-chain Tier — please update the spec.",
    );
  });
});
