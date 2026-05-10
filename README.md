# Roosta

> A Solana-native ROSCA (rotating savings) protocol.
> The world's oldest social finance, rebuilt so the code—not a person—holds the trust.

**Live**: https://roosta-mvp.vercel.app · **Devnet Program**: [`3i5Ggda…WqdjWqv`](https://explorer.solana.com/address/3i5GgdaySbxcBB133fp2Nyk9ER66d1fEGyTFCxqdjWqv?cluster=devnet)

---

## At a Glance

### What it is

ROSCAs—Korean *kye*, Mexican *tanda*, West African *sou-sou*, Chinese *hui*—are how a billion people save together every day. **Roosta moves that pattern onto Solana.** The smart contract takes the role of the human organizer, every deposit and payout flows through on-chain escrow, and a wallet's payment record becomes a portable, non-transferable credit primitive.

### What we solved

| Problem in traditional ROSCAs | Roosta's mechanism |
|---|---|
| Organizer disappears with the pool | Vault PDAs custody all funds; no human authority |
| Payment history lives in chats and notebooks | Every transaction is permanent on Solana Explorer |
| Early-slot recipients can default after receiving | Risk Deposit + Locked Reserve auto-slashed on default |
| Trust does not carry across groups | Token-2022 Non-Transferable Credit SBT travels with the wallet |
| No way to vet a stranger before letting them in | Trust Gate combines Helius wallet history with on-chain Credit SBT |

### Why it matters here

1. **First on-chain ROSCA that addresses the early-slot default problem with explicit game-theory guardrails.** Slot 1 and 2 collateral plus Locked Reserve are sized so that `default_cost > default_benefit` always holds.
2. **A reputation primitive that cannot be discarded.** The Credit SBT uses Token-2022's `NonTransferable` extension, so a defaulter cannot launder their history by switching wallets.
3. **Polymarket-style proxy wallet** (UserVault PDA) — users top up once and every subsequent round debits their vault automatically; no popup per payment.
4. **Gasless relayer** — users do not need to hold SOL. Roosta covers transaction fees through an allowlisted fee-payer service.
5. **Position NFTs are real Metaplex assets**, frozen by the program so they prove participation but cannot be traded out.

### Stack

Anchor 0.31.1 · Solana Devnet · SPL Token-2022 (NonTransferable extension) · Metaplex Token Metadata · Next.js 16 · Tailwind v4 · Helius RPC + DAS · Vercel · custom fee-payer relayer

### Status

- All 15 program instructions covered by Anchor integration tests, all green on localnet
- Deployed to Devnet with three seeded demo circles in distinct lifecycle states (forming / mid-flight / completed)
- Seven-page production frontend live at [roosta-mvp.vercel.app](https://roosta-mvp.vercel.app)
- 1440p demo recording produced via Playwright; full handoff package (audio, subtitles, scene script) in `scripts/out/handoff/`

---

## Try the Demo

| Asset | Where |
|---|---|
| 3-minute demo video (1440p, no audio, raw) | `scripts/out/handoff/roosta-demo-1440p.mp4` |
| Full handoff bundle (audio · SRT · scene script · per-beat WAVs) | `scripts/out/handoff/` |
| Live site | https://roosta-mvp.vercel.app |
| Preview mode (mocked wallet-connected state) | https://roosta-mvp.vercel.app/?preview=1 |
| Program on Solana Explorer | https://explorer.solana.com/address/3i5GgdaySbxcBB133fp2Nyk9ER66d1fEGyTFCxqdjWqv?cluster=devnet |
| Mock USDC mint | https://explorer.solana.com/address/EVfLhS7j4nbC4Ln1VpVh7fHJruwWqZUUEE1tHNuYFkDu?cluster=devnet |

### End-to-end user flow

1. Open https://roosta-mvp.vercel.app — active circles render immediately.
2. Connect Phantom (set to **Devnet** in wallet settings).
3. From the Wallet panel: Initialize Vault → Get 1000 mock USDC → Top up.
4. Pick a circle → Join → Trust Gate evaluates → Position NFT is minted.
5. When you Deposit, the contribution is debited from your Roosta vault automatically.
6. Once every member has deposited, settle_round fires; the recipient receives the pot in their vault.
7. The Profile page shows your Trust Tier, Credit SBT, and held Position NFTs.

---

## Detailed Documentation

### 1. Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Browser                                                     │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Next.js 16 (App Router) · Tailwind v4 · Inter font    │  │
│  │  · Solana Wallet Adapter (Phantom + auto-discovery)    │  │
│  │  · Trust Gate Modal · Position NFT Badge · SBT Badge   │  │
│  └─────────────────┬───────────────────┬──────────────────┘  │
│                    │ signed tx         │ user signature       │
└────────────────────┼───────────────────┼──────────────────────┘
                     │                   │
       ┌─────────────┘                   │
       ▼                                 ▼
┌──────────────────────────┐   ┌────────────────────────────────┐
│  Roosta Relayer          │   │  Solana Devnet                 │
│  (Next.js API routes)    │──▶│                                │
│  · /api/relayer          │   │  ┌──────────────────────────┐  │
│  · /api/trust-gate       │   │  │ Roosta Anchor Program    │  │
│  · /api/wallet-history   │   │  │  (15+ instructions)      │  │
│  · /api/faucet           │   │  └──────────────────────────┘  │
│  · /api/circles[/id]     │   │  ┌──────────────────────────┐  │
└──────────┬───────────────┘   │  │ PDAs:                    │  │
           │                   │  │  Circle / Round /        │  │
           │ Helius            │  │  MemberStatus /          │  │
           ▼                   │  │  CreditProfile / Vaults  │  │
┌──────────────────────────┐   │  └──────────────────────────┘  │
│  Helius DAS / RPC        │   │  ┌──────────────────────────┐  │
│  · wallet history        │   │  │ Metaplex Token Metadata  │  │
│  · asset holdings        │   │  │ (Position / Collateral)  │  │
└──────────────────────────┘   │  ├──────────────────────────┤  │
                               │  │ SPL Token-2022           │  │
                               │  │ NonTransferable Mint     │  │
                               │  │ (Credit SBT)             │  │
                               │  └──────────────────────────┘  │
                               └────────────────────────────────┘
```

### 2. The four primitives

**Position NFT (Metaplex).** A real, on-chain NFT minted to each member when they join. Payout order is encoded as a trait. The token account is frozen by the program PDA, so the NFT proves participation but cannot be transferred or sold.

**Risk Deposit + Locked Reserve.** Members in `payout_order` 0 and 1 (the two earliest borrowers) post collateral sized as `contribution × member_count × ratio%` into a per-circle `collateral_vault` PDA before round 1 activates. A portion of their payout is also held back as Locked Reserve and released proportionally as later rounds settle. On default, both pools are slashed to keep the round whole.

**Credit SBT (Token-2022 NonTransferable).** The first time a wallet calls `init_credit_profile`, the program mints a single Soulbound Token using Token-2022's NonTransferable extension. The mint authority is a program PDA. Every on-time payment, late payment, default, and slash is recorded against the wallet's `CreditProfile` PDA. Switching wallets does not erase the history.

**Trust Gate.** Slot 1 requires Tier 3 or above; slot 2 requires Tier 2 or above; slot 3+ only requires a wallet older than one day. Tier is computed from (a) wallet age, transaction count, and asset history pulled from Helius DAS, and (b) the on-chain Credit SBT counters.

### 3. Instruction catalogue

| ID | Instruction | Role |
|---|---|---|
| SC-01 | `create_circle` | Initialize Circle PDA, vault, collateral_vault, and round 1 in one tx. Twelve args including five risk-parameter knobs. |
| SC-02 | `init_user_vault` | Create the per-user proxy wallet (UserVault PDA + token account). |
| SC-03 | `top_up_vault` | Move USDC from the user's main ATA into their vault token account. |
| SC-04 | `withdraw_vault` | Reverse of top-up. PDA signs via seeds. |
| SC-05 | `init_credit_profile` | Create the CreditProfile PDA and mint the Token-2022 NonTransferable SBT in a single, idempotent call. |
| SC-06 | `join_circle` | Register a member, assign payout_order, auto-activate round 1 when the circle is full and collaterals are posted. |
| SC-07 | `mint_position_nft` | Metaplex CPI: mint NFT, create metadata + master edition, freeze the token account. |
| SC-08 | `deposit_risk_collateral` | Slot 0 / 1 members post collateral before round 1. |
| SC-09 | `try_activate_round1` | Explicitly flip round 1 to Active once seating + collateral conditions are met. |
| SC-10 | `deposit` | Debit the round's contribution from the member's vault. Records on-time / late on the CreditProfile based on `Round.deadline`. |
| SC-11 | `trigger_payout` | Settle the round: vault → recipient vault, with the early-slot share routed into Locked Reserve. Initializes the next round atomically. |
| SC-12 | `unlock_reserve` | Release the next slice of an early-slot member's Locked Reserve once a subsequent round settles. |
| SC-13 | `mark_delayed` / `mark_member_delayed` | Anyone can flip a stale round to Delayed past its deadline; per-member version increments `late_payments`. |
| SC-14 | `mark_default` | After grace, any caller can mark a still-missing member Defaulted. Increments `defaults`. |
| SC-15 | `slash_collateral` | Move the defaulter's collateral and remaining Locked Reserve into the circle vault. Resets their Trust Tier to 0. Records a "deposit" so the round can settle. |

Test files in `tests/` cover every instruction end-to-end and pass under `anchor test --provider.cluster localnet`.

### 4. Data model

| Account | Seeds | Notable fields |
|---|---|---|
| `Circle` | `["circle", authority, circle_id LE]` | name, member_count, total_rounds, current_round, contribution_amount, round_duration, vault, collateral_vault, members, payout_order, **trust_gate_enabled, risk_deposit_enabled, locked_reserve_enabled, early_position_collateral_ratio, locked_reserve_ratio, grace_period_seconds, risk_collaterals_collected, round1_activated** |
| `Round` | `["round", circle, [n u8]]` | round_number, recipient, deposits_count, status (Pending / Active / Settled / Delayed), started_at, **deadline, total_collected, payout_amount, reserve_amount, delayed_at**, deposits |
| `MemberStatus` | `["member", circle, wallet]` | wallet, **payout_order, status_enum (Active / Paid / Received / Completed / Delayed / Defaulted / Slashed), position_nft_mint, collateral_amount, locked_reserve_amount, locked_reserve_initial, locked_reserve_unlocks_done, default_count, last_delayed_round, last_defaulted_round, slashed, shortfall**, total_deposited, deposit_count, missed_count, received_amount |
| `CreditProfile` | `["credit", wallet]` | wallet, sbt_mint, trust_tier, circles_completed, on_time_payments, late_payments, defaults, total_volume, early_position_eligible, last_updated_at |
| `UserVault` | `["user_vault", wallet]` | user, bump · token account at `["user_vault_ata", wallet]` |

### 5. Trust Tier rules

```
defaults > 0  OR  slashed_count > 0     → Tier 0   (forced)
walletAge < 30 days  OR  txCount < 5    → Tier 0
completed_circles == 0                   → Tier 1   (if recent activity)
completed_circles ≥ 1, late ≤ 2          → Tier 2
completed_circles ≥ 3, late ≤ 1          → Tier 3
completed_circles ≥ 5, late == 0         → Tier 4   (Guarantor)
```

Slot eligibility:
- **Slot 1**: Tier 3+, collateral posted, Locked Reserve agreed
- **Slot 2**: Tier 2+, collateral posted
- **Slot 3+**: wallet older than 1 day

### 6. T-wave economics — keeping default expensive

```
default_cost = risk_deposit_slash               (slot 0·1: full slash)
             + locked_reserve_slash             (entire remaining reserve)
             + permanent Credit SBT record      (defaults++, tier reset to 0)
             + higher collateral in future circles
```

The protocol invariant is `default_benefit < default_cost`, achieved by tuning the collateral and reserve ratios per circle. Late savers (slot 3+) carry no extra deposit because their downside is bounded.

### 7. Gasless relayer

- **Phase 1 (UI label).** Every transaction button shows "✨ Gas covered by Roosta".
- **Phase 2 (fee payer, shipped).** The client builds a transaction with `feePayer = ROOSTA_RELAYER`, the user partially signs, and `/api/relayer` adds the fee-payer signature before submitting. The endpoint enforces an instruction-level allowlist (Roosta · System · SPL Token · Token-2022 · ATA · Metaplex · Sysvar Rent · ComputeBudget) so the fee payer cannot be griefed by foreign transactions. Rate-limited to 30 requests / 5 min per IP.
- **Phase 3 (session wallet).** Next sprint: a 24-hour delegated keypair so deposits do not pop the wallet at all.

### 8. Frontend page map

| Route | Purpose |
|---|---|
| `/` | Active circles dashboard (top 10 + "More circles") |
| `/circles` | Full archive with All / Mine filter |
| `/circles/new` | Creation form with expandable Risk Parameters section |
| `/circles/[id]` | Detail: members with payout order, status badges, collateral / reserve, NFT mint Explorer links, deposit / payout / mark / slash actions |
| `/circles/[id]/join` | Slot picker that opens the Trust Gate modal in real time |
| `/profile` | Trust Tier badge, Credit SBT, Position NFT grid, lifetime stats |
| `/demo` | Three explainer scenarios (Happy Path / Trust Gate Rejection / Default + Slash) |

All pages are mobile-responsive. Brand tokens live in `app/app/globals.css`; Inter is used for both display and body to keep the look in line with modern fintech apps.

### 9. Local development

```bash
# Contract
anchor build
anchor test                     # full integration suite, localnet

# Frontend
cd app
npm install
npm run dev                     # http://localhost:3000

# Auto-recorded demo (Playwright)
npx playwright install chromium
npx tsx scripts/record-demo.ts  # → scripts/out/roosta-demo.webm
```

Required environment variables (`app/.env.local`):

```
NEXT_PUBLIC_PROGRAM_ID=3i5GgdaySbxcBB133fp2Nyk9ER66d1fEGyTFCxqdjWqv
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_USDC_MINT=EVfLhS7j4nbC4Ln1VpVh7fHJruwWqZUUEE1tHNuYFkDu
NEXT_PUBLIC_RELAYER_PUBKEY=<relayer public key>
HELIUS_API_KEY=<Helius API key>
FAUCET_SECRET=<base58 keypair, mock USDC mint authority>
RELAYER_SECRET=<base58 keypair, fee payer>
```

### 10. Devnet deployment & seeding

```bash
# Deploy / upgrade the program
solana program deploy target/deploy/roosta.so \
  --program-id 3i5GgdaySbxcBB133fp2Nyk9ER66d1fEGyTFCxqdjWqv \
  --url devnet

# Seed three demo circles in distinct lifecycle states
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com \
  ANCHOR_WALLET=$HOME/.config/solana/id.json \
  npx tsx tests/seed-3-circles.ts
```

### 11. Known limits / V1 roadmap

- **No mainnet deploy.** MVP is Devnet-only; a security audit is required before mainnet.
- **Position NFT metadata** is served dynamically from `/api/nft-metadata/...`. Long-term this should move to Arweave for permanence.
- **Position NFTs are intentionally non-tradable** — the freeze authority is held by the program. Secondary markets are out of scope.
- **Helius free tier** caps at 1M requests/month. Production load will need a paid plan or a self-hosted indexer.
- **Gasless Phase 3 (session wallet)** is not yet implemented.
- **Notification channels** (Discord, Telegram, email) are V1 scope, not MVP.

### 12. Repo layout

```
.
├── programs/roosta/             # Anchor program (Rust)
│   ├── src/
│   │   ├── lib.rs
│   │   ├── state/               # Circle / Round / MemberStatus / CreditProfile / UserVault
│   │   ├── instructions/        # 15+ instruction handlers
│   │   ├── credit_helpers.rs
│   │   ├── constants.rs
│   │   └── errors.rs
├── tests/                       # Anchor integration tests + seed scripts
├── app/                         # Next.js 16 frontend
│   ├── app/                     # App Router pages + API routes
│   ├── components/
│   ├── lib/
│   └── public/                  # Roosta brand assets
├── brand/                       # Logos, favicons, design tokens
├── scripts/                     # Playwright recorder + TTS pipeline
│   └── out/handoff/             # Demo video + audio + subtitles + scene script
├── Anchor.toml
├── Cargo.toml
└── README.md
```

### 13. Credits

Built for the Solana hackathon submission. Standing on the shoulders of `mpl-token-metadata`, `anchor-lang`, `anchor-spl`, `@solana/wallet-adapter`, and the Helius DAS API.

---

Issues and questions: please use GitHub Issues.
