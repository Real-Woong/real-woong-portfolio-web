# Agora

# **📌 THE ZONE AGORA**

### **AgoraAgent 기반 Sui 위임형 투자 Vault 시스템**

사용자가 **자산의 최종 소유권과 출금 권한은 그대로 유지**하면서,

**제한된 자동 거래 권한만** AgoraAgent에게 위임하는 Sui 블록체인 기반 투자 인프라 프로젝트입니다.

일반적인 자동매매 서비스처럼 사용자 자금을 Agent 서버로 직접 옮기지 않고,

owner(사용자)·AgoraAgent·Signal Provider의 **권한을 온체인 Vault 안에서 분리**해,

Agent 서버 키가 탈취되더라도 임의 출금이나 허용되지 않은 거래가 불가능하도록 설계했습니다.

외부 유료 Signal Provider API 호출에는 HTTP **402 Payment Required 기반 x402 결제**를 사용하며,

이 비용과 자동 투자 가스는 사용자가 아니라 **AgoraAgent가 대신 부담**합니다.

> ⚠️ 2026년 7월 기준 MVP 개발 단계이며, 실제 DEX 체결·정산과 Testnet E2E는 아직 완성되지 않았습니다.
> Sui Move 스마트 컨트랙트, Agent 실행 서버, Next.js 프런트엔드로 구성된 팀 프로젝트(BlockBlock 2026 Summer)입니다.

---

# **🏗 현재 구현 상태**

| 영역 | 폴더 | 상태 |
|---|---|---|
| Smart Contract / SDK | `sui-contract/` | 2자산 Vault, AgoraAgent 권한·한도, Signal Provider Registry, x402 분배, Transaction 빌더 구현 |
| Agent Backend | `agent-execution-server/` | x402 결제 검증 미들웨어만 구현. 실제 Express 실행 서버·AI 판단·거래 라우트는 미구현 |
| Frontend / UX | `thezoneagora-main/` | 랜딩·Sui Wallet 연결 구현. 기존 "Agent 비교·선택" UI를 Agora 자동 운용형 UX로 개편 중 |
| 기획·설계 문서 | `Project_Info/`, `design/` | Vault·Agent 설명 자료, RFC, 브랜드/UX 디자인 가이드 보관 |
| 통합 E2E | 전체 | 지갑 → x402 결제 → Agent 실행 → Vault → 실제 DEX로 이어지는 전체 흐름은 아직 미완성 |

현재 가장 중요한 과제는 **프런트엔드·Agent 실행 서버·Sui 컨트랙트 간 인터페이스를 고정**하고 Testnet에서 단계적으로 연결하는 것입니다.

---

# **💡 핵심 설계**

### **1️⃣ 권한 분리 구조 — "위임"이지 "이체"가 아니다**

```text
사용자
├─ 자산의 최종 소유권 유지, Vault 생성·입금·출금
└─ Signal Provider 선택·결제에는 참여하지 않음

AgoraAgent
├─ 허용된 BUY/SELL 요청 (1회·epoch 한도 내)
├─ 외부 Signal Provider 선택과 x402 결제
└─ 향후 허용된 DEX 거래 실행 및 가스 부담

온체인 Vault
├─ 자산 타입과 역할(Fiat/Crypto) 분리
├─ 실제 서명자 기반 권한 검사
└─ 거래 결과를 Agent 지갑이 아닌 Vault에 보관
```

초기 설계에는 사용자가 개별 Trading Agent를 고르고 Follow하는 "마켓플레이스형" 구조였지만,

**"신뢰할 수 없는 전략에 사용자가 직접 노출된다"**는 문제를 이유로

사용자의 Agent 선택·Follow·Follow fee를 모두 제거하고, AgoraAgent가 신호를 검증·실행하는 **위임형 구조로 전면 재설계**했습니다.

---

### **2️⃣ Investment Vault — 자산 역할을 타입 시스템으로 강제**

`UserVault<FiatT, CryptoT>`는 Sui shared object로, 기준 자산(FiatT, 예: USDC)과 투자 자산(CryptoT)을 **Move 제네릭 타입으로 분리 보관**합니다.

- FiatT는 BUY 입력 전용, CryptoT는 SELL 입력 전용으로 고정
- 사용자는 `deposit_more`로 FiatT만 입금 가능 — CryptoT를 임의로 주입해 투자 결과인 것처럼 위장하는 경로 자체가 없음
- BUY/SELL 각각 **1회 한도**와 **epoch 누적 한도**를 검사
- `ACTIVE / REDUCE_ONLY / PAUSED` 3단계 상태로 owner가 언제든 자동 운용을 축소·중지 가능
- epoch 한도를 이미 사용한 양보다 작게 낮추는 모순 상태를 코드 수준에서 차단

현재 `request_buy`/`request_sell`은 **권한·한도 검증과 이벤트 기록까지만** 수행하며, 실제 DEX swap과 CryptoT/FiatT 정산(`execute_buy`/`execute_sell`)은 다음 단계 과제입니다.

---

### **3️⃣ AgoraInvest — 신호와 위험 점수를 온체인에 남기다**

`agora_invest::request_buy`/`request_sell`은 Vault 검사를 그대로 재사용하면서, 그 앞단에 **`signal_digest`(신호 다이제스트)와 `risk_score_bps`(위험 점수)** 검증을 추가한 계층입니다.

- 빈 signal digest 차단
- `risk_score_bps > 10,000bps` 차단
- `AgoraBuyDecisionRecorded` / `AgoraSellDecisionRecorded` 이벤트로 판단 근거를 감사 가능하게 기록

이를 통해 "AgoraAgent가 왜 이 거래를 요청했는가"를 온체인 이벤트만으로 추적할 수 있는 토대를 만들었습니다.

---

### **4️⃣ x402 결제 계층 — Agent-to-Agent 유료 API 호출의 자동화**

외부 Signal Provider의 유료 신호 API를 HTTP 402 기반으로 호출·정산합니다.

```text
Signal Provider API 최초 POST
→ 402 challenge 수신
→ pay_signal_provider_usage_fee Transaction 생성 (AgoraAgent 서명)
→ Tx Digest를 PAYMENT-SIGNATURE 헤더로 재전송
→ Signal Provider 신호 반환
```

- 온체인 `payment_splitter.move`가 총 사용료를 Signal Provider와 플랫폼 Treasury에 즉시 분배 (기본 플랫폼 수수료 20%)
- `x402Middleware.ts`가 결제 헤더의 digest·이벤트 타입·금액·수령 주소·유효 기간·**재사용(replay) 여부**까지 검증한 뒤에만 다음 단계 진행
- 검증 실패 시 `402`, RPC 조회 장애 시 `503` 응답

현재 replay 방지 저장소는 프로세스 메모리 `Set` 기반이라, 프로덕션에서는 Redis/DB로 교체가 필요한 상태로 문서화해 두었습니다.

---

### **5️⃣ 가스 부담 구조 — "사용자는 가스 걱정 없이 위임한다"**

Sui는 Vault 내부 잔액에서 자동으로 가스가 차감되지 않고, 반드시 SUI를 가진 gas owner가 트랜잭션 가스를 냅니다.

| 작업 | 가스 부담자 |
|---|---|
| Vault 생성·입금·출금, owner 설정 변경 | 사용자 지갑 |
| Signal Provider x402 결제·분배 | AgoraAgent 운영 지갑 |
| BUY/SELL 요청, 향후 DEX 실행 | AgoraAgent 운영 지갑 |

사용자가 서명하는 구간(생성·입금·출금)과 Agora가 대신 서명·부담하는 구간(신호 결제·자동 매매)을 명확히 나눠, **"자동 투자 중에는 사용자 지갑에서 가스가 빠지지 않는다"**는 제품 원칙을 컨트랙트·문서·디자인 가이드 전체에 일관되게 반영했습니다.

---

# **🚧 현재 개발 상태**

### **구현 완료**

- 2자산(Fiat/Crypto) Vault, owner 전용 입출금, AgoraAgent 전용 BUY/SELL 권한 분리
- BUY/SELL 1회·epoch 누적 한도 및 `ACTIVE/REDUCE_ONLY/PAUSED` 상태 관리
- AgoraInvest 계층의 signal digest·위험 점수 기록
- Signal Provider Registry (이름·x402 수령 주소·활성 상태)
- x402 온체인 사용료 분배(`payment_splitter.move`) 및 결제 검증 미들웨어(`x402Middleware.ts`)
- Vault_Dex.js PTB Transaction 빌더(생성/입금/출금/한도변경/BUY·SELL 요청)
- Sui Move 단위 테스트 30/30 통과, TypeScript 정적 검사 통과
- 브랜드·UX 디자인 가이드(색상·타이포·화면별 카피 원칙) 문서화

### **아직 미구현**

- 실제 DEX swap과 BUY/SELL 결과의 Vault 원자적 정산 (`execute_buy`/`execute_sell`)
- 실행 가능한 Agent HTTP 서버(Express 앱, AI 판단 로직, 운영 signer, 거래 라우트)
- Signal Provider 평가·조합(Backtest/Live Signal Test) 로직
- Redis/DB 기반 x402 replay 방지 저장소 (현재는 인메모리)
- Pool allowlist, `min_amount_out`, deadline 등 DEX 실행 안전장치
- 실제 가스·환율·DEX 비용 기반 Unit Economics 백엔드
- Testnet E2E 검증
- 기존 "Agent 비교·선택형" 프런트 UX를 개인 Vault 중심 대시보드로 개편

---

# **🛠 기술 스택**

### **Blockchain / Smart Contract**

- Sui, Sui Move (edition 2024)
- Move 패키지 `agent_market` — Vault, Signal Provider Registry, Fee Vault, Payment Splitter
- `sui move test` 기반 단위 테스트

### **Backend**

- Node.js `>=22`, TypeScript `^5.9.3`
- Express `^5.2.1` (x402 결제 검증 미들웨어)
- `SuiJsonRpcClient` 기반 결제 Transaction·이벤트 검증

### **Frontend**

- Next.js `^15.5.19`, React `18.3.1`, TypeScript `5.5.4`
- Tailwind CSS `3.4.7`, Framer Motion `11.3.19`
- Lightweight Charts `4.1.6` (자산 곡선 시각화)
- `@mysten/dapp-kit-react`, `@mysten/sui` (Sui Wallet 연결·PTB·서명 연동)

### **Payment**

- HTTP 402 + 온체인 영수증(`SignalPaymentReceiptEvent`) 기반 x402 결제 프로토콜

---

# **🧠 프로젝트에서 중요하게 생각한 점**

이 프로젝트는 초기에 "사용자가 여러 Trading Agent 중 하나를 골라 Follow하는 마켓플레이스" 구조로 출발했습니다.

하지만 검토 과정에서 **"사용자가 검증되지 않은 전략에 직접 자산을 노출한다"**는 근본적인 문제를 확인했고,

RFC를 통해 다음과 같이 책임을 다시 나눴습니다.

- 사용자는 자산 소유권만 유지하고 전략 선택·Signal Provider 결제에는 관여하지 않는다
- AgoraAgent가 외부 Signal을 **검증(Backtest / Live Signal Test)한 뒤에만** 실행 단계로 넘긴다
- Agora 운영비(서버·API·가스)와 사용자 Vault 자산의 경계를 코드 수준에서 분리한다

그 결과 `agent_registry.move`, `follow.move` 같은 기존 모듈을 삭제하고,

Vault·AgoraInvest·Signal Provider Registry·x402 결제를 **owner / AgoraAgent / Signal Provider 3자의 권한이 서로 침범할 수 없는 구조**로 재구성했습니다.

또한 "아직 실제 DEX 체결이 없다"는 한계를 숨기지 않고, 디자인 가이드 자체에 **"요청(Requested)과 완료된 거래를 혼동시키지 말 것"**이라는 원칙을 명시해, 기능이 없는 상태를 있는 것처럼 보여주지 않는 것을 우선순위로 두었습니다.

---

# **📎 GitHub**

[https://github.com/TheZoneAgora/the-zone-agora](https://github.com/TheZoneAgora/the-zone-agora)

---

# **✨ 한 줄 요약**

**사용자는 자산 소유권을 유지하고, AgoraAgent가 외부 Signal을 검증·x402 결제·실행까지 위임받아 대신 처리하는 Sui 기반 권한 분리형 투자 Vault 시스템**
