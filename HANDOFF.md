# ピッ!とVOCA — 작업 핸드오프

> 마지막 업데이트: 2026-06-30  
> 작업 브랜치: `claude/japanese-word-app-index-gc8nud`  
> 현재 버전: `v0.2.4`

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

#### v0.1.10 — 온보딩 새로고침 제거 + 설치 모션
- 온보딩 완료 시 `window.location.reload()` 제거 → 상태 전환으로 매끄럽게 진입(새로고침 깜빡임 제거)
- `home-screen.svg` 화살표 SMIL 톡톡 모션(아이폰 찌르기, 왼쪽으로 더 떨어졌다가 5회 반복 후 정지)

#### v0.2.0 — 예문 속 단어 + TTS 보이스 고정/속도
- **예문 속 단어**: 단어 상세(DetailModal) 예문 아래에, 예문에 등장하는 SEED 단어를 [뱃지·단어·요미가나·뜻·›] 행으로 나열. 누르면 그 단어 상세로 타고 이동.
  - 매처: `extractExampleWords` / `buildSeedIdx` (index.html 상단). 표면+요미가나 동시검증(工作/耕作·方ほう/かた 오매칭 방지), 한자골격 정규화로 受付↔受け付け 호환, 동사/형용사 어간 접두일치로 활용형(固めましょう→固める) 인식, 접미사(～)·조사·기능어 제외. exact-우선(요미가나 노릇 명사 동음이의어는 명사로 표시 — 의도된 안전책).
  - 실데이터(words.js 8,610개) 40개 샘플 검증 완료(오매칭 없음).
- **TTS 보이스 고정**(api/proxy.js): 일본어 Aoede(여)·Charon(남) 2개로 고정, random도 이 둘 중에서만. (바꾸려면 proxy.js `LANG` f/m만 수정)
- **터치 발음 지연 단축**: `prefetchAudio`가 random도 미리불러오게 + 진행중 요청 중복방지(`ttsInflight`) + StudyView가 현재·다음 카드 둘 다 워밍. → 첫 탭 즉시 재생.

> ⚠️ 샌드박스 네트워크 제약(unpkg CDN 차단)으로 이 환경에서 전체 React 렌더 검증은 못 함. JSX/proxy 컴파일·정적 컴포넌트 렌더·매처 로직(실데이터)은 확인됨. 프리뷰에서 시각/음성 확인 권장.

#### v0.2.1 — 예문속단어 다듬기 + 할루시네이션 억제
- `.exw-row` 배경을 `--fill`(회색) → `--bg`(앱 배경색, 더 연함)로
- `extractExampleWords`에서 현재 보고있는 단어도 결과에 포함(이전엔 self-제외)
- `aiLookup`/`aiWordInfo`에 `found:boolean` 필드 추가 — 존재하지 않거나 불확실한 단어는 지어내지 말고 `found:false`로 응답하도록 명시. `found:false`면 에러 처리해 기존 폴백(로컬사전→안내문구)으로 빠짐. 사전조회 호출은 temperature 0.1로 낮춤(예문 생성은 0.7 유지).

#### v0.2.2 — 흘려듣기 단어 목록 눌러 상세보기
- `ListenView`의 `bg-list-item`을 버튼으로 바꿔 단어 상세(`DetailModal`)로 이동 가능하게
- 흘려듣기 오디오는 모듈 전역(`sharedAudio`)이라 모달을 열어도 끊기지 않음(모달 안 발음 버튼을 직접 누르면 그 소리가 재생되며 흘려듣기는 끊김 — 의도된 동작)

#### v0.2.3 — 온보딩 비율 묶음표시 + 가이드 아이콘 preload + 흘려듣기 상세 액션 + 범위기반 랜덤
- **온보딩 학습구성**: 같은 퍼센트끼리 뱃지를 묶어 한 줄로 표시(`(ピッ)(N3) 15%`) — N2처럼 항목 많은 레벨이 두 줄로 넘어가던 문제 해결
- **첫 사용자 가이드 아이콘 preload**: `<head>`에 `icons-01~05.png` `<link rel="preload">` 추가 — 가이드가 뜨는 시점(로드 후 0.45초)까지 미리 받아둬서 아이콘이 늦게 팝인되는 현상 제거
- **흘려듣기 상세에 즐겨찾기·학습대기·단어장 액션 추가**: `ListenView`에 `setCards`/`setDecks` 전달, `toggleStar`/`togglePriority`/`toggleCardDeck`/`createDeck`을 로컬 정의해 `bgDetailCard`용 `DetailModal`에 연결
- **흘려듣기 30단어 선정 기준을 "하루 고정"→"범위(소스+카테고리) 고정"으로 변경**: 이전엔 `Math.floor(Date.now()/86400000)` day-seed라 같은 날엔 어느 프리뷰에서 테스트해도 항상 같은 리스트였음(의도된 캐시 설계였지만 혼란을 줌). 이제 `BG_LIST_KEY`(localStorage)에 `{scopeKey, ids}`를 저장해, **범위가 같으면 직전 목록 재사용**(오디오 재굽기 없이 빠른 재생), **범위를 바꾸면 새로 무작위 30개** 선정. "새로운 단어 듣기" 버튼은 기존처럼 범위 무관 강제 무작위.

#### v0.2.4 — 온보딩 한 줄 강제 + 잔상버그 재대응 + 목록 상세 사이즈 + 듣기 단어탭 + 액션행 정리
- **온보딩 학습구성 강제 한 줄**: 그룹핑만으론 N2/N1이 여전히 두 줄이라, `.onb-ratio` 전체 패딩·뱃지 크기·gap을 Playwright로 정밀 측정해가며 추가로 축소(뱃지 패딩 4px8px→3px7px, 아이템 gap 5→2.5px, 항목간 gap 8→5px). N1(피ッ+N2+DAILY 묶여 1그룹) 기준 실측 검증 완료.
- **온보딩 전체 패딩/뱃지 높이 축소**: N1(설명 제일 김) 선택 시에도 학습 시작하기 버튼까지 한 화면에 들어오도록 — 컨테이너 패딩(24/40→16/18), 레벨 버튼 패딩(14→9px), 레벨간 gap(10→6px), 타이틀 폰트(26→23px), 서브타이틀·노트 margin 축소 등. Playwright로 iPhone 12~16(844/812) 완전히 들어옴, iPhone 8 Plus(736) 거의 들어옴(5px), iPhone SE(667)는 51px만 스크롤 필요(기존 218px에서 대폭 개선).
- **상단 노란 잔상 버그 재대응**: v0.1.10에서 새로고침 깜빡임을 없애려 `location.reload()`를 제거했는데, 그게 막아주던 iOS 잔상 버그가 되살아남. 전체 새로고침 대신 `forceRepaint()`(documentElement를 한 프레임 display:none→복원해 강제 리플로우) 추가, 온보딩 완료 직후 `requestAnimationFrame` 2회 뒤 호출. ⚠️ 실기기(iOS Safari) 미검증 — 재발 시 추가 대응 필요.
- **목록 단어 상세(WordDetailModal) 최대 크기 제한**: 새 클래스 `wd-overlay-pad`/`wd-modal-cap` 추가(공용 `.modal`/`.modal-overlay`는 DeckManager도 같이 쓰므로 건드리지 않음). 탭바 실측 높이(58px, 실제 CSS로 측정) + 20px 여백 = 78px를 하단에 확보, 내용은 기존처럼 `.modal-body`에서 스크롤. 상세 페이지 내부 UI는 변경 없음.
- **듣기 "화면 보면서 공부하기"에서도 단어 눌러 상세 가능**: 기존엔 `bgDetailCard`/`DetailModal` 렌더 블록이 `cfg.mode==="study"` 분기 밖(배경모드 분기 안)에 있어 화면모드에선 동작 안 했던 버그를 같이 발견해 수정 — 모달 렌더를 두 분기 바깥(항상 렌더)으로 이동. `.listen-word` 등을 감싸는 `.listen-info` 버튼 추가.
- **액션 버튼 행 정리**: 즐겨찾기를 텍스트 없이 별 아이콘만(`.wd-act-icon`)으로, 즐겨찾기/학습대기/단어장에 담기를 같은 `.wd-act-btn` 스타일로 통일하고 `.wd-actions`를 `flex-wrap:nowrap`으로 강제 한 줄. "단어장에 담기"는 항상 펼쳐진 칩 목록 대신, 누르면 `showDeckPicker` 상태로 토글되는 패널(새 단어장/기존 단어장 선택)로 변경.

> ⚠️ 이번 회차도 CDN 차단으로 실제 React 렌더는 못 함. 대신 index.html에서 실제 CSS를 그대로 추출해 정적 HTML로 재구성한 뒤 Playwright로 픽셀 단위 측정·스크린샷 검증(온보딩 줄바꿈, 모달-탭바 간격, 액션 버튼 한 줄 배치 등). 단, **forceRepaint()의 실기기 동작은 미검증** — 프리뷰에서 잔상 버그가 또 보이면 알려주세요.

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
