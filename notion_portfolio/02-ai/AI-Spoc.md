# AI-Spoc

프로젝트 성격: 총괄
작업 영역: AI-Project, 개인-프로젝트
개발언어: python
브랜드: 공모전

## **📌 프로젝트 개요**

공공기관 전자민원 시스템에서 발생하는

- *“민원 오접수 · 부서 간 재이첩 문제”**를 해결하기 위해 설계한

AI 기반 민원 자동 라우팅 시스템.

현행 전자민원 시스템은 민원인이 스스로 담당 부서를 선택해야 하는 구조로 인해

자연어 표현과 행정 분류 체계 간 불일치가 발생하고,

이로 인해 민원이 여러 부서를 거치며 반복적으로 재이첩되는 문제가 발생합니다.

AI-SPOC은 민원 텍스트를 AI가 분석하여

적절한 행정 부서를 자동 예측하고 라우팅하는

**AI 기반 전자민원 단일창구(Single Point of Contact) 시스템**입니다.

---

## **🧠 핵심 설계 포인트**

- **RoBERTa 기반 민원 분류 모델 설계**
- 민원 자동 라우팅을 위한 **3단계 분기 구조 설계**
    - Direct Routing (자동 라우팅)
    - Coordinator Routing (AI 재분석)
    - Fallback Routing (인간 담당자 검토)
- 복합 민원 자동 분해 후 **복수 부서 동시 라우팅 구조 설계**
- **Selective Prediction 기반 Threshold 설계**
- 재이첩 최소화를 위한 **AI 기반 민원 분류 시스템 구조 설계**

---

## **⚙️ 배운 점**

- 실제 행정 문제는 단순 AI 모델 정확도보다
    
    **시스템 설계와 안전성 구조가 더 중요하다는 것을 이해**
    
- AI 시스템에서는 **자동화 범위와 인간 개입 구조를 함께 설계해야 함**
- 정책 문제 해결 프로젝트에서는
    
    기술보다 **문제 정의와 구조 설계 능력이 중요함**
    

---

## **📈 성과**

- 민원 분류 모델 Accuracy **0.515 / Top-3 Accuracy 0.71**
- 평균 AI 추론 시간 **약 10ms**
- Selective Prediction 기반 **자동 라우팅 구조 설계**
- 행정 민원 처리 시스템에 적용 가능한 **AI 라우팅 구조 제안**

> “행정 시스템의 구조적 문제를 AI 기반 시스템 설계로 해결하려 시도한 프로젝트”
> 

---

## **🛠️ 기술 스택**

### **AI / Machine Learning**

- Python
- PyTorch
- HuggingFace Transformers
- RoBERTa

### **Data Processing**

- Pandas
- NumPy
- JSON 기반 데이터 구조

### **System Design**

- AI 기반 민원 라우팅 아키텍처 설계
- Selective Prediction 기반 Threshold 설계

---

# **📂 Git Repository**

[https://github.com/Real-Woong/ai-spoc](https://github.com/Real-Woong/ai-spoc)

---

# **📝 프로젝트 문서 및 영상**

[AI SPOC](https://youtu.be/S-8XOCvpOsc?si=0i-C3qiy3Ja64sgQ)

[AI-SPOC_제안서_김진웅.pdf](AI-SPOC_%E1%84%8C%E1%85%A6%E1%84%8B%E1%85%A1%E1%86%AB%E1%84%89%E1%85%A5_%E1%84%80%E1%85%B5%E1%86%B7%E1%84%8C%E1%85%B5%E1%86%AB%E1%84%8B%E1%85%AE%E1%86%BC.pdf)

---

# **📊 프로젝트 성격**

- AI 시스템 설계 프로젝트
- 공공 행정 문제 해결형 AI 프로젝트
- 자연어 처리 기반 행정 서비스 설계

---

---
