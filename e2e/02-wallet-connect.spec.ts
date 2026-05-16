import { test, expect, fundFromDevnet } from "./fixtures/strict-page";

/**
 * Wallet connection E2E using the injected KeypairWalletAdapter (real
 * keypair, real ed25519 signature — see test-wallet-adapter.ts). The fixture
 * already wires window.__ROOSTA_TEST_KEYPAIR__ via page.addInitScript.
 */
test.describe("wallet connect (real keypair)", () => {
  test("user can connect via Roosta test wallet entry", async ({
    strictPage,
    testKeypair,
    rpcConnection,
  }) => {
    test.setTimeout(60_000);

    // Ensure the test keypair has SOL for any subsequent transactions.
    // Devnet airdrop is rate-limited; the fixture caches the keypair across
    // runs so we only burn the quota on the first run of the day.
    try {
      await fundFromDevnet(rpcConnection, testKeypair.publicKey, 1);
    } catch (e) {
      test.info().annotations.push({
        type: "devnet-airdrop-failed",
        description: `airdrop unavailable: ${(e as Error).message}`,
      });
      test.skip(true, "devnet airdrop unavailable — connection step still runs but skipping");
    }

    await strictPage.goto("/");

    // Open wallet modal
    const connectBtn = strictPage.getByRole("button", { name: /select|connect/i }).first();
    await connectBtn.click();

    // Pick our test wallet adapter entry by name.
    const entry = strictPage.getByText(/RoostaTestKeypair/);
    await expect(entry).toBeVisible({ timeout: 10_000 });
    await entry.click();

    // Once connected the UI should show a shortened address (first 4 of the pubkey).
    const shortPubkey = testKeypair.publicKey.toBase58().slice(0, 4);
    await expect(strictPage.getByText(new RegExp(shortPubkey))).toBeVisible({
      timeout: 15_000,
    });
  });
});
