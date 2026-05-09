# Roosta — Demo Video Scene Script

**총 길이**: 3:17 · **포맷**: 1440×900, H.264 mp4 · **언어**: English narration + English subs

영상 디자이너 핸드오프용 문서. 각 비트의 화면·내레이션·자막·디자인 노트를 정리.

---

## Beat 1 — Problem (0:00 – 0:31)

**화면**: 홈 hero (Roosta lockup + tagline) → 천천히 스크롤하며 Active circles 그리드 노출.

**내레이션**:
> A billion people participate in rotating savings groups every day. Korean kye, Mexican tanda, West African sou-sou. Neighbors pool money each cycle and rotate the payout — the world's oldest form of community finance. But organizers disappear, records live in messy chats, and reliable participants build no portable credit.

**자막 (burn-in)**:
> A billion people participate in rotating savings groups every day. Korean kye, Mexican tanda, West African sou-sou… But organizers disappear, records live in messy chats, and reliable participants build no portable credit.

**디자인 노트**:
- 톤: 다큐멘터리·차분함
- 텍스트 강조: "kye / tanda / sou-sou" 단어가 나올 때 작은 키워드 오버레이 가능
- 색감: 따뜻한 오렌지 (#E85D2F) hero 그대로

---

## Beat 2 — Solution (0:32 – 1:07)

**화면**: 홈 active circles 카드 hover → /circles 풀 아카이브 페이지 (3장 카드).

**내레이션**:
> Roosta turns rotating savings into a Solana-native protocol. The smart contract replaces the human organizer; every deposit and payout flows through on-chain escrow. Position NFTs encode each member's slot. Collateral NFTs lock risk deposits. Credit SBTs — non-transferable Token-2022 tokens — track behavior. Trust Gate decides who can claim early slots.

**자막**:
> Roosta turns rotating savings into a Solana-native protocol. Position NFTs encode each member's slot. Collateral NFTs lock risk deposits. Credit SBTs track behavior. Trust Gate decides who can claim early slots.

**디자인 노트**:
- "Position NFT / Collateral NFT / Credit SBT / Trust Gate" 4개 키워드를 순차 등장하는 모션 그래픽 추천 (각 1.5–2초씩)
- 다이어그램 아이콘으로 보강 가능

---

## Beat 3 — Create + Trust Gate (1:08 – 1:46)

**화면**: /circles/new 폼 → "Hackathon Demo Circle" 자동 입력 → Risk Parameters 펼침 → /circles/[id]/join 페이지.

**내레이션**:
> Creating a circle takes 30 seconds. Set member count, contribution, and duration. Open Risk Parameters to toggle Trust Gate, Risk Deposit, and Locked Reserve. When a member tries to claim slot one — the first to receive — Trust Gate evaluates them in real time, pulling Helius wallet history and on-chain Credit SBT, computing a Trust Tier. Below Tier 3, slot one is auto-rejected.

**자막**:
> Creating a circle takes 30 seconds… Open Risk Parameters to toggle Trust Gate, Risk Deposit, and Locked Reserve. Trust Gate evaluates members in real time. Below Tier 3, slot one is auto-rejected.

**디자인 노트**:
- Risk Parameters 섹션 펼치는 순간을 강조 (글로우 또는 줌인)
- Trust Tier 0–4 배지가 화면에 잠깐 등장하면 좋음

---

## Beat 4 — Vault, Deposit, Payout, NFT (1:47 – 2:19)

**화면**: 서클 디테일 페이지 — 멤버 5명 행, 각자 payout_order / status / collateral / locked_reserve / Position NFT mint 주소 + Solana Explorer 링크.

**내레이션**:
> Members initialize a Roosta vault — a Polymarket-style proxy wallet — and top up once. Every deposit pulls from the vault automatically. A real Metaplex Position NFT is minted, frozen, non-transferable proof of membership. Once everyone deposits, the contract settles the round automatically. Every transaction lives on Solana Explorer, forever.

**자막**:
> Members initialize a Roosta vault — a Polymarket-style proxy wallet. A real Metaplex Position NFT is minted, frozen, non-transferable proof of membership. Every transaction lives on Solana Explorer, forever.

**디자인 노트**:
- Position NFT mint 주소를 부각 (Explorer 링크 hover 효과)
- "Frozen / Non-transferable" 키워드 슈퍼 추천
- 가능하면 솔라나 익스플로러에 들어간 실제 트랜잭션 캡처 cut 끼워넣기

---

## Beat 5 — Default + Credit SBT Slash (2:20 – 2:53)

**화면**: /demo 페이지 (3개 시나리오 카드) → /profile 페이지 (Trust Tier 배지, Credit SBT mint, completed circles, on-time rate, default count).

**내레이션**:
> What if someone defaults? After the deadline: mark delayed. After grace: mark default. If they're an early borrower, their collateral and locked reserve are slashed. Their Credit SBT updates instantly: default count up, Trust Tier reset. Built on Token-2022 NonTransferable, the reputation can't escape the wallet. Real, portable, on-chain credit.

**자막**:
> What if someone defaults? Their collateral and locked reserve are slashed. Credit SBT updates instantly. Built on Token-2022 NonTransferable, the reputation can't escape the wallet. Real, portable, on-chain credit.

**디자인 노트**:
- 톤 변화: 살짝 무겁게 → 다시 회복 (slash 일러스트 강조)
- Trust Tier 배지가 3 → 0으로 떨어지는 미니 애니메이션 권장
- "Token-2022 NonTransferable"을 텍스트 슈퍼로 띄우기

---

## Beat 6 — Why Solana + Vision (2:54 – 3:17)

**화면**: 홈으로 복귀 → hero + URL "roosta-mvp.vercel.app" 강조.

**내레이션**:
> Sub-cent fees. 400ms confirmations. Native USDC. A gasless relayer means users don't even need to hold SOL. A billion people, doing the oldest form of finance — now portable, transparent, and on-chain. Try it on Devnet at roosta-mvp.vercel.app.

**자막**:
> Sub-cent fees. 400ms confirmations. Native USDC. A gasless relayer means users don't even need to hold SOL. Try it on Devnet at roosta-mvp.vercel.app.

**디자인 노트**:
- 빠른 컷 (각 키워드 0.8초 이내)
- 솔라나 로고·color accent 강조
- 마지막 URL은 정중앙 풀스크린 타이포그래피로 약 3초 hold

---

## 핸드오프 자산

`handoff/` 폴더에 포함:

| 파일 | 설명 |
|---|---|
| `roosta-demo-trimmed.mp4` | 자막·음성 모두 들어간 최종 mp4 (3:17) |
| `roosta-demo.srt` | 외부 자막 트랙 (YouTube 등 업로드용) |
| `narration.wav` | 6개 비트 합쳐진 풀 내레이션 트랙 |
| `audio/b1–b6.wav` | 비트별 음성 (개별 재배치용) |
| `SCENE_SCRIPT.md` | 이 문서 |

## 디자이너에게 전달할 메시지

- 영상 길이는 3분 17초이지만 해커톤 3분 제한이라면 Beat 6의 outro hold를 줄여 정확히 3:00에 맞출 수 있음.
- 음성은 Piper TTS (영문 미국 여성). 좀 더 자연스러운 톤이 필요하면 ElevenLabs / OpenAI tts-1-hd로 재생성 가능 (스크립트 동일 사용).
- 자막은 burn-in이지만 원본 SRT가 있어서 새 폰트·스타일로 다시 burn 가능.
- 색상 가이드 / 로고 변형 / 폰트는 `/brand/` 디렉토리 참조 (Roosta 브랜드 가이드).

---

문의는 프로젝트 README 또는 GitHub 참조.
