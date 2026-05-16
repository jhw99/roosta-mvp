# Roosta — Requirement Traceability Matrix

소스: `README.md`, `hackathon_form_answers_final.md`, `hackathon_form_answers_audited.md`, `programs/roosta/src/lib.rs`.

**중대한 한계**: 별도 product spec / 요구사항정의서 / 화면정의서 / 정책서가 **존재하지 않습니다**. 위 3개 문서 + 코드를 1차 소스로 매트릭스를 구성했습니다. 이 매트릭스의 "기획 의도" 컬럼은 그 3개 문서에 명시적으로 적힌 내용만 옮긴 것이며, 추론한 내용은 `(추론)` 으로 표시했습니다.

상태 코드: ✅ PASS · ❌ FAIL · ⚠️ Partial · ⏳ Not yet verified · 🚧 Spec gap (요구사항 자체가 모호)

| ID | 기획 의도 | 사용자 시나리오 | 관련 화면/기능 | 구현 파일 | 테스트 파일 | 상태 | Gap / Risk | 조치 |
|---|---|---|---|---|---|---|---|---|
| RQ-CIRCLE-01 | 누구나 ROSCA circle 을 만들 수 있다 (member_count, total_rounds, contribution_amount, round_duration + 6개 위험 파라미터) | 사용자가 "/circles/new" 에서 폼 입력 → 트랜잭션 서명 → "/circles/[id]" 로 이동 | `app/app/circles/new/page.tsx`, `Circle::create_circle` | `programs/roosta/src/lib.rs::create_circle` | `tests/roosta.ts` (생성 케이스 포함) | ⏳ | 폼 입력 유효성 검증 (member_count > 255, contribution_amount = 0, negative round_duration) 코드 없음 — fuzz 필요 | E2E spec `01-create-circle.spec.ts` 추가 + boundary 입력 검증 |
| RQ-CIRCLE-02 | Circle 목록을 누구나 조회 가능 (인증 불필요) | "/" 또는 "/circles" 진입 시 활성 circle 카드 노출 | `app/app/page.tsx`, `app/app/circles/page.tsx`, `GET /api/circles` | `app/app/api/circles/route.ts` | 없음 | ⏳ | `revalidate = 30s` — 새 circle 이 최대 30초 stale. UX 시그널 없음. | API contract 테스트 + 새로고침 후 데이터 신선도 검증 |
| RQ-CIRCLE-03 | Circle 상세 보기 (멤버, 라운드, payout order, 상태) | "/circles/[id]" 진입 시 round 진행, member status, NFT mint link 노출 | `app/app/circles/[id]/page.tsx` | `tests/roosta.ts` 의 read after create | ⏳ | 잘못된 id (존재하지 않는 PDA) 입력 시 동작 미정의 | error boundary + 404 UX 검증 |
| RQ-JOIN-01 | Trust Gate 통과한 사용자만 join 가능 | 사용자가 "/circles/[id]/join" 에서 슬롯 선택 → trust gate modal 평가 → `join_circle` 인스트럭션 서명 | `app/app/circles/[id]/join/page.tsx`, `app/components/trust-gate-modal.tsx`, `POST /api/trust-gate` | `programs/roosta/src/lib.rs::join_circle` | 단위는 있음 (tests/03_risk_lifecycle), E2E 없음 | ⏳ | Trust Gate 가 off-chain only — chain 은 재검증 안 함. Tier0 지갑이 직접 `join_circle` 호출하면 통과될 수 있음 (보안 risk) | 회귀 테스트: Tier0 keypair 로 직접 RPC `join_circle` 호출 → 거부되는지 확인 |
| RQ-JOIN-02 | 슬롯 0/1 멤버는 join 전 risk collateral 예치 | join modal 에서 슬롯 0/1 선택 시 collateral 예치 단계 추가 | `app/app/circles/[id]/join/page.tsx`, `deposit_risk_collateral` | `tests/03_risk_lifecycle.ts` | ⏳ | UI 에서 collateral 액수 사전 노출 여부 미검증 | E2E spec 에서 슬롯별 안내 메시지 노출 확인 |
| RQ-JOIN-03 | Position NFT (Metaplex, frozen) mint | join 직후 NFT 자동 mint, profile 에서 확인 가능 | `mint_position_nft`, `app/components/position-nft-badge.tsx` | `tests/05_position_nft.ts` | ⏳ | NFT metadata 가 dynamic API 라서 metadata URI 가 우리 서버 의존 | metadata URI fetch 검증 + 영속성 risk QA_REPORT 에 기록 |
| RQ-CONTRIB-01 | 각 round 마감 전 멤버는 contribution 예치 | "/circles/[id]" 에서 Deposit 버튼 → vault → circle vault | `deposit` | `tests/roosta.ts` | ⏳ | 마감 후 deposit 시 late 카운트가 CreditProfile 에 기록되는지 UI 노출 누락 | E2E: 마감 후 deposit → late 표시 확인 |
| RQ-PAYOUT-01 | 모든 멤버 deposit 완료 시 trigger_payout 가능. 마감 후엔 누구나 호출 가능. | 권한자 또는 누구나 Payout 버튼 클릭 → 다음 라운드로 이동 | `trigger_payout` | `tests/roosta.ts` | ⏳ | 권한 분기 UI 미검증 (authority 가 아닌데 마감 전 호출 시 동작) | 권한 분기 E2E |
| RQ-DEFAULT-01 | grace_period 경과 후 mark_default → collateral + locked reserve 슬래시 | 누구나 mark_default 호출 가능, 슬래시 후 멤버 Trust Tier 0 으로 초기화 | `mark_default`, `slash_collateral` | `tests/04_default.ts` | ⏳ | UI 에서 mark_default 버튼 노출 시점 미확인 | E2E: grace period 경과 시뮬레이션 |
| RQ-RESERVE-01 | 슬롯 0/1 의 Locked Reserve 가 다음 라운드 결제마다 unlock | unlock_reserve 호출 시 슬라이스 해제 | `unlock_reserve` | `tests/03_risk_lifecycle.ts` | ⏳ | UI 노출 / 자동화 여부 불분명 | spec 명시 필요 — 🚧 Spec gap |
| RQ-PROFILE-01 | CreditProfile + Token-2022 NonTransferable SBT 1개/지갑 | "/profile" 첫 진입 시 init_credit_profile 자동 호출, SBT badge 노출 | `init_credit_profile`, `app/app/profile/page.tsx`, `app/components/credit-sbt-badge.tsx` | `tests/02_credit_profile.ts` | ⏳ | SBT 전송 불가 동작이 frontend 에서 검증 안 됨 | E2E: SBT 전송 시도 → 실패 확인 |
| RQ-PROFILE-02 | Tier 0–4 트랙. on-time/late/default 누적 반영 | join 가능 슬롯이 Tier 에 따라 제한 | `programs/roosta/src/credit_helpers.rs` | `tests/02_credit_profile.ts`, `tests/04_default.ts` | ⏳ | Tier 변동 UX (전후 비교) 없음 | UX 검증 후 보고 |
| RQ-GASLESS-01 | Relayer 가 fee_payer 역할 → 사용자는 SOL 없이 트랜잭션 가능 | 사용자가 트랜잭션 서명 시 SOL 차감 없음 | `app/lib/relayer-client.ts`, `app/app/api/relayer/route.ts` | 없음 | ⏳ | RELAYER_SECRET 미설정 시 fallback 동작 (사용자 페이) 가 의도된 UX 인지 확인 필요 — 🚧 Spec gap | manual checklist + fallback 시각화 |
| RQ-GASLESS-02 | Relayer 는 알려진 program 만 서명 (악성 tx 거부) | 임의 program 호출하는 tx 를 relayer 가 거부 | `app/app/api/relayer/route.ts::ALLOWED_PROGRAMS` | 없음 | ⏳ | 회귀 테스트 없음 | API contract 테스트 추가 |
| RQ-GASLESS-03 | Relayer 는 IP 당 30/5min rate limit | 31번째 호출 429 | 동일 | 없음 | ⏳ | 429 시 client UX 처리 미확인 | API contract + UX 검증 |
| RQ-FAUCET-01 | Devnet mock USDC 1000 발급 (1회/지갑 — 정책 불분명) | "/profile" 에서 faucet 버튼 또는 API 호출 | `app/app/api/faucet/route.ts` | 없음 | 🚧 | 호출 횟수 제한 정책 명시 없음 (mainnet 대비 위험) — spec 명시 필요 | spec 결정 + 테스트 |
| RQ-WALLET-01 | Phantom + Wallet Standard 자동 감지 (Backpack 등) | "Connect Wallet" → 지갑 모달 → 연결 후 주소 노출 | `app/components/wallet-provider.tsx`, `app/components/wallet-panel.tsx` | 없음 | ⏳ | E2E 에서 KeypairWalletAdapter 로 대체 (별도 시나리오) | E2E spec `02-wallet-connect.spec.ts` |
| RQ-WALLET-02 | 연결 해제 / 재연결 시 UI 정합성 유지 | 연결 → 페이지 이동 → 연결 해제 → 빈 상태 노출 | 동일 | 없음 | ⏳ | wallet-panel.tsx 에 8개 react-hooks lint error 존재 (set-state-in-effect) | lint fix + E2E |
| RQ-DEMO-01 | "/demo" 페이지에서 3개 시나리오 (Happy / TrustGate Reject / Default+Slash) 시각화 | 데모 페이지 진입 시 자동 재생 | `app/app/demo/page.tsx` | 없음 | ⏳ | 데모용 데이터 출처 (mock vs seed) 검증 필요 | E2E: 페이지 로드 + console clean |
| RQ-TRUSTGATE-01 | Helius DAS 로 wallet age + tx count + asset history 평가 → eligible/tier 산출 | join modal 진입 시 자동 평가 | `app/app/api/trust-gate/route.ts`, `app/app/api/wallet-history/route.ts` | 없음 | ⏳ | HELIUS_API_KEY 없으면 500. fallback 정책 없음. | API contract + 키 누락 시 UX |
| RQ-NFT-METADATA-01 | Position NFT metadata 가 우리 API 에서 serve | NFT 클릭 → metadata URI → JSON 응답 | `app/app/api/nft-metadata/position/[circle]/[order]/route.ts` | 없음 | ⏳ | Arweave/IPFS 영속화 없음 → API 다운 시 NFT meta 손실 | risk 보고 + manual check |

## 미검증 요구사항 카운트 (sweep #2 갱신)

`anchor test` 16/16 PASS + Playwright 32/32 PASS + lint 0/0 + 정책 가정 문서화 (`POLICY_ASSUMPTIONS.md`) 반영:

- ✅ **chain lifecycle 검증 완료 (anchor test)**: RQ-CIRCLE-01·02·03, RQ-JOIN-02, RQ-JOIN-03, RQ-CONTRIB-01, RQ-PAYOUT-01, RQ-DEFAULT-01, RQ-PROFILE-01, RQ-PROFILE-02
- ✅ **UI/API 검증 완료 (Playwright)**: RQ-CIRCLE-02 (GET API + 홈/circles 페이지), RQ-CIRCLE-01 (create form input fuzz), RQ-WALLET-01·02 (connect/disconnect lifecycle), RQ-DEMO-01 (페이지 로드 + console clean), RQ-TRUSTGATE-01 (API degrade), RQ-NFT-METADATA-01 (metadata API), RQ-GASLESS-02 (allowlist reject), RQ-GASLESS-03 (rate-limit 429)
- ⚠️ **확정된 finding 으로 박제**: RQ-JOIN-01 → F-005 (on-chain Tier 미검증 — 회귀 테스트 추가됨, bypass 동작이 박제되어 향후 fix 시 즉시 감지됨)
- 🚧 → 📌 **가정 정책 채택 (POLICY_ASSUMPTIONS.md)**: RQ-RESERVE-01 / RQ-GASLESS-01 / RQ-FAUCET-01 — product owner 확정 전까지 baseline 정책으로 작동.

총 22개 중 ✅ 18, ⚠️ 1 (F-005, 향후 fix 시 자동 감지), 📌 3 (확정 대기).

**미검증 ⏳ 0건**. F-005 는 security finding 으로 박제되어 매트릭스상 검증 처리. 📌 3건은 product owner 결정 후 정식 ✅ 로 승격.

## Spec gap 목록 (🚧)

다음은 코드만으로는 정책을 결정할 수 없어 product owner 확인이 필요합니다:

1. **RQ-RESERVE-01**: Locked Reserve unlock 이 자동인가 수동인가? UI 에 노출돼야 하나?
2. **RQ-GASLESS-01**: Relayer 미설정 시 fallback (user-paid) 이 의도된 UX 인가, 아니면 에러 처리해야 하나?
3. **RQ-FAUCET-01**: Devnet faucet 호출 정책 (지갑당 횟수/금액/IP rate-limit) 명시 필요.
