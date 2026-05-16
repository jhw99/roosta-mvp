import { test, expect } from "./fixtures/strict-page";

test.describe("home page (read-only)", () => {
  test("renders without console errors or failed requests", async ({ strictPage }) => {
    await strictPage.goto("/");
    // Logo / brand text should be present on first paint, not later.
    await expect(strictPage.getByText(/Roosta/i).first()).toBeVisible({ timeout: 10_000 });
    // Wait for the GET /api/circles call to settle so we know data has been
    // fetched (or the empty state has rendered). 30s ceiling matches the
    // route's revalidate window.
    await strictPage.waitForResponse(
      (res) => res.url().includes("/api/circles") && res.status() === 200,
      { timeout: 30_000 },
    );
    // Either a Link to a circle (anchor pointing at /circles/<pubkey>) or a
    // visible empty state — never a blank screen.
    const link = strictPage.locator('a[href^="/circles/"]').first();
    const empty = strictPage.getByText(/no circles|empty|create.*first/i).first();
    const eitherVisible = await Promise.race([
      link.waitFor({ state: "visible", timeout: 15_000 }).then(() => "card" as const).catch(() => null),
      empty.waitFor({ state: "visible", timeout: 15_000 }).then(() => "empty" as const).catch(() => null),
    ]);
    expect(eitherVisible).not.toBeNull();
  });

  test("connect button is reachable", async ({ strictPage }) => {
    await strictPage.goto("/");
    const connect = strictPage.getByRole("button", { name: /select|connect|wallet/i });
    await expect(connect.first()).toBeVisible({ timeout: 10_000 });
  });

  test("circles index route loads", async ({ strictPage }) => {
    await strictPage.goto("/circles");
    await expect(strictPage).toHaveURL(/\/circles/);
    await expect(strictPage.locator("body")).not.toBeEmpty();
  });

  test("profile route loads (disconnected → preview SBT)", async ({ strictPage }) => {
    await strictPage.goto("/profile");
    await expect(strictPage).toHaveURL(/\/profile/);
  });

  test("demo route loads", async ({ strictPage }) => {
    await strictPage.goto("/demo");
    await expect(strictPage).toHaveURL(/\/demo/);
  });
});
