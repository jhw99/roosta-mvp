/**
 * Roosta — comprehensive 3-minute demo recorder.
 *
 * Walks every meaningful surface of the live site so a viewer who watches the
 * full video understands:
 *   - what Roosta is (hero + active circles)
 *   - lifecycle states (forming / mid-flight / completed)
 *   - circle creation with risk parameters
 *   - join flow + Trust Gate
 *   - wallet panel (vault / faucet / top-up concept)
 *   - profile (Trust Tier + Credit SBT)
 *   - demo page (3 scenarios)
 *
 * Output: scripts/out/roosta-demo-1440p.mp4 (2560x1440, no audio, ~3:00)
 */
import { chromium } from "playwright";
import path from "path";
import fs from "fs";

const URL = process.env.ROOSTA_URL || "https://roosta-mvp.vercel.app";
const OUT_DIR = path.join(__dirname, "out");
const VIEWPORT = { width: 2560, height: 1440 };

// Demo circles seeded on devnet
const CIRCLE_FORMING = "FMkM2HLP449xAktLninCQQsWkhW1juvsD5La2MUtUhjb"; // Seoul Builders
const CIRCLE_MIDFLIGHT = "Vk7bJRRc48wKcUS2V7QiwpAG36LSaQSqFvzcg2xSu74"; // NYC Saturday Coffee
const CIRCLE_COMPLETED = "39sEZrvWJry7KDKzVuos4T8hwuLmtNqMgRtcwQkT1p4L"; // Lagos Devs Quarterly

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function smoothScroll(
  page: import("playwright").Page,
  distance: number,
  duration = 1500
) {
  const steps = 40;
  const dy = distance / steps;
  const dt = duration / steps;
  for (let i = 0; i < steps; i++) {
    await page.evaluate(
      (d) => window.scrollBy({ top: d, behavior: "instant" as ScrollBehavior }),
      dy
    );
    await sleep(dt);
  }
}

async function safeClick(page: import("playwright").Page, selector: string) {
  try {
    const el = page.locator(selector).first();
    if (await el.count()) {
      await el.scrollIntoViewIfNeeded();
      await el.click();
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

async function safeHover(page: import("playwright").Page, selector: string) {
  try {
    const el = page.locator(selector).first();
    if (await el.count()) {
      await el.scrollIntoViewIfNeeded();
      await el.hover();
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    recordVideo: { dir: OUT_DIR, size: VIEWPORT },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  // ====== BEAT 1 — Hero + Problem (0:00–0:22, ~22s) ======
  console.log("[1] Hero");
  await page.goto(URL + "/?preview=1", { waitUntil: "domcontentloaded" });
  await sleep(7_000); // full hero
  await smoothScroll(page, 350);
  await sleep(5_000);
  await smoothScroll(page, 300);
  await sleep(5_000);

  // ====== BEAT 2 — Active circles overview (0:22–0:42, ~20s) ======
  console.log("[2] Active circles");
  await smoothScroll(page, 500);
  await sleep(6_000);
  // hover one card
  await safeHover(page, "a[href^='/circles/']");
  await sleep(4_000);
  // navigate to full archive
  await page.goto(URL + "/circles", { waitUntil: "domcontentloaded" });
  await sleep(5_000);
  await smoothScroll(page, 300);
  await sleep(3_000);

  // ====== BEAT 3 — Lifecycle: 3 circles (0:42–1:22, ~40s) ======
  console.log("[3] Lifecycle: forming / mid / completed");
  // Forming circle (members not full)
  await page.goto(URL + "/circles/" + CIRCLE_FORMING, {
    waitUntil: "domcontentloaded",
  });
  await sleep(5_000);
  await smoothScroll(page, 350);
  await sleep(4_000);
  await smoothScroll(page, 350);
  await sleep(3_000);

  // Mid-flight circle (active deposits)
  await page.goto(URL + "/circles/" + CIRCLE_MIDFLIGHT, {
    waitUntil: "domcontentloaded",
  });
  await sleep(4_500);
  await smoothScroll(page, 350);
  await sleep(4_000);
  await smoothScroll(page, 350);
  await sleep(3_000);

  // Completed circle (all rounds settled)
  await page.goto(URL + "/circles/" + CIRCLE_COMPLETED, {
    waitUntil: "domcontentloaded",
  });
  await sleep(4_500);
  await smoothScroll(page, 350);
  await sleep(4_000);
  await smoothScroll(page, 350);
  await sleep(3_000);

  // ====== BEAT 4 — Create circle + Risk Parameters (1:22–1:55, ~33s) ======
  console.log("[4] Create flow");
  await page.goto(URL + "/circles/new", { waitUntil: "domcontentloaded" });
  await sleep(4_500);
  // Type into name field for visual cue
  try {
    const nameInput = page.locator("input#name");
    if (await nameInput.count()) {
      await nameInput.fill("Hackathon Circle");
      await sleep(2_500);
    }
  } catch {
    /* ignore */
  }
  // Try the rounds/contribution fields too for visual richness
  try {
    const memberInput = page.locator("input#members");
    if (await memberInput.count()) {
      await memberInput.fill("5");
      await sleep(1_500);
    }
    const contInput = page.locator("input#contribution");
    if (await contInput.count()) {
      await contInput.fill("100");
      await sleep(1_500);
    }
  } catch {
    /* ignore */
  }
  await smoothScroll(page, 250);
  await sleep(2_500);
  // Open risk parameters
  await safeClick(page, "button:has-text('Risk parameters')");
  await sleep(2_000);
  await smoothScroll(page, 350);
  await sleep(7_000); // dwell on toggles + sliders
  await smoothScroll(page, 250);
  await sleep(4_000);

  // ====== BEAT 5 — Join page + Trust Gate (1:55–2:20, ~25s) ======
  console.log("[5] Join + Trust Gate");
  await page.goto(URL + "/circles/" + CIRCLE_FORMING + "/join?preview=1", {
    waitUntil: "domcontentloaded",
  });
  await sleep(8_000);
  await smoothScroll(page, 300);
  await sleep(7_000);
  await smoothScroll(page, 300);
  await sleep(5_000);

  // ====== BEAT 6 — Wallet panel + Profile (2:20–2:45, ~25s) ======
  console.log("[6] Wallet & Profile");
  await page.goto(URL + "/?preview=1", { waitUntil: "domcontentloaded" });
  // Try to open wallet panel
  await safeClick(page, "button:has-text('Connect Wallet')");
  await sleep(4_000);
  // Close any open dialog by clicking elsewhere
  try {
    await page.keyboard.press("Escape");
  } catch {
    /* ignore */
  }
  await sleep(1_000);

  await page.goto(URL + "/profile?preview=1", { waitUntil: "domcontentloaded" });
  await sleep(7_000);
  await smoothScroll(page, 400);
  await sleep(6_000);

  // ====== BEAT 7 — Demo page + Outro (2:45–3:05, ~20s) ======
  console.log("[7] Demo + outro");
  await page.goto(URL + "/demo", { waitUntil: "domcontentloaded" });
  await sleep(5_000);
  await smoothScroll(page, 600);
  await sleep(5_000);
  await smoothScroll(page, 600);
  await sleep(3_000);

  // Final outro: home
  await page.goto(URL + "/?preview=1", { waitUntil: "domcontentloaded" });
  await sleep(4_500);

  await context.close();
  await browser.close();

  const files = fs.readdirSync(OUT_DIR).filter((f) => f.endsWith(".webm"));
  if (files.length) {
    const latest = files
      .map((f) => ({ f, t: fs.statSync(path.join(OUT_DIR, f)).mtimeMs }))
      .sort((a, b) => b.t - a.t)[0].f;
    const dst = path.join(OUT_DIR, "roosta-demo.webm");
    if (fs.existsSync(dst)) fs.unlinkSync(dst);
    fs.renameSync(path.join(OUT_DIR, latest), dst);
    console.log(`\n✅ Recording: ${dst}\n`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
