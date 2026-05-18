# Roosta — QA Report (Solana hackathon build)

Run date: 2026-05-16  •  Branch: main  •  Gatekeeper: QA agent  •  Sweep #2 (final)

## Release verdict

**🟢 RELEASE READY (devnet / hackathon).**

조건부:
- (1) 본 sweep 결과 + 가정 정책 (`POLICY_ASSUMPTIONS.md`) 가 product owner 에게 공지된 후
- (2) F-005 (Trust Gate on-chain bypass) 가 "현재로선 알려진 security finding 으로 수용" 명시적 사인오프
- (3) Mainnet 전환은 별도 sweep (감사 + on-chain Tier 추가 + 정책 확정 후)

## Commands executed (sweep #2)

| Command | Result | Evidence |
|---|---|---|
| `cd app && npx tsc --noEmit` | ✅ PASS | exit 0 |
| `cd app && npx eslint --max-warnings=0 .` | ✅ PASS | 0 errors, 0 warnings (sweep #1: 8/5 → sweep #2: 0/0) |
| `cd app && NEXT_PUBLIC_ENABLE_TEST_WALLET=1 npx next build` | ✅ PASS | 13 routes |
| HTTP smoke (`/`, `/circles`, `/profile`, `/demo`, `/api/circles`, `/api/relayer/status`) | ✅ PASS | all 200 |
| `playwright test` (desktop + mobile, prod build) | ✅ PASS | **32/32** |
| `anchor test --provider.cluster localnet` | ✅ PASS | **16/16** (15 lifecycle + 1 F-005 regression) |
| `qa:all` (aggregator script) | ✅ PASS | 위 모든 단계를 직렬로 실행 |

## E2E spec inventory (Playwright, prod build)

| Spec | Tests | Coverage | 상태 |
|---|---|---|---|
| `01-home-renders` | 5 | `/`, `/circles`, `/profile`, `/demo`, connect button | ✅ × 2 projects |
| `02-wallet-connect` | 1 | KeypairWalletAdapter UI 연결 | ✅ × 2 |
| `03-real-transaction` | 1 | **실제 devnet `SystemProgram.transfer` 1M lamport** + chain confirm + 수신자 잔액 검증 | ✅ × 2 |
| `04-api-contracts` | 5 | RQ-CIRCLE-02, RQ-GASLESS-02·03, RQ-NFT-METADATA-01, RQ-TRUSTGATE-01 | ✅ × 2 |
| `05-wallet-lifecycle` | 1 | connect → disconnect → reconnect | ✅ × 2 |
| `06-circle-create-input-fuzz` | 3 | RQ-CIRCLE-01 form boundary (member_count=0, contribution=0) | ✅ × 2 |
| **Total** | **16 × 2** | **= 32 specs** | **✅ 32/32** |

## Anchor instruction lifecycle (anchor test, localnet)

| Suite | tests | 결과 |
|---|---|---|
| `tests/roosta.ts` (vault init / create / join / 5 rounds + payouts / withdraw) | 5 | ✅ 5/5 |
| `tests/02_credit_profile.ts` (SBT mint + idempotent) | 1 | ✅ 1/1 |
| `tests/03_risk_lifecycle.ts` (risk + Locked Reserve) | 5 | ✅ 5/5 |
| `tests/04_default.ts` (delayed → default → slash → settle) | 2 | ✅ 2/2 |
| `tests/05_position_nft.ts` (Metaplex mint + double-mint reject) | 2 | ✅ 2/2 |
| **`tests/06_trust_gate_bypass.ts` (F-005 regression — bypass demonstrated)** | 1 | ✅ 1/1 (intent: assert current behavior; flips when fixed) |
| **Total** | **16** | **✅ 16/16** |

## Bugs found & fixed in this sweep

| ID | Issue | 위치 | 처리 |
|---|---|---|---|
| F-001 | `react-hooks/set-state-in-effect` × 8 errors | wallet-panel, trust-gate-modal, profile, circles/[id], circles/[id]/join | ✅ **FIXED** — lazy initial state + async IIFE + setTimeout(0) defer + microtask. Regression: lint --max-warnings=0 게이트가 향후 재발 즉시 차단. |
| F-002 | strict-page fixture false positive on Next.js prefetch abort | e2e/fixtures/strict-page.ts | ✅ FIXED — `_rsc=…` URL + `net::ERR_ABORTED` 조합만 무시. |
| F-003 | 100k lamport 전송이 rent-exempt 미달 | e2e/03-real-transaction.spec.ts | ✅ FIXED — 1M lamport. |
| F-004 | 브라우저 번들이 `@solana/web3.js` dynamic import 불가 | e2e/03-real-transaction.spec.ts | ✅ FIXED — Node 측 트랜잭션, in-browser sign 은 02 spec 이 따로 검증. |
| F-005 | Trust Gate on-chain 미검증 (Tier 0 wallet 이 SDK 우회로 join 가능) | programs/roosta/src/instructions/join_circle.rs | ⚠️ **DOCUMENTED, NOT FIXED** — `tests/06_trust_gate_bypass.ts` 가 현재 동작을 박제. Anchor 측 on-chain Tier 체크 추가는 별도 PR (mainnet 전제). |
| F-006 | unused vars × 4 (`_circle`, `Connection`, `_r`, `getReadOnlyProgram`) | 4 files | ✅ FIXED — 삭제 또는 prop comment 로 대체. |

## Lint baseline 변화

| sweep | errors | warnings |
|---|---|---|
| #0 (baseline) | 8 | 5 |
| #1 (e2e infra 추가만) | 8 | 5 |
| **#2 (F-001/F-006 fix)** | **0** | **0** |

## Requirement coverage 변화

| sweep | ✅ | ⚠️ | ⏳ | 🚧/📌 |
|---|---|---|---|---|
| #0 | 0 | 0 | 19 | 3 |
| #1 (anchor test 후) | 10 | 1 | 8 | 3 |
| **#2 (final)** | **18** | **1 (F-005 박제)** | **0** | **3 (assumed policy, 확정 대기)** |

## Spec gap assumed policies (`POLICY_ASSUMPTIONS.md`)

3개 요구사항이 product spec 부재로 가정 정책 채택:

| ID | 가정 | 미반영 항목 |
|---|---|---|
| RQ-RESERVE-01 | unlock 은 수동 트리거 + UI 노출 (슬롯 0/1 만) | UI 버튼 미구현 |
| RQ-GASLESS-01 | fallback 허용, 단 UI 배너 + mainnet gate 필요 | 배너 + 환경 분기 미구현 |
| RQ-FAUCET-01 | 지갑당 lifetime 1회 + IP 5/5min + mainnet 비활성 | 제한 미구현 |

Product owner 확정 응답이 오면 [POLICY_ASSUMPTIONS.md](POLICY_ASSUMPTIONS.md) 양식으로 회신, 매트릭스에 정식 ✅ 로 승격.

## Remaining risks

1. **F-005 (Trust Gate)** — devnet/해커톤에서는 데모용 wallet 만 접근하므로 risk 낮음. Mainnet 으로 가기 전 on-chain Tier 체크 필수.
2. **Helius free tier 1M req/month** — Trust Gate / wallet-history 가 의존. 트래픽 폭증 시 503 가능.
3. **Relayer SPOF + IP rate limit 30/5min** — 해커톤 OK, mainnet 부적합. ALLOWED_PROGRAMS 거부와 429 동작 자체는 검증됨 (RQ-GASLESS-02·03).
4. **NFT metadata 영속화 없음** — API 다운 시 metadata 손실. 검증됨 (RQ-NFT-METADATA-01) 으로 동작 확인은 됐으나 영속성 별도.
5. **Devnet RPC airdrop 429** — `app/scripts-seed.mjs` 로 로컬 keypair 에서 top-up 가능. CI 에서는 e2e/.cache 캐시 의존.
6. **Mainnet 미감사** — README 명시.
7. **Spec gap 3건** — assumed policy 로 임시 운영 중, 확정 필요.

## Manual checklist (사람이 직접 확인해야 함)

자동화하지 못한 항목:

- [ ] Phantom 실제 지갑 (테스트 wallet 아님) 연결/해제 흐름
- [ ] 새 circle 생성 (UI form 으로 끝까지) → 30초 내 "/" 목록에 노출
- [ ] SBT 가 실제 Phantom UI 에서 전송 불가인지 (Token-2022 NonTransferable)
- [ ] mark_default 버튼이 grace_period 경과 전에는 비활성화/숨김
- [ ] 데모 시나리오 3종이 "/demo" 에서 정상 재생
- [ ] tablet (768px) 레이아웃 — desktop+mobile 만 자동화
- [ ] Backpack / Solflare 호환성

## Not covered by tests

- Helius 외부 API 응답 shape 변경
- 메인넷 (devnet only)
- Phantom adapter 자체 동작
- 결제/외부 유료 API (해당 없음)

## Sign-off summary

✅ 모든 알려진 blocker 처리됨:
- F-001 (lint) — 완전 해소.
- F-005 (security) — 회귀 spec 으로 박제, mainnet 전 fix 필요로 명시.
- ⏳ 미검증 8건 → 전부 spec 추가로 ✅.
- 🚧 spec gap 3건 → assumed policy 문서화 + 확정 대기.

✅ 모든 게이트 GREEN: tsc / lint / build / smoke / playwright 32/32 / anchor 16/16.

본 sweep 의 산출물 (specs, fixture, lint 수정, POLICY_ASSUMPTIONS) 은 모두 `docs/qa/` 와 `e2e/` 에 반영됨. Phase B (Telegram) 진행 가능.

---

## Sweep #2 (2026-05-18) — cold build + state matrix

Mirror of the Roosta-TG sweep — same shape, adapted for Solana stack.

### New scripts / commands

- `scripts/qa-build-cold.mjs` + `qa:build:cold`:
  Wipes `app/.next` + `target/idl|types` + `app/node_modules/.cache`,
  runs `npm install` + `next build` + `anchor build`. Catches the
  Vercel cache-miss + anchor build-cache-gap failure modes locally.

### New spec

- `e2e/07-circle-detail-states.spec.ts`:
  - disconnected visitor → public info visible, member CTAs hidden
  - connected test-wallet (non-member) → real ed25519-keypair-signed
    connect via the existing `KeypairWalletAdapter`, still no
    Deposit/Payout for non-members
  - `/demo` route mounts without wallet or chain

### strict-page filter extension

Ignored `net::ERR_ABORTED` on `api.devnet.solana.com` / `fonts.gstatic.com`
/ `helius` URLs (external aborts during nav). Response status 4xx/5xx
checks still propagate.

### Test totals (chromium-desktop, qa:e2e:prod)

19 passed, 0 failed. Up from 16-spec baseline of Sweep #1.

Anchor test suite: 16/16 unchanged.
Lint: 0/0 unchanged.
