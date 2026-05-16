import { test as base, expect, type Page } from "@playwright/test";
import { Keypair, Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import fs from "node:fs";
import path from "node:path";

/**
 * Strict page fixture — fails the test on any of:
 *   - console.error
 *   - page.on("pageerror")  (uncaught JS exception)
 *   - failed network request (status >= 400) with optional allowlist
 *   - hydration mismatch warnings (logged as console.warn but with hydration keyword)
 *
 * Per QA_STRATEGY §5. Tests opt out per-call with `recordOnlyConsole.ignore(...)`.
 */

const DEFAULT_FAIL_STATUS = (status: number) => status >= 400;

interface StrictOptions {
  allowFailedRequest?: (url: string, status: number) => boolean;
}

export const test = base.extend<{
  strictPage: Page;
  testKeypair: Keypair;
  rpcConnection: Connection;
}>({
  // Per-test funded keypair. Persisted to disk under e2e/.cache/ so a single
  // airdrop is reused across reruns within the day, avoiding devnet 429s.
  testKeypair: async ({}, use) => {
    const cacheDir = path.join(process.cwd(), "e2e/.cache");
    fs.mkdirSync(cacheDir, { recursive: true });
    const file = path.join(cacheDir, "test-keypair.json");
    let kp: Keypair;
    if (fs.existsSync(file)) {
      const raw = JSON.parse(fs.readFileSync(file, "utf8")) as number[];
      kp = Keypair.fromSecretKey(Uint8Array.from(raw));
    } else {
      kp = Keypair.generate();
      fs.writeFileSync(file, JSON.stringify(Array.from(kp.secretKey)));
    }
    await use(kp);
  },

  rpcConnection: async ({}, use) => {
    const url = process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.devnet.solana.com";
    await use(new Connection(url, "confirmed"));
  },

  strictPage: async ({ page, testKeypair }, use, testInfo) => {
    const failures: string[] = [];

    // Inject the test keypair BEFORE any app script runs so the wallet
    // provider's autoConnect picks it up cleanly.
    await page.addInitScript((secretKey) => {
      // @ts-expect-error — global wired by KeypairWalletAdapter at runtime
      window.__ROOSTA_TEST_KEYPAIR__ = secretKey;
    }, Array.from(testKeypair.secretKey));

    page.on("console", (msg) => {
      const type = msg.type();
      if (type === "error") failures.push(`console.error: ${msg.text()}`);
      // Next.js logs hydration mismatches as warnings — flag them too.
      if (type === "warning" && /hydrat/i.test(msg.text())) {
        failures.push(`hydration warning: ${msg.text()}`);
      }
    });
    page.on("pageerror", (err) => {
      failures.push(`pageerror: ${err.message}`);
    });
    page.on("requestfailed", (req) => {
      const errText = req.failure()?.errorText ?? "";
      const url = req.url();
      // Next.js cancels in-flight RSC prefetches (_rsc=) when the user
      // navigates away or hovers off a <Link>; Chromium surfaces that as
      // net::ERR_ABORTED. This is benign — the actual nav still works — so
      // strip it from the strict failure set. Any non-ABORTED failure or
      // any non-prefetch URL still fails the test.
      const isPrefetchAbort = /_rsc=/.test(url) && errText === "net::ERR_ABORTED";
      if (isPrefetchAbort) return;
      failures.push(`requestfailed: ${url} — ${errText}`);
    });
    page.on("response", (res) => {
      const status = res.status();
      if (!DEFAULT_FAIL_STATUS(status)) return;
      // Allowlist obvious non-app traffic (Next dev hot-reload 404s, etc.)
      const url = res.url();
      if (/_next\/static\/(webpack|chunks)\/.*\.hot-update/.test(url)) return;
      // Faucet endpoint is allowed to 409 (already claimed) per spec.
      if (/\/api\/faucet/.test(url) && status === 409) return;
      failures.push(`HTTP ${status}: ${url}`);
    });

    await use(page);

    if (failures.length > 0) {
      throw new Error(
        `Strict page detected ${failures.length} issue(s):\n  - ` +
          failures.join("\n  - "),
      );
    }
    testInfo.attach("strict-page-summary", {
      body: `0 issues detected. Test = ${testInfo.title}`,
      contentType: "text/plain",
    });
  },
});

export { expect };
export type { StrictOptions };

export async function fundFromDevnet(
  connection: Connection,
  pubkey: import("@solana/web3.js").PublicKey,
  sol = 1,
): Promise<string> {
  const balance = await connection.getBalance(pubkey);
  // Treat any balance above 0.01 SOL as "funded enough to sign a few txs"
  // so we don't burn the devnet airdrop quota on every run. The test
  // keypair is seeded once via scripts/seed-test-keypair.mjs and tops up
  // are manual.
  const FLOOR = 0.01 * LAMPORTS_PER_SOL;
  if (balance >= Math.min(sol * LAMPORTS_PER_SOL, FLOOR)) {
    return `cached:${balance}`;
  }
  const sig = await connection.requestAirdrop(pubkey, sol * LAMPORTS_PER_SOL);
  await connection.confirmTransaction(sig, "confirmed");
  return sig;
}
