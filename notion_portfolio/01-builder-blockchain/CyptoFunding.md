# CyptoFunding

작업 영역: BlockChain, 팀-프로젝트
브랜드: BlockBlock(연세대 블록체인동아리)
개발언어: JS, Move, Node.js, SQL, TS
역할: 풀스택 (FE, BE, Contract)

## **📌 프로젝트 개요**

Sui 블록체인 기반 크라우드펀딩 플랫폼으로,

프로젝트 생성 → 후원 → 상태 관리까지 온체인·오프체인을 통합 설계한 풀스택 프로젝트입니다.

단순 시연용 데모가 아니라,

동아리원이 실제 Sui testnet에서 지갑을 연결하고 후원 트랜잭션을 실행할 수 있는 수준까지 구현했습니다.

---

## **🏗 내가 설계하고 구현한 것**

### **1️⃣ Smart Contract (Sui Move)**

- 프로젝트 생성 및 후원 로직 설계
- 온체인 상태 관리 모델 설계
- entry function 구조 및 리소스 모델 설계

### **2️⃣ Backend**

- Node.js + Express 기반 API 서버 구축
- Prisma + PostgreSQL(RDS) 데이터 모델링
- 온체인 트랜잭션 결과와 오프체인 상태 동기화 구조 설계
- 파일 업로드 및 프로젝트 관리 로직 구현

### **3️⃣ Frontend**

- React + Vite 기반 UI 설계
- 지갑 연결 및 트랜잭션 흐름 구현
- TanStack Query 기반 서버 상태 관리

### **4️⃣ Infra**

- AWS EC2 + RDS 배포
- Vercel 프론트엔드 배포
- 환경변수 및 Prisma 배포 환경 분리 관리

---

## **⚙️ 기술적으로 가장 고민했던 부분**

- 온체인 상태와 오프체인 데이터 정합성 유지
- 트랜잭션 Pending / Confirmed 상태 분리 설계
- 배포 환경(EC2, RDS SSL, Prisma 연결 이슈) 디버깅
- 여러 레포(FE/BE/Contract) 구조 통합 및 Git 구조 재설계

---

## **📈 성과**

- 실제 사용자 지갑 연결 및 후원 실행 성공
- AWS + Vercel 기반 실서비스 수준 배포 완료
- 스마트 컨트랙트 → 백엔드 → 프론트 → 배포까지 End-to-End 경험

> “Functional prototype를 넘어, production 구조를 고민한 첫 엔지니어링 프로젝트”
> 

---

## 🛠️ 기술 스택

### **📌 Frontend**

- React
- Vite
- TanStack Query
- Sui JS SDK

---

### **📌 Backend**

- Node.js
- Express
- Prisma
- PostgreSQL

---

### **📌 Infra**

- AWS EC2
- AWS RDS
- Vercel
- Docker
- Git / GitHub

---

[git 상세 내용]

민감한 파일들 제거 ver.

[https://github.com/Real-Woong/crypto-funding](https://github.com/Real-Woong/crypto-funding)

[[페이지별 구현 사진]](%5B%ED%8E%98%EC%9D%B4%EC%A7%80%EB%B3%84%20%EA%B5%AC%ED%98%84%20%EC%82%AC%EC%A7%84%5D%203042b5b5818e80969ac3ff7b6cb72728.csv)
