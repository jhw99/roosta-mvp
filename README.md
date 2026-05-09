# Roosta — On-chain Social Savings on Solana

> Trustless ROSCA (rotating savings) on Solana. Friends pool USDC each round; the smart contract pays out to one member at a time, fully on-chain.

## Live demo

- **App**: https://roosta-mvp.vercel.app/
- **Program (Devnet)**: [`3i5GgdaySbxcBB133fp2Nyk9ER66d1fEGyTFCxqdjWqv`](https://explorer.solana.com/address/3i5GgdaySbxcBB133fp2Nyk9ER66d1fEGyTFCxqdjWqv?cluster=devnet)
- **Mock USDC mint (Devnet)**: `EVfLhS7j4nbC4Ln1VpVh7fHJruwWqZUUEE1tHNuYFkDu`

## How to try it

1. Connect Phantom (set wallet to **Devnet** in settings).
2. Visit `/circles`, click **Get 1000 mock USDC** (mints to your wallet).
3. Click **+ New Circle** — set name, member count (2–10), contribution amount, round duration.
4. Open the circle page; share the URL with friends. Each friend connects, gets mock USDC, and clicks **Join**.
5. When the circle fills, every member clicks **Deposit** for the current round.
6. Once all deposits are in, anyone clicks **Trigger Payout** — the recipient receives the full pot.
7. The contract advances to the next round automatically.

## Architecture

```
Next.js 16 app  ─►  Solana Devnet RPC
                      └─ Roosta Anchor Program
                            ├─ create_circle
                            ├─ join_circle
                            ├─ deposit       (from user vault)
                            ├─ trigger_payout (to recipient vault)
                            ├─ init_user_vault
                            ├─ top_up_vault
                            └─ withdraw_vault
                      └─ Mock USDC SPL Token
```

### Wallet vault model (Polymarket-style proxy wallet)

Each user has a program-owned **Roosta vault** (a PDA + token account) that
holds their USDC for circle activity. The flow is:

1. **Initialize vault** — one-time PDA + token-account creation
   (`init_user_vault`). Done from the wallet popover in the header.
2. **Top up** — move USDC from your main wallet ATA into the vault
   (`top_up_vault`).
3. **Deposit / payout** — circle deposits debit your vault automatically; round
   payouts credit the recipient's vault. Members never have to sign each time
   if the vault is funded.
4. **Withdraw** — pull funds back to your main ATA at any time
   (`withdraw_vault`).

The wallet popover (top-right of the header) shows your wallet balance, vault
balance, top-up / withdraw controls, the test-USDC faucet, and a quick list of
circles you've joined.

- **Anchor program** (`programs/roosta/`) — Rust, Anchor 0.31.1
- **Frontend** (`app/`) — Next.js 16, Tailwind v4, Solana Wallet Adapter
- **Faucet API** (`app/app/api/faucet/route.ts`) — server-side mints mock USDC to any wallet

## Local dev

```bash
# Build + test the program (localnet)
anchor test

# Run the frontend
cd app && npm install && npm run dev
```

## Devnet deploy

```bash
solana airdrop 2  # need ~3 SOL of rent for first deploy
anchor deploy --provider.cluster devnet
```

## Demo seed (5-member circle, end-to-end)

```bash
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com \
  ANCHOR_WALLET=~/.config/solana/id.json \
  npx ts-node tests/seed.ts
```

Generates 5 fresh keypairs, funds them with 0.05 SOL + 1000 mock USDC each, runs all 5 rounds, and prints the circle address.

### Multi-circle demo seed

```bash
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com \
  ANCHOR_WALLET=~/.config/solana/id.json \
  npx tsx tests/seed-3-circles.ts
```

Creates three circles in distinct lifecycle states (forming, mid-flight,
completed) for richer dashboard demos.

## Status

MVP scope (P0 + P1 from `GSD_Roosta_MVP.md`):

- [x] Smart contract: create / join / deposit / payout
- [x] Devnet deployment
- [x] Frontend: 5 pages, Phantom wallet
- [x] On-chain Solana Explorer receipts
- [x] Mock USDC faucet
- [x] Seed script
- [ ] Demo video (P1)
- [ ] Reputation preview page (P1)

Out of scope: mainnet, KYC, custom domain, mobile app, multi-language. See `GSD_Roosta_MVP.md` for full spec.

## License

Internal MVP.
