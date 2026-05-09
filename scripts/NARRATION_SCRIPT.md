# Roosta Demo — Narration Script

Total runtime: ~90초. 자동 녹화된 영상에 voice-over로 얹어 사용.

---

## Beat 1 — Hero (0:00 ~ 0:08)
> **"This is Roosta — on-chain social savings on Solana. Friends pool USDC each round, and the smart contract pays out to one member at a time. No organizer risk, no disappearing 계주. Just transparent, programmable rotating savings."**

## Beat 2 — Active circles (0:08 ~ 0:18)
> **"Anyone can browse active circles. Each card shows the group's lifecycle: forming, mid-flight, or completed. Funds are already escrowed on-chain."**

## Beat 3 — Circle detail (0:18 ~ 0:32)
> **"Inside a circle, you see every member, their position in the rotation, and their on-chain status. Position 1 and 2 — the early borrowers — post collateral and a locked reserve, so the late savers are protected. Every deposit and payout is a Solana transaction."**

## Beat 4 — Circles archive (0:32 ~ 0:42)
> **"Filter by 'Mine' once you've connected, or browse all circles to find one to join."**

## Beat 5 — Demo page (0:42 ~ 0:55)
> **"Roosta has three demo scenarios baked in: Happy Path, Trust Gate Rejection, and Default + Slash. Each shows a different protection layer — Trust Tier, risk deposit, locked reserve, or Credit SBT downgrade."**

## Beat 6 — Create circle (0:55 ~ 1:08)
> **"Creating a circle takes 30 seconds. Pick member count, contribution, and round duration. Open Risk parameters to enable Trust Gate, Risk Deposit, and Locked Reserve — toggleable for any group from totally trustless to deeply collateralized."**

## Beat 7 — Profile (1:08 ~ 1:20)
> **"Every wallet builds a Credit SBT — a non-transferable Token-2022 reputation badge. Trust Tier rises with completed circles and on-time payments, falls with defaults. Position NFTs are real Metaplex assets, frozen in your Roosta vault."**

## Beat 8 — Outro (1:20 ~ 1:30)
> **"Live on Solana Devnet today. Try it at roosta-mvp.vercel.app."**

---

## How to record

```bash
cd /home/jhenry/workspace/jhw99/Roosta
npm install --save-dev playwright @playwright/test
npx playwright install chromium
npx tsx scripts/record-demo.ts

# convert webm → mp4
ffmpeg -i scripts/out/roosta-demo.webm \
  -c:v libx264 -pix_fmt yuv420p -movflags +faststart \
  scripts/out/roosta-demo.mp4
```

녹화 후 위 대사를 voiceover로 입혀주세요 (Loom / QuickTime / Camtasia). 지갑 팝업이 들어가는 부분은 별도로 직접 녹화한 클립을 데모 영상 중간에 끼워넣으면 됩니다.
