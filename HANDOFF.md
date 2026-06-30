# ピッ!とVOCA — 작업 핸드오프

> 마지막 업데이트: 2026-06-30  
> 작업 브랜치: `claude/japanese-word-app-index-gc8nud`  
> 현재 버전: `v0.1.9`

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

### 6. 단어 상세 모달 정렬 수정 (v0.1.4)
- `modal-decks`를 전체 너비로 고정 → 칩 폭 변화 시 좌우 흔들림 제거, 라벨·칩 가운데 정렬 일관화

### 7. 배포 전 보강 (v0.1.5)
- **단어 자동검색 실패 문구 변경**: 기술적 에러 노출 → "딱 맞는 표현을 찾기 어려워요. 아래 칸에 직접 입력해 등록할 수 있어요."
- **홈 화면 설치 유도 + PWA manifest**: `manifest.json` 추가, `img/icon-192.png`·`icon-512.png` 생성, 미설치 사용자에게 `InstallBanner` 노출 (iOS localStorage 7일 삭제 대비 — 설치 시 진도 보존). 안드로이드는 `beforeinstallprompt` 원탭 설치, iOS는 수동 안내.
- **첫 사용자 가이드**: `FirstRunGuide` — 최초 1회 사용법 5가지 안내 (localStorage `jp-vocab-guide-v1`).

#### v0.1.6 — 가이드/배너 비주얼 다듬기
- 첫 사용자 가이드: 상단 츠군 이미지 제거, 좌측 이모지 → 앱 아이콘(노란 톤 타일)으로 교체
  (학습=Cards, 발음=Speaker(기존), 듣기=Headphone, 퀴즈=Quiz 재사용 / `Icon.Tap` 손가락 아이콘 신규 추가)
- 설치 배너: 좌측 이모지 → `img/home-screen.svg`(첨부 일러스트)로 교체

> ⚠️ 샌드박스 네트워크 제약(unpkg CDN 차단)으로 이 환경에서 브라우저 렌더 검증은 못 함. JSX 컴파일·manifest 유효성은 확인됨. 프리뷰에서 InstallBanner/FirstRunGuide 시각 확인 권장.

---

## 배포 현황

| 환경 | URL | 상태 |
|---|---|---|
| 운영(Production) | pitto-voca.vercel.app | main 브랜치 기준 (이 브랜치 미반영) |
| 프리뷰(Preview) | Vercel Deployments에서 브랜치 별칭 URL 확인 | v0.1.5 반영 |

**운영 반영**: `claude/japanese-word-app-index-gc8nud` → `main` 머지 필요

---

## 미완료 / 이어서 할 작업

- [x] 이 브랜치를 `main`으로 머지 → 운영 반영
- [x] 오류 제보 화면의 에러 detail 표시 제거 (v0.1.3)
- [ ] **v0.1.5를 `main`에 머지** → 운영 반영 (배포 전 필수)
- [ ] (배포 후) **빌드 단계 도입**: in-browser Babel 컴파일 + unpkg CDN 의존 제거 → 로딩속도·안정성 개선 (CDN 장애 시 흰 화면 위험)
- [ ] (선택) 제보 수신함 주소(`micki.02@kakaopiccoma.com`)가 사내 운영에 맞는지 확인

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
index.html      — 앱 전체 (React + CSS, 단일 파일, 5900줄+)
words.js        — window.SEED 단어 시드 데이터
kanji.js        — window.KANJI 한자 사전
api/proxy.js    — Vercel 서버리스 함수 (TTS + 제보 포워딩)
manifest.json   — PWA manifest (홈 화면 설치용)
img/            — 헤더·마스코트(츠군 1~7) + PWA 아이콘(icon-192/512.png)
CLAUDE.md       — Claude Code 작업 메모리 (존댓말 규칙, 버전 표기 규칙)
```

## 버전 표기 규칙

기능 수정·배포 시마다 `index.html` 상단:
```javascript
const APP_VERSION = "v0.1.5";   // 기능 추가 시 마이너, 수정 시 패치
const APP_BUILD = "2026-06-30"; // 작업 당일 날짜
```
통계&설정 탭 하단 footer에 표시됨.
