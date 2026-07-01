# ピッ!とVOCA — 작업 핸드오프

> 마지막 업데이트: 2026-06-30  
> 작업 브랜치: `claude/japanese-word-app-index-gc8nud`  
> 현재 버전: `v0.2.7`

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

#### v0.2.5 — 온보딩 간격, 잔상버그 근본원인 재진단, 설치배너 터치버그 대응, 액션버튼 패딩
- **온보딩 박스↔학습구성 간격 2배**: `.onb-ratio` margin-top 6px→12px (요청대로 이 간격만 단독으로 키움 — N1 한 화면 맞춤 작업과 별개로 사용자가 명시적으로 지정).
- **상단 노란 잔상 버그 — 근본원인 재진단**: v0.2.4의 `forceRepaint()`(DOM 강제 리플로우)로는 해결 안 됨이 확인됨. 재진단 결과, 원인은 온보딩이 `position:fixed` 노란 오버레이로만 그려지고 실제 `<body>` 배경과 `<meta name="theme-color">`는 계속 `#f2f2f7`로 남아있어 **iOS가 상태바 색을 결정할 때 실제 렌더링 색(노랑)과 메타 정보(흰색 계열)가 충돌**하는 것으로 보임(WebKit의 알려진 동작). `body.style.background`와 `theme-color` meta를 온보딩 상태(`onboard.done`)에 맞춰 실제로 동기화하는 `useEffect`로 교체 — 충돌 자체를 없애는 방식이라 이전(사후 리플로우 유도)보다 근본적인 접근. forceRepaint 호출은 안전망으로 유지.
- **설치 배너 버튼 터치 안 되는 버그 — 추정 원인 대응**: 확실한 재현 없이 코드 추론으로 대응(실기기 미검증). 유력 후보는 `home-screen.svg`의 SMIL 애니메이션(`<img>` 내부에서 4초간 반복)이 일으키는 반복 레이아웃/페인트가 형제 요소(나중에·설치 버튼)의 히트테스트 영역에 영향을 주는 것 — `.install-svg`에 `contain: layout paint`로 격리, 버튼 쪽엔 `touch-action: manipulation` + `position:relative; z-index:1`로 방어적 보강. **그래도 재현되면 알려주세요 — SVG 애니메이션을 통째로 빼서 원인을 좁히는 다음 단계로 가겠습니다.**
- **액션 버튼 패딩 60%로 축소**: `.wd-act-btn` 9px 14px → 5px 8px, `.wd-act-icon` 9px 12px → 5px 7px.

> ⚠️ 잔상버그·설치배너버그 둘 다 iOS Safari 전용이라 이 환경에서 실기기 검증이 원천적으로 불가능합니다. 코드 추론 기반 최선의 대응이며, 프리뷰에서 실제 확인이 꼭 필요합니다.

#### v0.2.6 — 온보딩 행간 80%, 예문 요미가나 통일, 잔상버그 3차 대응
- **온보딩 줄글 행간 80%로**: `.onb-title`(1.3→1.04), `.onb-sub`(1.5→1.2), `.onb-level-desc`(1.5→1.2), `.onb-note`(1.6→1.28) — 타이틀과 설명류 텍스트 전부.
- **예문 요미가나 통일**: `DetailModal`의 `wd-ex-ja`(목록 단어 상세)와 `ListenView` 화면모드의 `listen-ex-ja`가 토큰 없이 평문(`{ex.ja}`)만 보여주던 걸, 다른 곳(FlashCard·흘려듣기 bg-list 등)과 같은 `FuriganaText`/`furi-paren` 방식(작은 글씨 괄호, 例: 面接用（よう）に〜)으로 통일. `ex.tokens` 있으면 `FuriganaText`, 없으면 기존처럼 평문 폴백.
- **노란 잔상 버그 3차 대응**: v0.2.5(`body`+`theme-color` 동기화)로도 안 잡힘이 확인됨. 재진단 — "헤더"가 iOS 시스템 상태바가 아니라 **제거된 `position:fixed` 온보딩 오버레이의 합성 레이어 잔상 자체**일 가능성에 무게를 두고, `forceRepaint()`를 대폭 강화: ① 스크롤 1px 넛지(iOS의 fixed-레이어 재합성을 유도하는, 이 버그 유형에 가장 흔히 쓰이는 방법) ② `documentElement.opacity` 미세 토글(새 합성 레이어 강제 생성) ③ 기존 `display` 토글(리플로우) 3가지를 함께 수행하도록 변경. 또한 `<html>` 배경도 `<body>`와 같이 동기화하도록 추가. 온보딩 종료 시점의 repaint 트리거를 `OnboardingView`의 `onDone`이 아니라 App의 동기화 `useEffect` 한 곳으로 일원화(`wasOnboardRef`로 "방금 끝남" 전이만 감지).

> ⚠️ 이번에도 iOS 실기기 검증 불가. 만약 v0.2.6에서도 안 잡히면, 다음 단계로 의심해볼 것: (a) `apple-mobile-web-app-status-bar-style`을 `default`에서 `black-translucent`로 바꿔보기(상태바 렌더링 방식 자체가 다름), (b) 온보딩 오버레이를 `position:fixed` 대신 그냥 일반 흐름(in-flow) 전체화면 div로 바꿔보기(애초에 별도 합성 레이어를 안 만들면 잔상 자체가 생길 수 없음 — 가장 근본적이지만 레이아웃 영향 검토 필요), (c) 최후 수단으로 `location.reload()`를 되살리되 reload 직전 0.1초 안 보이게 페이드 처리.

#### v0.2.7 — 온보딩 행간 일부 되돌림, 예문 furigana는 그대로, **앱 셸 구조 변경(잔상+X버튼 버그 공통 원인 대응)**
- **온보딩 행간**: `.onb-title`(1.04→1.3 원복) · `.onb-sub`(1.2→1.5 원복). `.onb-level-desc`(1.2)·`.onb-note`(1.28)는 v0.2.6 그대로 유지.
- **목록 단어 상세(WordDetailModal) X버튼이 헤더에 가려 안 닫히는 버그(미설치 사파리에서)**: 원인 재구성 — `.app`가 `position:fixed; inset:0; overflow:hidden`이었고, `WordDetailModal`은 포털 없이 그 안 깊숙이(`scroll-area`→`content`→`ListView`) 중첩 렌더된다. **iOS Safari는 "fixed+overflow:hidden인 조상 안에 중첩된 fixed 자손"을 표준과 다르게(조상 박스 기준으로) 그리는 알려진 결함이 있다.** 특히 페이지 자체가 한 번도 진짜 스크롤되지 않는 구조(내부 `.scroll-area`만 스크롤)라 사파리 주소창이 자동으로 안 숨어 영구히 화면 일부를 가리는 상태와 겹쳐, 모달이 잘못된 기준으로 배치되며 X버튼이 주소창/헤더 뒤에 가려지고, 그 상태에서 스크롤하면 배경(`.scroll-area`)만 움직이는 것으로 보임.
  - **근본 수정**: `.app`를 `position:fixed;inset:0` → **일반 흐름 + `height:100dvh`(fallback 100vh)** 로 변경. `html, body`에 `overflow:hidden` 명시(기존엔 `overflow-x: hidden`만 있었음 — Y축도 막아 내부 스크롤러만 스크롤되는 기존 동작은 그대로 유지). `.onb`(온보딩)도 같은 이유로 `position:fixed` 대신 `.app`(flex column)의 `flex:1` 자식으로 변경.
  - **이 구조 변경이 "노란 잔상" 버그도 같이 고칠 가능성**: `.onb`가 더 이상 별도의 fixed 합성 레이어가 아니므로(`.app`의 평범한 flex 자식), React가 온보딩 → 본 화면으로 교체할 때 "제거된 fixed 레이어의 잔상이 안 지워지는" 부류의 버그가 애초에 발생할 토대 자체가 사라짐. v0.2.5/v0.2.6의 JS 기반 대응(`body`/`theme-color` 동기화, 강화된 `forceRepaint`)은 안전망으로 그대로 둠.
  - 검증: Chromium(Playwright)으로 `.app`가 `position:fixed` 없이도 풀스크린 높이를 정확히 채우는지, `scroll-area` 안 깊숙이 중첩된 `.modal-overlay`가 (구조 변경 후) 여전히 진짜 뷰포트 전체를 정확히 덮는지(헤더 위까지 포함) 픽셀 단위로 확인함.

> ⚠️ 이번 변경은 앱의 최상위 레이아웃 구조(`.app`/`.onb`)를 건드리는 더 근본적인 수정입니다. iOS Safari 실기기에서 **(1) X버튼이 이제 보이고 눌리는지, (2) 노란 잔상이 사라졌는지, (3) 헤더·탭바·당겨서새로고침 등 기존 레이아웃이 전혀 깨지지 않았는지** 셋 다 꼭 확인해 주세요. 구조 변경이라 회귀 위험이 이전 시도들보다 큽니다.

#### v0.2.8 — 온보딩 행간 진짜 원복, X버튼 버그 근본 원인 재진단(Portal), 잔상버그 스크롤넛지 실효성 수정

- **온보딩 행간(타이틀/서브타이틀)**: v0.2.4에서 시작된 축소를 넘어, **v0.2.4 이전의 진짜 원래 값**으로 복원. `.onb-title` line-height `1.3→1.35`, `.onb-sub` line-height `1.5→1.6`. `.onb-level-desc`(1.2)·`.onb-note`(1.28)는 v0.2.7 그대로 유지(사용자가 이 둘은 "현재대로" 유지 요청).
- **목록 단어 상세(WordDetailModal) X버튼 버그 — v0.2.7과 다른 원인으로 재진단**: v0.2.7에서 `.app`의 `position:fixed`를 없앤 구조 변경을 했음에도 이 버그가 재현됨. 코드를 다시 보니, 이 앱에서 정상 동작하는 한자/단어 상세 팝업(`DetailModal`)은 `ReactDOM.createPortal(..., document.body)`로 `.scroll-area` 밖(문서 최상단)에 그려지는 반면, **`WordDetailModal`·`DeckManager`·`FeedbackBox`의 오버레이는 포털을 안 쓰고 `.scroll-area`(`overflow-y:auto` + `-webkit-overflow-scrolling:touch`) 안에 그대로 중첩 렌더되고 있었다.** iOS Safari는 `-webkit-overflow-scrolling:touch`가 걸린 스크롤 컨테이너 안에 중첩된 `position:fixed` 자손의 위치 계산을 표준과 다르게(뷰포트가 아니라 그 스크롤 컨테이너 기준으로) 하는 알려진 결함이 있어, 오버레이가 `.scroll-area`가 시작하는 지점(헤더 바로 아래)부터 그려지며 상단(X버튼 위치)이 헤더에 가려지고, 터치 시 포털되지 않은 오버레이 뒤의 `.scroll-area`만 스크롤되는 것으로 보임. **v0.2.7의 `.app` 구조 변경은 이 특정 원인을 건드리지 못했을 가능성이 큼.**
  - **수정**: `WordDetailModal`, `DeckManager`, `FeedbackBox`의 오버레이를 `DetailModal`과 동일하게 `ReactDOM.createPortal(..., document.body)`로 변경. `FirstRunGuide`(`.guide-overlay`)는 원래부터 `.app`의 직접 자식(스크롤 영역 밖)이라 포털 불필요, 변경 없음.
- **노란 잔상 버그 — `forceRepaint()`의 스크롤 넛지가 애초에 무효였을 가능성**: `html, body { overflow: hidden }`이라 문서 자체의 스크롤 가능 범위가 항상 0이다. `window.scrollTo(x, y+1)` 같은 넛지는 스크롤 가능 범위가 있어야 실제로 스크롤 이벤트/합성 재계산을 유발하는데, 범위가 0이면 사실상 no-op이었을 가능성이 높음 — v0.2.4~v0.2.6이 이 트릭에 의존했지만 실제로는 작동하지 않았을 수 있다는 뜻.
  - **수정**: `forceRepaint()` 실행 시 1px 스페이서 엘리먼트를 `body`에 잠깐 붙이고 `html`/`body`의 `overflow`를 일시적으로 `auto`로 바꿔 실제 스크롤 여지를 만든 뒤 넛지하고, 즉시 원래 상태(스페이서 제거 + `overflow:hidden` 복원)로 되돌림. opacity 토글·display 토글은 기존 그대로 유지(안전망).
  - ⚠️ 이건 새 가설이며 여전히 iOS Safari 실기기 검증이 필요함. 이번에도 재현되면 HANDOFF v0.2.6에 적어둔 다음 후보 (a) `apple-mobile-web-app-status-bar-style: black-translucent`(단, standalone 모드에만 영향 — 미설치 사파리 탭 모드에는 효과 없을 가능성), (c) `location.reload()` + 페이드 최후수단을 검토.
- APP_VERSION `v0.2.8` / APP_BUILD `2026-07-01`.

> ⚠️ X버튼 버그는 이번엔 "다른 정상 동작하는 모달과 코드 패턴이 다르다"는 구조적 증거(포털 유무)에 기반한 수정이라 이전 시도들보다 확신도가 높습니다. 그래도 잔상버그는 여전히 가설 단계라 실기기 확인 꼭 필요합니다. 확인해야 할 것: **(1) 목록 탭에서 단어 눌렀을 때 X버튼이 헤더에 안 가려지고 바로 눌리는지, (2) 그 상태에서 모달 안 스크롤이 잘 되는지(배경만 스크롤되지 않는지), (3) 온보딩 완료 직후 노란 잔상이 그대로 남는지.**

#### Wayne QA(2026-06-30) 반영 — `words.js` 전수 교체 + TTS 오버라이드 + 예문 수동보정

- **`words.js` 전체 교체**: Wayne가 QA한 전 8,610단어(N1~N5·piccoma·daily)를 반영. 물결기호(`~`/`～`→`〜`) 955건 통일, 예문 재생성 7,497건, 뜻 교정 687건, Codex 교차검증 추가보정 44건. 적용 전 root `words.js`와 Wayne 산출물이 (물결기호 표기 차이를 제외하면) 완전히 동일한 순서·단어로 정렬되어 있음을 확인 후 그대로 교체(`pitto-voca_QA_delivery_wayne_20260630/build/words.js` 기준). 상세 내역은 `docs/QA_REPORT_{N1~N5,piccoma,daily}_wayne.md`, `docs/QA_SUMMARY_wayne.md` 참고(레포 밖 인수 폴더에 있음, 필요 시 저장소로 복사 고려).
- **`WORD_SPEECH_OVERRIDE` 1,010건 추가**: `index.html`의 `WORD_SPEECH_OVERRIDE` 객체에 Wayne 산출물(`docs/WORD_SPEECH_OVERRIDE_additions.js`) 전량 추가. reading 불일치로 표시된 35건(그룹 A)은 words.js 갱신 후 재대조해 대부분 reading 필드와 일치함을 확인(예: 心中·衣替え 등은 이미 Codex 보정으로 반영됨); 나머지(〜중복표기, "(かん)"류 괄호 주석 제거 등)는 TTS 낭독용 정제로 그대로 반영. 기존 키와 충돌 0건.
- **미개선 예문 83건 수동 재작성**: 자동 재생성 기준(14자) 미달로 원본이 유지됐던 항목(N1 24·N2 36·N3 14·daily 8·piccoma 1) 전부, 기존 QA와 같은 품질 기준(14자 이상, 누가/언제/왜가 담긴 자연스러운 문장)으로 새로 작성. 토큰-예문 결합 무결성 83/83 확인.

#### v0.2.9 — "홈 화면에 추가" 재온보딩 문제 대응, 온보딩 간격 조정

- **사파리에서 레벨 선택 후 "홈 화면에 추가"하면 다시 물어보는 문제**: iOS는 "홈 화면에 추가"로 설치한 앱이 사파리 탭과 storage(localStorage)를 공유하지 않는 별도 컨테이너라, 사파리에서 온보딩을 끝내도 홈 화면 앱은 그 정보를 못 읽어 재질문함. **완전한 해결은 플랫폼 제약상 불가능**(웹 콘텐츠만으로는 두 storage를 동기화할 방법이 없음)하지만, `saveOnboard()`가 완료 시점에 선택한 레벨을 URL에 남기고(`history.replaceState`로 `?ob=N3` 형태), `loadOnboard()`가 최초 로드 시 이 값을 읽어 즉시 복원하도록 수정. "홈 화면에 추가"는 그 순간의 주소를 그대로 북마크하므로, **온보딩을 끝낸 뒤에 홈 화면에 추가하면** 재질문 없이 넘어감. (온보딩 끝내기 전에 먼저 설치하는 경우는 여전히 한 번은 물어봄 — 애초에 다른 storage라 어쩔 수 없음.)
- **온보딩 화면 간격 조정**(사용자 요청 — 사파리 한 화면에 다 보이게 하려고 과도하게 좁혀졌던 것 보완):
  - `.onb-level` 버튼 안 패딩 30% 증가: `9px 14px` → `12px 18px`
  - "레벨 버튼 5개 / 학습구성 설명 텍스트 / 학습 시작하기" 사이 간격 120%로: `.onb-ratio`(레벨 버튼 아래) `margin-top 12px→14px`, `.onb-start`(시작 버튼 위) `margin-top 12px→14px`
- APP_VERSION `v0.2.9` / APP_BUILD `2026-07-01`.

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
