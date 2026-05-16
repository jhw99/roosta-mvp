# Assumed Policies — Roosta Solana

원본 사양 부재 항목에 대해 QA agent가 **잠정적으로 채택한** 정책. 각 항목은 코드 동작과 정합하며, product owner 확정 전까지의 baseline 입니다. 확정되면 본 문서의 해당 항목을 삭제하고 `REQUIREMENT_TRACEABILITY_MATRIX.md` 의 해당 ID 상태를 갱신하세요.

## RQ-RESERVE-01 — Locked Reserve unlock UX

**현재 코드 동작 (`unlock_reserve` 인스트럭션)**: 슬롯 0/1 멤버의 Locked Reserve 는 후속 라운드가 settle 될 때마다 한 슬라이스씩 unlock 됩니다. 호출은 누구나 트리거 가능하지만 자동 호출되지는 않습니다.

**채택 정책**:
- 자동/수동 여부: **수동 트리거 + UI 노출**. 슬롯 0/1 멤버가 본인 `/circles/[id]` 상세 페이지에서 "Unlock Reserve" 버튼으로 호출.
- 시점: 후속 라운드 settle 직후. UI 는 다음 unlock 가능 시점/금액을 표시.
- gas: 가스리스 (relayer 경유) — 일관성 유지.

**미반영 항목**:
- UI 버튼이 아직 노출 안 됨 — follow-up 구현 필요.
- 슬롯 0/1 외 멤버에게는 unlock 버튼 자체가 안 보여야 함 (현재 미구현).

**TODO**: 위 UI 추가 후 `06-unlock-reserve.spec.ts` 추가, 매트릭스 ✅ 로 갱신.

---

## RQ-GASLESS-01 — Relayer fallback 의도

**현재 코드 동작 (`app/lib/relayer-client.ts::buildAndSubmitGasless`)**: relayer 가 unavailable 하거나 `NEXT_PUBLIC_RELAYER_PUBKEY` 가 미설정이면, `.rpc()` 로 fallback 하여 사용자 지갑이 직접 fee 를 지불.

**채택 정책**:
- Fallback 자체는 **의도된 UX** (해커톤/데모 환경에서 relayer 없이도 동작해야 하므로).
- 단, fallback 발생 시 UI 가 **"You will pay network fees for this transaction"** 같은 명시적 배너를 표시해야 함 (현재 미구현).
- Mainnet 빌드에서는 fallback 을 비활성화 (relayer 필수). 환경 분기 시그널: `process.env.NEXT_PUBLIC_NETWORK === 'mainnet'`.

**TODO**: 위 배너 + mainnet gate 구현 후 `relayer-client.ts` 의 fallback 분기에 회귀 테스트 추가.

---

## RQ-FAUCET-01 — Devnet faucet 정책

**현재 코드 동작 (`app/app/api/faucet/route.ts`)**: `FAUCET_SECRET` keypair 가 1000 mock USDC 를 호출 지갑으로 mint. 호출 횟수 제한/IP rate-limit 없음.

**채택 정책**:
- 1 지갑당 **lifetime 1회** mint (현재 미구현 — 누구나 무제한 호출 가능).
- IP rate-limit: 1 IP / 5분당 5회 (현재 미구현).
- 환경: `process.env.TON_NETWORK === 'devnet'` 또는 `NEXT_PUBLIC_NETWORK !== 'mainnet'` 일 때만 작동. Mainnet 에서는 endpoint 자체 비활성 (404).
- 발급량: 1000 mock USDC (현재 동일).

**TODO**: 위 제한 구현 + 회귀 spec (`07-faucet-policy.spec.ts`) 추가:
- 동일 지갑 두 번째 mint 시도 → 409 conflict.
- IP 당 6번째 호출 → 429.
- Mainnet 환경에서 호출 → 404.

---

## 의사결정 요청

위 3개 항목은 **잠정 정책**이며, product owner 의 확정 응답이 오면 정책을 코드/스펙에 반영하고 본 문서를 삭제합니다. 응답 양식:

```
RQ-RESERVE-01: [동의/수정 — 예: "자동으로 settle 직후 호출"]
RQ-GASLESS-01: [동의/수정]
RQ-FAUCET-01: [동의/수정]
```
