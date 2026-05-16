/**
 * RQ-WALLET-01 / RQ-WALLET-02 — wallet connect/disconnect/reconnect UX.
 *
 * The Solana wallet-adapter exposes connect/disconnect through the
 * KeypairWalletAdapter wrapper we register in non-prod builds. We exercise
 * a full connect → disconnect → reconnect cycle and assert the UI
 * reflects each transition cleanly (no stale shortened addresses, no
 * console errors).
 */
import { test, expect } from "./fixtures/strict-page";

test.describe("RQ-WALLET-01 / RQ-WALLET-02 — connect lifecycle", () => {
  test("connect → disconnect → reconnect leaves no stale state", async ({
    strictPage,
    testKeypair,
  }) => {
    test.setTimeout(60_000);
    const short = testKeypair.publicKey.toBase58().slice(0, 4);
    await strictPage.goto("/");

    // 1. Connect
    await strictPage.getByRole("button", { name: /select|connect/i }).first().click();
    await strictPage.getByText(/RoostaTestKeypair/).click();
    await expect(strictPage.getByText(new RegExp(short)).first()).toBeVisible({
      timeout: 15_000,
    });

    // 2. Disconnect (the wallet-adapter modal exposes a "Change wallet" /
    //    "Disconnect" button after connection — click whatever maps to
    //    "Disconnect").
    const disconnectAffordance = strictPage
      .getByRole("button", { name: /disconnect|change wallet|sign out/i })
      .first();
    if (await disconnectAffordance.isVisible().catch(() => false)) {
      await disconnectAffordance.click();
    } else {
      // Some builds put disconnect behind the WalletMultiButton dropdown.
      // Open the wallet panel and try again.
      const panelTrigger = strictPage
        .getByRole("button", { name: new RegExp(short) })
        .first();
      if (await panelTrigger.isVisible().catch(() => false)) {
        await panelTrigger.click();
        const inner = strictPage.getByRole("button", { name: /disconnect/i }).first();
        if (await inner.isVisible().catch(() => false)) await inner.click();
      }
    }

    // The disconnect path varies by build; soft-assert by waiting for the
    // shortened address to go away.
    await expect(async () => {
      const found = await strictPage.getByText(new RegExp(short)).first().isVisible().catch(() => false);
      expect(found).toBe(false);
    }).toPass({ timeout: 10_000 });

    // 3. Reconnect — should land back on the same shortened address
    await strictPage.getByRole("button", { name: /select|connect/i }).first().click();
    await strictPage.getByText(/RoostaTestKeypair/).click();
    await expect(strictPage.getByText(new RegExp(short)).first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
