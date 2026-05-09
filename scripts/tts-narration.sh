#!/bin/bash
set -e
OUT=/home/jhenry/workspace/jhw99/Roosta/scripts/out
MODEL=/tmp/voices/en_US-amy-medium.onnx
mkdir -p "$OUT/audio"

# Beat 1 — Problem (0:00–0:30)
cat <<'EOF' | piper --model "$MODEL" --output_file "$OUT/audio/b1.wav"
A billion people participate in rotating savings groups every day. Korean kye. Mexican tanda. West African sou-sou. Neighbors pool money each cycle and rotate the payout to one member at a time — the world's oldest form of community finance. But the same problems repeat in 2026. Organizers disappear with the pot. Payment records live in messy group chats. And even the most reliable participants build no portable credit.
EOF

# Beat 2 — Solution (0:30–1:00)
cat <<'EOF' | piper --model "$MODEL" --output_file "$OUT/audio/b2.wav"
Roosta turns rotating savings into a Solana-native protocol. The smart contract replaces the human organizer. Every deposit and payout flows through on-chain escrow, fully verifiable. Four primitives carry the social fabric on-chain. Position NFTs encode a member's slot in the rotation. Collateral NFTs lock risk deposits for early payout slots. Credit SBTs — non-transferable Token-2022 reputation tokens — track each wallet's behavior. And Trust Gate decides who can claim the high-value early slots.
EOF

# Beat 3 — Create + Trust Gate (1:00–1:40)
cat <<'EOF' | piper --model "$MODEL" --output_file "$OUT/audio/b3.wav"
Creating a circle takes thirty seconds. Set the basics — member count, contribution, round duration. Then open Risk Parameters: toggle Trust Gate, Risk Deposit, and Locked Reserve. From a fully trustless friend group to a strongly collateralized public pool. When a new member tries to claim slot one — the first to receive — Trust Gate evaluates them in real time. We pull wallet age, transaction history, and asset holdings from Helius, combine them with their on-chain Credit SBT, and compute a Trust Tier. Below Tier 3, slot one is automatically rejected.
EOF

# Beat 4 — Vault, Deposit, Payout (1:40–2:15)
cat <<'EOF' | piper --model "$MODEL" --output_file "$OUT/audio/b4.wav"
Members initialize a Roosta vault — a Polymarket-style proxy wallet — and top it up once. After that, every deposit pulls from the vault automatically. When you join, a real Metaplex Position NFT is minted to your wallet. Payout order is encoded as a trait, and the token account is frozen, so it can't be transferred. Once everyone has deposited, the contract settles the round automatically. The recipient receives the pot. Every transaction lives on Solana Explorer, forever.
EOF

# Beat 5 — Default + Credit SBT (2:15–2:45)
cat <<'EOF' | piper --model "$MODEL" --output_file "$OUT/audio/b5.wav"
What happens when someone misses a payment? After the round deadline, mark delayed. After the grace period, mark default. If the missing member is in slot one or two — an early borrower — their collateral and remaining locked reserve are slashed automatically. The kicker: their Credit SBT updates instantly. Default count up. Trust Tier reset to zero. Built on Token 2022's NonTransferable extension, so the reputation cannot be moved. This is real, portable, on-chain credit.
EOF

# Beat 6 — Why Solana + Vision (2:45–3:00)
cat <<'EOF' | piper --model "$MODEL" --output_file "$OUT/audio/b6.wav"
Sub-cent fees. Four-hundred-millisecond confirmations. Native USDC. Token 2022. Plus a gasless relayer layer means users don't even need to hold SOL. A billion people, already doing the oldest form of finance — now portable, transparent, and on-chain. Try it today on Devnet at roosta-mvp dot vercel dot app.
EOF

ls -la "$OUT/audio/"
