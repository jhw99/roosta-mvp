# Roosta

> 솔라나 위에서 돌아가는 ROSCA(회전 저축계) 프로토콜.
> 사람을 믿어야 했던 가장 오래된 금융을, 코드가 보증하는 형태로 재구성했습니다.

**Live**: https://roosta-mvp.vercel.app · **Devnet Program**: [`3i5Ggda…WqdjWqv`](https://explorer.solana.com/address/3i5GgdaySbxcBB133fp2Nyk9ER66d1fEGyTFCxqdjWqv?cluster=devnet)

---

## 한 페이지 요약

### 무엇인가

ROSCA(Rotating Savings and Credit Association) — 한국의 계, 멕시코의 *tanda*, 서아프리카의 *sou-sou* — 는 전 세계 10억 명이 매일 이용하는 가장 오래된 사회적 저축 형태다. **Roosta는 이 구조를 솔라나 스마트 컨트랙트로 옮긴 프로토콜**이다. 계주 역할을 사람이 아닌 PDA가 수행하며, 모든 입금·지급·신용 이력은 온체인에 영속적으로 기록된다.

### 무엇을 해결했나

| 기존 ROSCA의 문제 | Roosta의 해법 |
|---|---|
| 계주가 자금을 들고 사라짐 | Vault PDA가 자금 보관, 계주 권한 무효화 |
| 자금 흐름·납부 이력이 카톡방·수기로만 존재 | 모든 트랜잭션이 솔라나 익스플로러에 영속 기록 |
| 1·2번 이른 수령자의 도주 리스크 | Risk Deposit + Locked Reserve로 자동 슬래시 |
| 신뢰 기록이 다음 그룹으로 이전되지 않음 | Token-2022 NonTransferable Credit SBT로 영속 신용 |
| 신원 불명의 신청자에 대한 사전 검증 부재 | Helius 지갑 이력 + 온체인 Credit SBT 기반 Trust Gate |

### 핵심 차별점

1. **온체인 ROSCA 프로토콜로서는 이른 수령자의 도주 리스크를 경제적 게임 이론으로 해결한 첫 시도**. 1·2번 슬롯의 보증금 + Locked Reserve는 항상 default 시 이익을 초과하도록 설계.
2. **양도 불가능한 신용 점수(Credit SBT)**가 지갑을 따라다닌다. 도주해도 새 지갑으로 갈아탈 수 없다.
3. **Polymarket 스타일 프록시 지갑**으로 매 회차 지갑 팝업 없이 자동 차감.
4. **Gasless 릴레이어**로 사용자가 SOL을 보유할 필요 없음.
5. **Position NFT**(Metaplex)는 회차 권리를 시각적으로 증명하며 동결되어 양도 불가능하다.

### 기술 스택

Anchor 0.31.1 · Solana Devnet · SPL Token-2022 NonTransferable · Metaplex Token Metadata · Next.js 16 · Tailwind v4 · Helius RPC + DAS · Vercel · 자체 fee payer relayer

### 검증 상태

- 15개 인스트럭션 모두 Anchor 통합 테스트 통과
- Devnet 라이브 배포 + 3개 데모 서클 시드 완료(forming / mid-flight / completed)
- 프론트엔드 7페이지 라이브 + 자동 녹화 데모 영상 1440p 제작

---

## 데모 빠르게 보기

| 자료 | 위치 |
|---|---|
| 데모 영상 (3:13, 1440p, 무음·무자막 raw) | `scripts/out/handoff/roosta-demo-1440p.mp4` |
| 영상 핸드오프 패키지 (음성/자막/scene script 포함) | `scripts/out/handoff/` 또는 [Downloads/roosta-demo-handoff.zip](#) |
| Live 사이트 | https://roosta-mvp.vercel.app |
| 프리뷰 모드 (지갑 mock 연결 상태) | https://roosta-mvp.vercel.app/?preview=1 |
| 솔라나 익스플로러 — 프로그램 | https://explorer.solana.com/address/3i5GgdaySbxcBB133fp2Nyk9ER66d1fEGyTFCxqdjWqv?cluster=devnet |
| 솔라나 익스플로러 — Mock USDC | https://explorer.solana.com/address/EVfLhS7j4nbC4Ln1VpVh7fHJruwWqZUUEE1tHNuYFkDu?cluster=devnet |

### 사용자 흐름

1. https://roosta-mvp.vercel.app 접속 — 활성 서클 즉시 노출
2. Phantom 지갑(Devnet 모드)을 우상단 Wallet 버튼으로 연결
3. Wallet 패널에서 Initialize Vault → Get 1000 mock USDC → Top up
4. 원하는 서클 → Join → Trust Gate 평가 통과 → Position NFT 자동 발급
5. Deposit 시 Roosta vault에서 자동 차감
6. 모든 멤버 입금 완료 시 Settle Round 자동 호출 → 수령자에게 USDC 송금
7. Profile 페이지에서 Trust Tier · Credit SBT · 보유 Position NFT 확인

---

## 상세 내용

### 1. 시스템 아키텍처

```
┌──────────────────────────────────────────────────────────────┐
│  Browser                                                     │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Next.js 16 (App Router) · Tailwind v4 · Inter font    │  │
│  │  · Solana Wallet Adapter (Phantom, Backpack 자동검출)  │  │
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
│  · 지갑 이력             │   │  │ Metaplex Token Metadata  │  │
│  · 자산 보유 패턴         │   │  │ (Position / Collateral)  │  │
└──────────────────────────┘   │  ├──────────────────────────┤  │
                               │  │ SPL Token-2022           │  │
                               │  │ NonTransferable Mint     │  │
                               │  │ (Credit SBT)             │  │
                               │  └──────────────────────────┘  │
                               └────────────────────────────────┘
```

### 2. 4개의 핵심 메커니즘

**Position NFT (Metaplex)** — 회차 순서를 트레이트로 인코딩한 진짜 NFT. 토큰 계정이 동결되어 매매 불가능하므로 참여 권리의 검증 가능한 증서 역할을 한다.

**Risk Deposit + Locked Reserve** — payout_order 0·1번 멤버는 `contribution × member_count × ratio%` 만큼의 USDC를 collateral_vault PDA에 사전 예치한다. 수령액의 일부는 Locked Reserve로 묶여 후속 라운드마다 비례 해제된다. Default 시 두 자산 모두 자동 슬래시.

**Credit SBT (Token-2022 NonTransferable)** — 첫 `init_credit_profile` 호출 시 양도 불가능한 SBT가 발급된다. on-time 납부, late, default, slash 이력은 모두 SBT가 가리키는 CreditProfile PDA에 기록된다. 도주 후 새 지갑을 만들어도 신용은 0부터 다시 쌓아야 한다.

**Trust Gate** — 1번 슬롯은 Tier 3 이상, 2번 슬롯은 Tier 2 이상이어야 진입 가능하다. Tier는 (a) Helius로 가져온 지갑 나이·tx 카운트·자산 보유 이력, (b) 온체인 Credit SBT의 누적 이력을 결합해 산정.

### 3. Anchor 인스트럭션 카탈로그

| ID | Instruction | 역할 |
|---|---|---|
| SC-01 | `create_circle` | 서클 PDA · vault · collateral_vault · round 1 동시 초기화. 12개 args(이름·인원·라운드 수·금액·기간·Trust Gate flag·Risk Deposit flag·Locked Reserve flag·collateral ratio·reserve ratio·grace period 등). |
| SC-02 | `init_user_vault` | 사용자별 프록시 지갑(UserVault PDA + token account) 생성. |
| SC-03 | `top_up_vault` | 사용자의 메인 ATA → user_vault_token_account. |
| SC-04 | `withdraw_vault` | user_vault → 메인 ATA. PDA가 seeds로 서명. |
| SC-05 | `init_credit_profile` | CreditProfile PDA 생성 + Token-2022 NonTransferable SBT 민팅. 멱등성 보장. |
| SC-06 | `join_circle` | 멤버 등록, payout_order 할당, 서클이 가득 차고 collateral 조건 충족 시 라운드 1 자동 활성화. |
| SC-07 | `mint_position_nft` | Metaplex CPI로 Position NFT 민팅 + 토큰 계정 동결(freeze authority = 프로그램 PDA). |
| SC-08 | `deposit_risk_collateral` | payout_order ∈ {0, 1} 멤버가 보증금 예치(라운드 1 시작 전). |
| SC-09 | `try_activate_round1` | 가입 + 보증금 조건 충족 후 라운드 1을 명시적으로 Active로 전환. |
| SC-10 | `deposit` (deposit_contribution) | 회차별 USDC를 user_vault에서 circle vault로. CreditProfile에 on-time / late 자동 기록. |
| SC-11 | `trigger_payout` (settle_round) | 모든 멤버 입금 완료 시 vault → 수령자 user_vault. payout_order 0·1번이면 일부를 Locked Reserve로 분리. 다음 라운드 자동 초기화. |
| SC-12 | `unlock_reserve` | 후속 라운드 settle 후 Locked Reserve 비례 해제. |
| SC-13 | `mark_delayed` / `mark_member_delayed` | 라운드 마감 경과 시 라운드를 Delayed로, 미납 멤버를 Delayed로 마킹. CreditProfile.late_payments++. |
| SC-14 | `mark_default` | grace period 경과 시 멤버를 Defaulted로. CreditProfile.defaults++. |
| SC-15 | `slash_collateral` | Defaulted 멤버의 collateral + 남은 reserve를 circle vault로 이동. CreditProfile.trust_tier을 Tier0New로 강등. 라운드의 deposits_count를 채워 settle 가능하게 만듦. |

각 인스트럭션의 통합 테스트는 `tests/` 아래에 있으며, 모두 `anchor test --provider.cluster localnet`에서 통과한다.

### 4. 데이터 모델 (PDA)

| 계정 | Seeds | 핵심 필드 |
|---|---|---|
| `Circle` | `["circle", authority, circle_id LE]` | name, member_count, total_rounds, current_round, contribution_amount, round_duration, vault, collateral_vault, members, payout_order, **trust_gate_enabled, risk_deposit_enabled, locked_reserve_enabled, early_position_collateral_ratio, locked_reserve_ratio, grace_period_seconds, risk_collaterals_collected, round1_activated** |
| `Round` | `["round", circle, [n u8]]` | round_number, recipient, deposits_count, status (Pending/Active/Settled/Delayed), started_at, **deadline, total_collected, payout_amount, reserve_amount, delayed_at**, deposits |
| `MemberStatus` | `["member", circle, wallet]` | wallet, **payout_order, status_enum (Active/Paid/Received/Completed/Delayed/Defaulted/Slashed), position_nft_mint, collateral_nft_mint, collateral_amount, locked_reserve_amount, locked_reserve_initial, locked_reserve_unlocks_done, default_count, last_delayed_round, last_defaulted_round, slashed, shortfall**, total_deposited, deposit_count, missed_count, received_amount |
| `CreditProfile` | `["credit", wallet]` | wallet, sbt_mint, trust_tier, circles_completed, on_time_payments, late_payments, defaults, total_volume, early_position_eligible, last_updated_at |
| `UserVault` | `["user_vault", wallet]` | user, bump · 연관 토큰 계정: `["user_vault_ata", wallet]` |

### 5. Trust Tier 산정 규칙

```
defaults > 0  OR  slashed_count > 0    → Tier 0 (강제)
walletAge < 30d  OR  txCount < 5       → Tier 0
completed_circles == 0                  → Tier 1 (recent activity 있을 때)
completed_circles ≥ 1, late ≤ 2         → Tier 2
completed_circles ≥ 3, late ≤ 1         → Tier 3
completed_circles ≥ 5, late == 0        → Tier 4 (Guarantor)
```

슬롯별 진입 조건:
- 1번 슬롯: Tier 3+ AND 보증금 예치 AND Locked Reserve 동의
- 2번 슬롯: Tier 2+ AND 보증금 예치
- 3번 이상: 지갑 1일 이상

### 6. T-wave 경제 룰 (default cost)

```
default_cost = risk_deposit_slash               (slot 0·1: 100% slash)
             + locked_reserve_slash             (남은 reserve 전액)
             + Credit SBT 영구 negative record  (defaults++, tier reset)
             + 향후 서클의 collateral 요구 증가
```

설계 원칙: `default_benefit < default_cost` 가 항상 성립하도록 ratio를 설정.

### 7. Gasless 릴레이어

- **Phase 1 (UI)**: 모든 트랜잭션 버튼에 "✨ Gas covered by Roosta" 배지 노출
- **Phase 2 (Fee Payer)**: 클라이언트가 `tx.feePayer = ROOSTA_RELAYER`로 빌드 → 사용자 지갑이 부분 서명 → `/api/relayer`가 fee payer 서명 추가 후 RPC 제출. 트랜잭션 명세는 Roosta·System·Token·Token-2022·ATA·Metaplex 프로그램 ID만 허용하는 allowlist로 검증해 grief 방지. IP당 5분 30회 rate limit.
- **Phase 3 (Session Wallet)**: 다음 단계 — 24시간 ephemeral 키페어 위임으로 회차 입금 시 popup 없이 자동 서명.

### 8. 프론트엔드 페이지 맵

| 경로 | 역할 |
|---|---|
| `/` | 활성 서클 대시보드 (top 10 + More 링크) |
| `/circles` | 전체 아카이브, All / Mine 필터 |
| `/circles/new` | 서클 생성 폼 + Risk Parameters 토글 섹션 |
| `/circles/[id]` | 디테일: 멤버 행, 라운드 진행, 보증금/리저브 상태, NFT mint 익스플로러 링크, 데이터·지갑 액션 버튼 |
| `/circles/[id]/join` | 슬롯 선택 + Trust Gate 모달 평가 |
| `/profile` | Trust Tier 배지, Credit SBT, 보유 Position NFT 그리드, 서클 통계 |
| `/demo` | 3개 시나리오(Happy / Trust Gate Rejection / Default+Slash) 가이드 |

전 페이지 모바일 대응. CSS 토큰은 `app/app/globals.css`에서 Roosta 브랜드 팔레트 정의. 폰트는 Inter(본문/디스플레이), JetBrains Mono(코드).

### 9. 로컬 개발

```bash
# 컨트랙트
anchor build
anchor test                     # localnet, 전체 통합 테스트 통과

# 프론트엔드
cd app
npm install
npm run dev                     # http://localhost:3000

# 데모 영상 자동 녹화 (Playwright)
npx playwright install chromium
npx tsx scripts/record-demo.ts  # → scripts/out/roosta-demo.webm
```

필수 환경 변수(`app/.env.local`):

```
NEXT_PUBLIC_PROGRAM_ID=3i5GgdaySbxcBB133fp2Nyk9ER66d1fEGyTFCxqdjWqv
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_USDC_MINT=EVfLhS7j4nbC4Ln1VpVh7fHJruwWqZUUEE1tHNuYFkDu
NEXT_PUBLIC_RELAYER_PUBKEY=<릴레이어 공개키>
HELIUS_API_KEY=<Helius API key>
FAUCET_SECRET=<base58 encoded keypair, mint authority>
RELAYER_SECRET=<base58 encoded keypair, fee payer>
```

### 10. Devnet 배포 / 시드

```bash
# 프로그램 배포(첫 회 + 사이즈 변경 시)
solana program deploy target/deploy/roosta.so \
  --program-id 3i5GgdaySbxcBB133fp2Nyk9ER66d1fEGyTFCxqdjWqv \
  --url devnet

# 데모 서클 3개(forming/mid/completed) 자동 시드
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com \
  ANCHOR_WALLET=$HOME/.config/solana/id.json \
  npx tsx tests/seed-3-circles.ts
```

### 11. 알려진 한계 / V1 로드맵

- **Mainnet 미배포**: 보안 감사 후 진행 예정. MVP는 Devnet 한정.
- **Position NFT 메타데이터**: `/api/nft-metadata/...`에서 동적으로 발급되며 Vercel 배포 의존. 향후 Arweave 영구 호스팅으로 전환 검토.
- **Position NFT 2차 거래 비활성화**: freeze authority가 프로그램 PDA에 묶여 있다. 의도된 비양도성.
- **Helius rate limit**: 월 100만 요청 무료 플랜. 트래픽 증가 시 유료 플랜 필요.
- **Gasless Phase 3 (Session Wallet) 미구현**: 다음 스프린트.
- **Discord/Telegram 알림 미통합**: V1 로드맵.

### 12. 디렉토리 구조

```
.
├── programs/roosta/             # Anchor 프로그램 (Rust)
│   ├── src/
│   │   ├── lib.rs
│   │   ├── state/               # Circle / Round / MemberStatus / CreditProfile / UserVault
│   │   ├── instructions/        # 15+ instructions
│   │   ├── credit_helpers.rs
│   │   ├── constants.rs
│   │   └── errors.rs
├── tests/                       # Anchor 통합 테스트 + seed 스크립트
├── app/                         # Next.js 16 frontend
│   ├── app/                     # App Router 페이지 + API routes
│   ├── components/
│   ├── lib/
│   └── public/                  # Roosta 브랜드 자산
├── brand/                       # 로고·favicon·디자인 토큰
├── scripts/                     # Playwright 녹화 + TTS
│   └── out/handoff/             # 데모 영상 + 음성 + 자막 + scene script
├── Anchor.toml
├── Cargo.toml
└── README.md
```

### 13. 라이선스 / 크레딧

내부 MVP. 솔라나 해커톤 제출용 코드. mpl-token-metadata, anchor-lang, anchor-spl, @solana/wallet-adapter, Helius DAS API의 도움을 받았다.

---

문의·이슈는 GitHub Issues로 부탁드립니다.
