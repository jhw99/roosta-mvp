# Roosta — QA Strategy (Solana hackathon build)

Owner: QA Gatekeeper agent  •  Source of truth for `qa:*` scripts and release gating.

## 1. Purpose

이 문서는 Roosta Solana 빌드의 릴리즈 가능 여부를 판정하기 위한 객관적 기준을 정의합니다.
"테스트가 돌긴 했다"가 아니라 **"실제 사용자가 겪을 모든 시나리오가 검증되었다"** 를 입증할 수 있어야 합니다.

## 2. Real-environment principle

Production-like 검증의 정의:

- Frontend: `next build && next start` 로 띄운 production bundle (dev server 결과는 evidence로 인정하지 않음).
- 체인: `solana-test-validator` (CI/로컬) 또는 devnet (수동/manual e2e). Mock RPC 금지.
- API 라우트: 실제 Helius/relayer/faucet 시크릿이 있는 환경에서 호출. 시크릿이 없으면 그 시나리오는 `Skipped (env)` 로 표시하고 미검증으로 카운트.
- 지갑: e2e 컨텍스트에서는 `KeypairWalletAdapter` (테스트 전용, prod 빌드에 포함되지 않음) 로 실제 keypair 가 트랜잭션을 서명. Mock 서명 금지.

## 3. Test levels

| Level | Tool | Scope | Mock policy | gating |
|---|---|---|---|---|
| typecheck | `tsc --noEmit` (app/, tests/) | 정적 타입 | n/a | 실패 = 릴리즈 불가 |
| lint | `eslint` (app/), `prettier --check` (루트) | 코드 스타일 + react-hooks 규칙 | n/a | 실패 = 릴리즈 불가 |
| unit | Mocha + chai (tests/*.ts) | Anchor 인스트럭션 단위 검증 | Mock 허용 (단, on-chain effect 는 실제 validator) | 실패 = 릴리즈 불가 |
| integration | Mocha (tests/roosta.ts 등 lifecycle suites) | 여러 인스트럭션 조합 시나리오 | Mock 금지. localnet 사용. | 실패 = 릴리즈 불가 |
| e2e | Playwright (e2e/*.spec.ts) | 브라우저에서 UI ↔ relayer ↔ 체인 실제 흐름 | Mock 금지 (KeypairWalletAdapter는 mock 이 아니라 wallet-adapter 구현체). devnet 또는 localnet validator. | 실패 = 릴리즈 불가 |
| e2e:prod | 위와 동일, `next start` 빌드 대상 | 동일 시나리오를 prod 번들에서 재실행 | 동일 | 실패 = 릴리즈 불가 |
| build | `next build` | 번들 성공 + chunk 크기 | n/a | 실패 = 릴리즈 불가 |
| smoke | curl ping `/api/circles`, `/api/relayer/status` | 라우트가 200/예상 4xx 반환 | n/a | 실패 = 릴리즈 불가 |
| manual checklist | `QA_REPORT.md` 마지막 섹션 | 브라우저에서 사람이 직접 확인해야 하는 항목 | n/a | 검증 누락 = 릴리즈 불가 |

## 4. Mock policy

- Unit (Mocha): 외부 시스템 (Metaplex 등) 의 일부 호출은 fixture (`.so`) 로 대체 가능. CreditProfile, Circle 등 우리 program 상태는 절대 mock 금지.
- E2E: 어떤 형태의 mock 도 금지. 예외:
  - Helius DAS 호출이 비용/속도 문제로 곤란할 때: `?e2e=stub-helius` 같은 명시적 flag 가 있고 그 사실이 테스트 이름에 드러나야 함. 결과는 항상 "stubbed Helius — manual verification required" 로 보고.
  - 결제·메인넷·운영 DB: 항상 sandbox (devnet) 또는 staging 으로 대체. Mainnet 직접 호출 금지.

## 5. Browser-error policy (E2E)

다음은 모두 즉시 fail:

- `console.error`
- `pageerror` (uncaught exception)
- failed network request (status >= 400, single fixture로 의도된 negative test 제외)
- hydration mismatch warning
- React `set-state-in-effect` warning (Next 16 strict)
- blank screen > 2s
- stuck loading state > 30s
- broken navigation (404 on linked-to route)

테스트 fixture (`e2e/fixtures/strict-page.ts`) 가 이 룰들을 모든 spec 에 자동 적용.

## 6. Production-like e2e 요구

`qa:e2e:prod` 절차:
1. `pnpm exec next build` (app/) — 실패 시 즉시 종료.
2. `next start` 를 백그라운드로 띄움 (PORT=3100).
3. 헬스 대기 (최대 30s, `/`).
4. Playwright suite 실행 (`playwright.config.ts` 의 `webServer` 사용).
5. 종료 후 `next start` 프로세스 정리.

체인 측은 `solana-test-validator` (로컬) 또는 devnet RPC 사용. devnet 사용 시 RPC rate-limit 노출 가능성을 보고에 명시.

## 7. Done definition

`qa:all` 의 모든 단계가 PASS 이고, `REQUIREMENT_TRACEABILITY_MATRIX.md` 에 미검증 ID 가 0개일 때만 "완료" 라고 부를 수 있습니다.

완료 보고는 항상 다음을 포함:

- 변경 파일 목록
- 실행한 QA 명령어 + 출력 요약
- 새 회귀 테스트 파일/이름
- 미검증 요구사항 (0 이어야 함)
- 사람이 직접 확인해야 하는 manual checklist 결과
- 남은 리스크

## 8. Failure handling

- 우회/skip 금지. `it.skip`, `xit`, `--max-warnings=*` 상향 모두 PR 차단 사유.
- 발견된 버그는 CLAUDE.md 의 Bug Fix Rule 8단계 그대로:
  1. 재현 시나리오 → 2. 실패하는 테스트 → 3. 실패 확인 → 4. 원인 → 5. 최소 수정 → 6. 전체 QA gate 재실행 → 7. 회귀 테스트 → 8. QA_REPORT 갱신.
- 우리가 직접 통제할 수 없는 외부 의존 (예: devnet airdrop 429) 으로 인한 실패는 "Blocked (external)" 로 분류, 우회 대신 재시도 정책 + 발생 빈도 기록.

## 9. Regression rule

수정한 버그마다 다음 중 최소 한 가지가 해당 PR 에 추가되어야 합니다:

- 단위 테스트 (Mocha) — Anchor 인스트럭션 레벨 버그
- E2E spec (Playwright) — UI/UX/라우팅/네트워크 레벨 버그
- API contract 테스트 — `/api/*` 응답 shape/상태코드 버그

회귀 테스트가 추가되지 않은 수정은 머지 금지.
