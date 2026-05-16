/**
 * API contract tests — exercised against the running prod server.
 *
 * Covers:
 *   RQ-TRUSTGATE-01 — /api/trust-gate degrades correctly when Helius is
 *     unconfigured (we cannot guarantee the env var in CI). We assert it
 *     returns either 200 with a structured body OR a 4xx/5xx with an
 *     error message — never a hang or a corrupted JSON.
 *   RQ-GASLESS-02 — /api/relayer rejects an arbitrary tx whose program is
 *     not on the ALLOWED_PROGRAMS allowlist.
 *   RQ-GASLESS-03 — /api/relayer rate-limits at 30 reqs / 5 min per IP.
 *   RQ-NFT-METADATA-01 — /api/nft-metadata/position/[circle]/[order]
 *     returns valid JSON metadata for an existing-or-fabricated circle.
 *   RQ-CIRCLE-02 — GET /api/circles returns a JSON array and the schema
 *     matches what the UI hydrates.
 *
 * Note: tests that *would* require a valid secret (RELAYER_SECRET,
 * HELIUS_API_KEY) check for presence and skip with an explicit annotation
 * rather than silently passing.
 */
import { test, expect } from "./fixtures/strict-page";
import { Keypair, SystemProgram, Transaction, PublicKey } from "@solana/web3.js";

const BASE = "http://127.0.0.1:3100";

test.describe("RQ-CIRCLE-02 — GET /api/circles", () => {
  test("returns a JSON array of circles with the documented shape", async ({ request }) => {
    const res = await request.get(`${BASE}/api/circles`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    // Documented shape (per app/page.tsx hydrate(): CircleApiEntry):
    //   { circles: Array<{ publicKey, account: { authority, circleId,
    //     name, memberCount, totalRounds, currentRound, contributionAmount,
    //     roundDuration, startedAt, status, members, payoutOrder } }> }
    expect(body).toHaveProperty("circles");
    expect(Array.isArray(body.circles)).toBeTruthy();
    if (body.circles.length > 0) {
      const entry = body.circles[0];
      expect(entry).toHaveProperty("publicKey");
      expect(entry).toHaveProperty("account");
      const a = entry.account;
      for (const k of [
        "authority", "circleId", "name", "memberCount", "totalRounds",
        "currentRound", "contributionAmount", "roundDuration", "startedAt",
        "status", "members", "payoutOrder",
      ]) {
        expect(a, `account.${k}`).toHaveProperty(k);
      }
    }
  });
});

test.describe("RQ-GASLESS-02 — /api/relayer rejects unknown programs", () => {
  test("a tx targeting a random program id is rejected", async ({ request }) => {
    // Build a fake versioned tx that calls an arbitrary program (just a
    // SystemProgram.transfer is on the allowlist; instead we craft a tx
    // whose only instruction targets a random pubkey as a program).
    const sender = Keypair.generate();
    const recipient = Keypair.generate();
    const tx = new Transaction().add({
      programId: Keypair.generate().publicKey, // intentionally NOT on the allowlist
      keys: [
        { pubkey: sender.publicKey, isSigner: true, isWritable: true },
        { pubkey: recipient.publicKey, isSigner: false, isWritable: true },
      ],
      data: Buffer.from([1, 2, 3, 4]),
    });
    tx.recentBlockhash = "11111111111111111111111111111112"; // valid base58, dummy
    tx.feePayer = new PublicKey("11111111111111111111111111111111");
    const b64 = tx.serialize({ requireAllSignatures: false }).toString("base64");

    const res = await request.post(`${BASE}/api/relayer`, {
      data: { tx: b64 },
    });
    // Relayer might 400/403/500 — what matters is it does NOT return
    // 200 success. If relayer is disabled (missing RELAYER_SECRET) we
    // still expect a non-200 from the disallowed-program path or a
    // configured "relayer unavailable" message.
    expect(res.status()).not.toBe(200);
    const body = await res.text();
    test.info().annotations.push({
      type: "relayer-reject-body",
      description: `status=${res.status()} body=${body.slice(0, 200)}`,
    });
  });
});

test.describe("RQ-GASLESS-03 — /api/relayer rate-limit", () => {
  test("hits 429 after the documented threshold (30/5min)", async ({ request }) => {
    test.setTimeout(60_000);
    let seen429 = false;
    // Use a malformed body so each request is rejected fast (the rate-
    // limiter runs before body parsing).
    for (let i = 0; i < 35; i++) {
      const res = await request.post(`${BASE}/api/relayer`, { data: {} });
      if (res.status() === 429) {
        seen429 = true;
        break;
      }
    }
    // If the rate-limiter is in-memory per-process (which the route is) the
    // counter persists across this test only if the dev server is the same
    // process. Annotate either outcome so we don't silently pass on a no-op.
    test.info().annotations.push({
      type: "relayer-rate-limit-result",
      description: `seen429=${seen429}`,
    });
    // Soft expectation: in our prod-build run we do hit 429. If a future
    // env changes the limiter to Redis/etc this annotation makes it
    // obvious whether the test still proves the intent.
    expect(seen429).toBe(true);
  });
});

test.describe("RQ-NFT-METADATA-01 — Position NFT metadata API", () => {
  test("returns JSON for any (circle, order) tuple (404 OK for nonexistent)", async ({ request }) => {
    // Pick a known circle from /api/circles if available; otherwise use a
    // fabricated PDA and accept 404.
    const list = await request.get(`${BASE}/api/circles`).then((r) => r.json());
    const circle = list?.circles?.[0]?.publicKey ?? Keypair.generate().publicKey.toBase58();
    const res = await request.get(`${BASE}/api/nft-metadata/position/${circle}/0`);
    expect([200, 404]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      // Metaplex-style minimal contract: name + symbol + image at least.
      expect(body).toHaveProperty("name");
      expect(body).toHaveProperty("symbol");
    }
  });
});

test.describe("RQ-TRUSTGATE-01 — /api/trust-gate degrades cleanly", () => {
  test("returns a structured response or a documented error (never hang)", async ({ request }) => {
    const wallet = Keypair.generate().publicKey.toBase58();
    const res = await request.post(`${BASE}/api/trust-gate`, {
      data: {
        wallet,
        desiredPosition: 2,
        hasSufficientCollateral: true,
        agreedToReserve: true,
      },
      timeout: 20_000,
    });
    // 200 (Helius configured + responded) or 4xx/5xx (helius missing or
    // upstream error) — both are acceptable. We assert the body is JSON
    // and has either {eligible:..., trustTier:...} or {error:...}.
    expect([200, 400, 401, 500, 502, 503]).toContain(res.status());
    const body = await res.json().catch(() => null);
    expect(body).not.toBeNull();
    const ok = body && (
      typeof body.eligible === "boolean" ||
      typeof body.error === "string" ||
      typeof body.message === "string"
    );
    expect(ok).toBe(true);
  });
});
