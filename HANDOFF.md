# ピッ!とVOCA — 작업 핸드오프

> 마지막 업데이트: 2026-06-30  
> 작업 브랜치: `claude/japanese-word-app-index-gc8nud` → **main 머지 완료**  
> 현재 버전: `v0.1.3`

---

## 이 브랜치에서 한 작업 (main 대비)

### 1. 온보딩 카테고리 설명 추가 / 수정
- 레벨 선택 화면에서 픽코마·DAILY 카테고리가 포함될 때 설명 노트 표시
- **픽코마(ピッ)**: "픽코마 비즈니스 단어장이에요. 픽코마에서 자주 쓰는 업무·실무, 비즈니스 용어가 포함돼 있어요."
- **일상(DAILY)**: "일상·신조어 표현이에요. 매일의 생활 회화에서 바로 쓰는 표현과 관용구, SNS 신조어를 담았어요."

### 2. 오류 제보 전송 수정 (index.html + api/proxy.js)
- 기존: 브라우저 → GAS 직접 POST → CORS 실패
- 변경: 브라우저 → `/api/proxy` 서버사이드 포워딩 → GAS
- 실패 시 실제 에러 원인을 화면에 작게 표시 (진단용)
- **GAS 쪽도 수정 필요 (아래 참고)**

### 3. 제보창 버튼 글씨 크기 키움
- 취소 / 보내기 버튼 font-size 16px

### 4. 학습 대기목록 (priority) 기능 추가
- `card.priority` 플래그 추가
- `planToday`에서 복습·신규 모두 priority 카드 우선 노출
- 단어 상세 모달에 "학습 대기목록에 넣기" 버튼 추가
- **on 상태 색상: 연한 노랑 (accent-30, #ffe697)** — 진노랑 아님

### 5. 연관단어 이동 시 액션 제공 (DetailModal)
- 한자 상세 → 활용단어 클릭 시 카테고리 뱃지·즐겨찾기·단어장·학습대기 버튼 노출

---

## 배포 현황

| 환경 | URL | 상태 |
|---|---|---|
| 운영(Production) | pitto-voca.vercel.app | main 브랜치 기준 (이 브랜치 미반영) |
| 프리뷰(Preview) | Vercel Deployments에서 브랜치 별칭 URL 확인 | v0.1.2 반영됨 |

**운영 반영**: `claude/japanese-word-app-index-gc8nud` → `main` 머지 필요

---

## 미완료 / 이어서 할 작업

- [x] 이 브랜치를 `main`으로 머지 → 운영 반영
- [x] 오류 제보 화면의 에러 detail 표시 제거 (v0.1.3)

---

## GAS (Google Apps Script) 별도 수정 사항

**`script.google.com` 의 피드백 웹앱 프로젝트** (index.html 저장소 밖, 개인 구글 계정):

- `MailApp` → `GmailApp` 으로 변경 (권한 문제 해결)
- `appsscript.json`에 아래 스코프 추가:
  ```json
  "oauthScopes": [
    "https://mail.google.com/"
  ]
  ```
- `doPost` 내 `sendEmail` 호출을 객체 형태 → 위치 인자 형태로 변경:
  ```javascript
  GmailApp.sendEmail(
    TO,
    "[ピッ!とVOCA] 제보 - " + name,
    "보낸 사람: " + name + "\n버전: " + (b.ver || "") + "\n기기: " + (b.ua || "") + "\n\n--- 내용 ---\n" + msg
  );
  ```
- 현재 배포 버전: v10 (2026-06-30) — **정상 동작 확인됨**

---

## 파일 구조

```
index.html      — 앱 전체 (React + CSS, 단일 파일, 5700줄+)
words.js        — window.SEED 단어 시드 데이터
kanji.js        — window.KANJI 한자 사전
api/proxy.js    — Vercel 서버리스 함수 (TTS + 제보 포워딩)
img/            — 헤더·마스코트(츠군 1~7) 이미지
CLAUDE.md       — Claude Code 작업 메모리 (존댓말 규칙, 버전 표기 규칙)
```

## 버전 표기 규칙

기능 수정·배포 시마다 `index.html` 상단:
```javascript
const APP_VERSION = "v0.1.2";   // 기능 추가 시 마이너, 수정 시 패치
const APP_BUILD = "2026-06-30"; // 작업 당일 날짜
```
통계&설정 탭 하단 footer에 표시됨.
