import { test, expect, fundFromDevnet } from "./fixtures/strict-page";
import { SystemProgram, Transaction, Keypair } from "@solana/web3.js";

/**
 * Real on-chain transaction E2E.
 *
 * Two assertions:
 *   1. The browser-side wallet pipeline works (covered by 02-wallet-connect
 *      which exercises adapter.connect + the in-app code paths reading
 *      wallet.publicKey from React context).
 *   2. The same test keypair can successfully broadcast a real transaction
 *      on devnet — i.e. the keypair is genuinely usable end-to-end. We do
 *      this from Node here (not the browser) because the prod Next bundle
 *      tree-shakes @solana/web3.js entry points and does not expose them
 *      as dynamic-importable modules at runtime; that is intentional and
 *      not something to work around.
 *
 * Roosta-program-specific transactions (create_circle, join_circle, etc.)
 * depend on secrets (RELAYER_SECRET, FAUCET_SECRET, Helius) that may not
 * exist in this environment; those live in 04-circle-lifecycle.spec.ts and
 * are skipped if secrets are missing — explicitly reported, not silently
 * passed.
 */

test.describe("real on-chain transaction (test wallet → devnet)", () => {
  test("signs + broadcasts a 0.0001 SOL transfer", async ({
    testKeypair,
    rpcConnection,
  }) => {
    test.setTimeout(90_000);

    try {
      await fundFromDevnet(rpcConnection, testKeypair.publicKey, 1);
    } catch (e) {
      // Devnet airdrop hit 429 — the keypair may still be funded by a
      // previous run (the e2e/.cache fixture is sticky). Check balance and
      // only skip if truly empty.
      const bal = await rpcConnection.getBalance(testKeypair.publicKey);
      if (bal === 0) test.skip(true, `devnet airdrop failed AND balance is 0: ${(e as Error).message}`);
    }

    const recipient = Keypair.generate().publicKey;
    const { blockhash, lastValidBlockHeight } = await rpcConnection.getLatestBlockhash();
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: testKeypair.publicKey,
        toPubkey: recipient,
        lamports: 1_000_000, // 0.001 SOL — above rent-exempt minimum (~890k)
      }),
    );
    tx.recentBlockhash = blockhash;
    tx.feePayer = testKeypair.publicKey;
    tx.partialSign(testKeypair);

    const sig = await rpcConnection.sendRawTransaction(tx.serialize());
    await rpcConnection.confirmTransaction({
      signature: sig,
      blockhash,
      lastValidBlockHeight,
    });

    expect(sig).toMatch(/^[1-9A-HJ-NP-Za-km-z]{60,}$/);
    const fetched = await rpcConnection.getTransaction(sig, {
      maxSupportedTransactionVersion: 0,
    });
    expect(fetched).not.toBeNull();
    expect(fetched?.meta?.err).toBeNull();

    // Sanity: recipient actually received the lamports.
    const recipientBalance = await rpcConnection.getBalance(recipient);
    expect(recipientBalance).toBe(1_000_000);
  });
});
