#!/bin/bash
set -e
OUT=/home/jhenry/workspace/jhw99/Roosta/scripts/out
mkdir -p "$OUT/audio"
KEY="$OPENAI_API_KEY"
VOICE="onyx"     # alloy, echo, fable, onyx, nova, shimmer
MODEL="tts-1-hd" # higher quality

speak() {
  local id="$1"
  local text="$2"
  echo "→ Synthesizing $id..."
  curl -s https://api.openai.com/v1/audio/speech \
    -H "Authorization: Bearer $KEY" \
    -H "Content-Type: application/json" \
    -d "$(jq -n --arg model "$MODEL" --arg voice "$VOICE" --arg input "$text" \
        '{model:$model, voice:$voice, input:$input, response_format:"mp3"}')" \
    -o "$OUT/audio/$id.mp3"
}

speak b1 "A billion people participate in rotating savings groups every day. Korean kye. Mexican tanda. West African sou-sou. Neighbors pool money each cycle and rotate the payout to one member at a time — the world's oldest form of community finance. But the same problems repeat in 2026. Organizers disappear with the pot. Payment records live in messy group chats. And even the most reliable participants build no portable credit."

speak b2 "Roosta turns rotating savings into a Solana-native protocol. The smart contract replaces the human organizer. Every deposit and payout flows through on-chain escrow, fully verifiable. Four primitives carry the social fabric on-chain. Position NFTs encode a member's slot in the rotation. Collateral NFTs lock risk deposits for early payout slots. Credit SBTs — non-transferable Token-2022 reputation tokens — track each wallet's behavior. And Trust Gate decides who can claim the high-value early slots."

speak b3 "Creating a circle takes thirty seconds. Set the basics — member count, contribution, round duration. Then open Risk Parameters: toggle Trust Gate, Risk Deposit, and Locked Reserve. From a fully trustless friend group to a strongly collateralized public pool. When a new member tries to claim slot one — the first to receive — Trust Gate evaluates them in real time. We pull wallet age, transaction history, and asset holdings from Helius, combine them with their on-chain Credit SBT, and compute a Trust Tier. Below Tier 3, slot one is automatically rejected."

speak b4 "Members initialize a Roosta vault — a Polymarket-style proxy wallet — and top it up once. After that, every deposit pulls from the vault automatically. When you join, a real Metaplex Position NFT is minted to your wallet. Payout order is encoded as a trait, and the token account is frozen, so it can't be transferred. Once everyone has deposited, the contract settles the round automatically. The recipient receives the pot. Every transaction lives on Solana Explorer, forever."

speak b5 "What happens when someone misses a payment? After the round deadline, mark delayed. After the grace period, mark default. If the missing member is in slot one or two — an early borrower — their collateral and remaining locked reserve are slashed automatically. The kicker: their Credit SBT updates instantly. Default count up. Trust Tier reset to zero. Built on Token 2022's non-transferable extension, so the reputation cannot be moved. This is real, portable, on-chain credit."

speak b6 "Sub-cent fees. Four-hundred-millisecond confirmations. Native USDC. Plus a gasless relayer layer means users don't even need to hold SOL. A billion people, already doing the oldest form of finance — now portable, transparent, and on-chain. Try it today on Devnet at roosta-mvp dot vercel dot app."

ls -la "$OUT/audio/"
