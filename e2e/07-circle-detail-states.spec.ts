import { test, expect } from './fixtures/strict-page';

/**
 * Circle detail state matrix — Solana version.
 *
 * Mirrors the Telegram side's `integration-kye-detail-states.spec.ts`.
 * Covers: connected-via-test-wallet vs disconnected, and asserts the page
 * mounts + shows the expected member affordances per role.
 *
 * Unlike the TG side, Solana's wallet adapter test wallet is a real
 * keypair signing real ed25519 — so this spec exercises the same code
 * paths as a Phantom user would, just without the popup.
 *
 * Test data: uses the GET /api/circles response to pick a real circle
 * from the seeded devnet program. If no circles exist, all tests skip.
 */
test.describe('@integration circle-detail state matrix', () => {
  test('disconnected visitor sees public circle info', async ({ strictPage, request }) => {
    test.setTimeout(45_000);
    const list = await request.get('http://127.0.0.1:3100/api/circles').then((r) => r.json());
    const circle = list?.circles?.[0]?.publicKey;
    test.skip(!circle, 'no circles in devnet response — seed first');
    if (!circle) return;

    await strictPage.goto(`/circles/${circle}`);
    await expect(strictPage.locator('body')).not.toBeEmpty();
    // Public detail page should mount even without a wallet.
    await expect(strictPage.getByText(/circle|member|round/i).first()).toBeVisible({
      timeout: 15_000,
    });
    // Member-only buttons must NOT show (Deposit, Payout, etc.).
    const memberAction = strictPage.getByRole('button', { name: /deposit|payout|claim/i });
    await expect(memberAction).toHaveCount(0);
  });

  test('connected test wallet (non-member) sees no member CTAs', async ({
    strictPage,
    testKeypair,
  }) => {
    test.setTimeout(60_000);
    void testKeypair; // funded by strict-page fixture
    const list = await fetch('http://127.0.0.1:3100/api/circles').then((r) => r.json());
    const circle = list?.circles?.[0]?.publicKey;
    test.skip(!circle, 'no circles');
    if (!circle) return;

    await strictPage.goto('/');
    // Connect via the test wallet adapter (same flow as 02-wallet-connect).
    await strictPage.getByRole('button', { name: /select|connect/i }).first().click();
    await strictPage.getByText(/RoostaTestKeypair/).click();
    await expect(strictPage.getByText(testKeypair.publicKey.toBase58().slice(0, 4))).toBeVisible({
      timeout: 15_000,
    });

    await strictPage.goto(`/circles/${circle}`);
    await expect(strictPage.locator('body')).not.toBeEmpty();
    // A connected wallet that is NOT a member of this circle should still
    // NOT see member-only CTAs like Deposit/Payout.
    const memberAction = strictPage.getByRole('button', { name: /^(deposit|payout)$/i });
    await expect(memberAction).toHaveCount(0);
  });

  test('demo route mounts (preview scenarios — no wallet, no chain)', async ({ strictPage }) => {
    await strictPage.goto('/demo');
    await expect(strictPage.locator('body')).not.toBeEmpty();
  });
});
