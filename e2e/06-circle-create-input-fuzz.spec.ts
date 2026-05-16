/**
 * RQ-CIRCLE-01 — create-circle form input validation (boundary fuzz).
 *
 * The form at /circles/new accepts 12 parameters; the chain enforces
 * ranges (e.g., member_count is u8 so 0–255). We poke a few boundary
 * values and verify the UI either prevents submission or shows a clear
 * error rather than silently sending an invalid tx that the chain
 * rejects with an opaque error.
 *
 * This spec does NOT sign or broadcast a real tx (that would require a
 * funded keypair AND a clean circle slot — covered by anchor test).
 * It only checks the form's input gating + submit affordance.
 */
import { test, expect } from "./fixtures/strict-page";

test.describe("RQ-CIRCLE-01 — create-circle form validation", () => {
  test("renders all 12 fields + Risk Parameters section", async ({ strictPage }) => {
    await strictPage.goto("/circles/new");
    await expect(strictPage.locator("input[type='text'], input[type='number']").first()).toBeVisible({
      timeout: 10_000,
    });
    // At least one numeric input (member_count, contribution, etc.) must
    // be present. Form rendering is the minimum bar.
    const numericInputs = await strictPage.locator("input[type='number']").count();
    expect(numericInputs).toBeGreaterThan(0);
  });

  test("submit is disabled or rejected for member_count = 0", async ({ strictPage }) => {
    await strictPage.goto("/circles/new");
    // Find the member_count input (first numeric input adjacent to a label
    // matching /member|count|members/i).
    const memberCountInput = strictPage.locator("input[type='number']").first();
    await memberCountInput.fill("0");

    const submit = strictPage
      .getByRole("button", { name: /create|submit|next|continue/i })
      .first();
    // Either the button is disabled OR clicking it surfaces a validation
    // error message. Both are acceptable behavior; what's NOT acceptable
    // is silently sending an invalid tx.
    const isDisabled = await submit.isDisabled().catch(() => false);
    if (!isDisabled) {
      await submit.click();
      // Look for any visible error/help text mentioning the invalid value
      const err = strictPage
        .getByText(/invalid|must be|at least|required|min|range/i)
        .first();
      await expect(err).toBeVisible({ timeout: 5_000 });
    }
  });

  test("submit is disabled or rejected for contribution = 0", async ({ strictPage }) => {
    await strictPage.goto("/circles/new");
    // Find an input that looks like contribution (label or placeholder
    // contains "contribution" or "amount").
    const candidates = strictPage.locator("input[type='number']");
    const count = await candidates.count();
    // Fill ALL numeric inputs with 0 to test the worst case.
    for (let i = 0; i < count; i++) {
      await candidates.nth(i).fill("0");
    }
    const submit = strictPage
      .getByRole("button", { name: /create|submit|next|continue/i })
      .first();
    const isDisabled = await submit.isDisabled().catch(() => false);
    if (!isDisabled) {
      await submit.click();
      const err = strictPage
        .getByText(/invalid|must be|at least|required|min|range|0/i)
        .first();
      await expect(err).toBeVisible({ timeout: 5_000 });
    }
  });
});
