# 계획 1: 플레이 가능한 핵심 (로그인 없는 버전) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 로그인 없이 브라우저에서 알파벳 샘플 유닛과 "우물가의 리브가" 유닛(본문 읽기 → 퀴즈 → 롤플레이)을 끝까지 플레이할 수 있고, XP·스트릭·안식일 쉼표·성막 등불·단어장 복습이 동작하는 웹앱.

**Architecture:** Next.js App Router. 콘텐츠는 `content/` JSON 파일을 서버에서 읽어 zod로 검증한 뒤 클라이언트 컴포넌트에 props로 전달. 게임 로직(대본 엔진·채점·진도)은 전부 `lib/` 아래 순수 함수로 두고 단위 테스트. 진도는 이번 계획에서는 `localStorage`에 버전 붙은 스냅샷으로 저장(계획 2에서 Supabase 어댑터 추가).

**Tech Stack:** Next.js 15 (App Router, TypeScript strict), React 19, zod 3, Vitest 3 + @testing-library/react + jsdom, Playwright, Noto Serif Hebrew(next/font/google).

**Spec:** `docs/superpowers/specs/2026-11-03-biblical-hebrew-chat-game-design.md`

**이 계획에 포함되지 않는 것 (후속 계획):** Supabase 로그인·동기화(계획 2), AI 타이핑 채점·어려움 모드(계획 3), PWA·서비스워커·IndexedDB 오프라인 큐·녹음 음성·듣고 고르기 퀴즈·알파벳 배치 테스트·창세기 유닛 5개 전체 콘텐츠(계획 4).

## Global Constraints

- 모든 UI 문구는 한국어. 히브리어 텍스트 요소는 반드시 `lang="he" dir="rtl"` 및 Noto Serif Hebrew 폰트.
- 날짜 기준 시간대: **Asia/Seoul**. 날짜 문자열 형식 `YYYY-MM-DD`.
- 성막 등불: 미션당 **3개** 시작, 오답마다 1개 소등, 0개면 미션 실패(재시작).
- 안식일 쉼표: **주 1회 자동 지급, 최대 보유 1개**, 하루 놓치면 자동 소모.
- 복습 간격: **1 → 3 → 7 → 14일** (14에서 상한), 오답 시 1일로 리셋.
- 하루 목표 기본값: **레슨 1개**.
- AI는 이 계획에서 호출하지 않는다. 모든 대사는 콘텐츠 파일의 검수된 문장.
- 단어 ID는 OSHB/Strong's 형식 `H` + 숫자 (예: `H4325`).
- 앱 하단(모든 페이지)에 출처 표기: `본문: Westminster Leningrad Codex (퍼블릭 도메인) · 형태소 정보: Open Scriptures Hebrew Bible (CC BY 4.0)`.
- 특정 기존 앱의 이름·캐릭터·디자인을 쓰지 않는다. 가칭 앱 이름 표기: `알레프 여정`.
- Playwright: 컨테이너에 사전 설치된 Chromium 사용. `playwright install` 실행 금지. `@playwright/test` 버전이 맞지 않으면 `launchOptions.executablePath: '/opt/pw-browsers/chromium'`.

## Review Focus

1. **한국 시간 경계** — 기기 시간대가 한국이 아니어도(해외 사용자, UTC 서버) 스트릭 날짜는 서울 기준이어야 한다. → Task 7 `seoulDate` 테스트(UTC 15:00 = 서울 다음날).
2. **손상되거나 오래된 저장 데이터** — `localStorage`가 깨졌거나, 다른 버전이거나, 접근 시 예외(사생활 보호 모드)여도 앱이 죽지 않고 새 진도로 시작해야 한다. → Task 9 테스트 3종.
3. **잘못된/잠긴 레슨 URL 직접 접근** — 없는 레슨 ID는 404, 잠긴 레슨은 해당 유닛 페이지로 돌려보내야 한다. → Task 10 테스트.
4. **이미 완료한 레슨 반복** — XP 무한 파밍을 막되 복습은 장려: 반복 완료 시 고정 **5 XP**, 스트릭·하루 목표에는 정상 반영. → Task 7 테스트.
5. **롤플레이 연타** — 피드백 표시 중 버튼을 두 번 눌러도 등불이 두 번 꺼지거나 노드가 두 번 넘어가면 안 된다. → Task 13 테스트.

---

## File Structure

```
hebrew-game/
  content/
    course.json                 # 코스·유닛·레슨 순서
    lexicon.json                # 단어 사전 (lemmaId → Lexeme)
    lessons/*.json              # 레슨 1개당 파일 1개
  lib/
    content/schema.ts           # zod 스키마 + 타입 (단일 출처)
    content/load.ts             # 서버 전용: 파일 읽기 + 검증 + 캐시
    content/check.ts            # 콘텐츠 무결성 검사 (순수 함수)
    hebrew/normalize.ts         # 히브리어 정규화
    grader/rules.ts             # 보기·블록 규칙 채점
    script-engine/engine.ts     # 롤플레이 진행 (순수)
    progress/dates.ts           # seoulDate, daysBetween, addDays, isoWeek
    progress/snapshot.ts        # ProgressSnapshot 타입, emptySnapshot
    progress/streak.ts          # 쉼표 지급, 롤오버, 레슨 완료 기록, XP
    progress/unlock.ts          # 레슨·유닛 잠금 판정
    progress/review.ts          # 복습 큐
    progress/store.ts           # localStorage 저장소
    progress/ProgressProvider.tsx  # React 컨텍스트 + useProgress
  scripts/check-content.ts      # CLI: npm run check:content
  app/
    layout.tsx                  # 폰트, 헤더(XP·스트릭·쉼표), 출처 푸터
    page.tsx                    # 홈 진도 지도
    unit/[unitId]/page.tsx      # 유닛의 레슨 목록
    lesson/[lessonId]/page.tsx  # 레슨 타입별 뷰로 분기 + 잠금 처리
    vocab/page.tsx              # 단어장 + 복습
    not-found.tsx
  components/
    HebrewText.tsx
    ReadingView.tsx  QuizView.tsx  RoleplayView.tsx
    ReviewSession.tsx  LessonComplete.tsx
  tests/                        # Vitest (경로는 lib/·components/ 구조 미러링)
  e2e/                          # Playwright
```

---

### Task 1: 프로젝트 골격

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `app/layout.tsx`(임시), `app/page.tsx`(임시), `tests/smoke.test.ts`, `.gitignore`

**Interfaces:**
- Produces: npm 스크립트 `dev`, `build`, `test`(vitest run), `test:e2e`(playwright test), `check:content`(tsx scripts/check-content.ts), `lint`. 경로 별칭 `@/*` → 프로젝트 루트.

- [ ] **Step 1:** `create-next-app@15` (TypeScript, App Router, ESLint, no Tailwind 여부는 자유, `src/` 없음, 별칭 `@/*`)로 생성. 의존성 추가: `zod@3`, 개발 의존성 `vitest@3 @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event tsx @playwright/test`.
- [ ] **Step 2:** `vitest.config.ts` — environment `jsdom`, setupFiles에서 `@testing-library/jest-dom/vitest` 로드, 별칭 `@` 설정, `e2e/` 제외.
- [ ] **Step 3:** 실패 테스트 `tests/smoke.test.ts`: `expect(await import('@/lib/version')).toHaveProperty('APP_NAME', '알레프 여정')`.
- [ ] **Step 4:** `npm test` → FAIL (모듈 없음).
- [ ] **Step 5:** `lib/version.ts`에 `export const APP_NAME = '알레프 여정'`.
- [ ] **Step 6:** `npm test` → PASS. `npm run build` → 성공.
- [ ] **Step 7:** 커밋 `chore: scaffold Next.js app with Vitest and Playwright`.

---

### Task 2: 콘텐츠 스키마와 로더

**Files:**
- Create: `lib/content/schema.ts`, `lib/content/load.ts`
- Test: `tests/lib/content/schema.test.ts`, `tests/lib/content/load.test.ts`, `tests/fixtures/content/**`

**Interfaces:**
- Produces (`schema.ts`, zod 스키마와 `z.infer` 타입 함께 export):
  ```ts
  type HebrewLine = { he: string; translit: string; ko: string; lemmaIds: string[] }
  type Lexeme = { id: string; lemma: string; translit: string; glossKo: string; posKo: string }
  type Lexicon = Record<string, Lexeme>
  type Course = { id: string; titleKo: string; units: Unit[] }
  type Unit = { id: string; titleKo: string; refKo?: string; mapLabelKo: string; lessonIds: string[] }

  type ReadingLesson = { id: string; type: 'reading'; titleKo: string;
    verses: { refKo: string; words: { surface: string; lemmaId: string; translit: string; glossKo: string; grammarKo?: string }[]; translationKo: string }[] }

  type ChoiceQuestion = { kind: 'choice'; prompt: { he?: string; ko: string }; choices: string[]; answerIndex: number; lemmaId?: string }
  type OrderQuestion  = { kind: 'order'; promptKo: string; tokens: string[]; answer: string[]; lemmaIds: string[] }
  type QuizLesson = { id: string; type: 'quiz'; titleKo: string; questions: (ChoiceQuestion | OrderQuestion)[] }

  type ChoiceReply = { mode: 'choice'; options: { id: string; line: HebrewLine; correct: boolean; next?: string; feedbackKo?: string }[] }
  type BlocksReply = { mode: 'blocks'; promptKo: string; tokens: string[]; accepted: string[]; next: string; lemmaIds: string[] }
  type ScriptNode = { id: string; narrationKo?: string; npc?: HebrewLine; reply?: ChoiceReply | BlocksReply; end?: true }
  type RoleplayLesson = { id: string; type: 'roleplay'; titleKo: string; setupKo: string;
    character: { nameKo: string; nameHe: string }; startNodeId: string; nodes: Record<string, ScriptNode> }

  type Lesson = ReadingLesson | QuizLesson | RoleplayLesson   // discriminated on `type`
  ```
  스키마 내 규칙: `answerIndex`는 `choices` 범위 안, `choices.length >= 2`, ChoiceReply 옵션 중 `correct: true`인 것은 반드시 `next`를 가짐, `lemmaId` 패턴 `/^H\d+$/`. 노드는 `reply`와 `end` 중 정확히 하나.
- Produces (`load.ts`, `import 'server-only'`):
  `loadCourse(dir?: string): Course`, `loadLexicon(dir?): Lexicon`, `loadLesson(id: string, dir?): Lesson | null`(파일 없으면 null, 스키마 위반이면 throw), `loadAllLessons(dir?): Lesson[]`. 기본 `dir` = `path.join(process.cwd(), 'content')`. 프로덕션에서는 결과 메모이즈.

- [ ] **Step 1:** 실패 테스트 — schema: 유효한 각 레슨 타입 픽스처가 parse 성공; `answerIndex: 5`(choices 3개) 실패; `correct:true`인데 `next` 없는 옵션 실패; `reply`와 `end` 둘 다 있는 노드 실패; `lemmaId: "water"` 실패. load: 픽스처 dir에서 `loadLesson('missing')` → `null`; 깨진 JSON 레슨 → throw(에러 메시지에 레슨 ID 포함).
- [ ] **Step 2:** `npx vitest run tests/lib/content` → FAIL.
- [ ] **Step 3:** 스키마와 로더 구현. `load.test.ts`는 `vi.mock('server-only', () => ({}))`.
- [ ] **Step 4:** 테스트 PASS.
- [ ] **Step 5:** 커밋 `feat(content): add zod content schema and server loader`.

---

### Task 3: 콘텐츠 무결성 검사기

**Files:**
- Create: `lib/content/check.ts`, `scripts/check-content.ts`
- Test: `tests/lib/content/check.test.ts`

**Interfaces:**
- Consumes: Task 2 타입.
- Produces: `checkContent(course: Course, lessons: Lesson[], lexicon: Lexicon): string[]` — 오류 메시지 배열(빈 배열 = 통과). 각 메시지는 `[<lessonId>] ...` 형식.
  검사 항목:
  1. course의 모든 `lessonIds`가 lessons에 존재, 레슨 ID 중복 없음, 어떤 유닛에도 속하지 않은 레슨 없음.
  2. 모든 `lemmaId`/`lemmaIds`(읽기 단어, 퀴즈, npc 대사, 옵션 대사, 블록)가 lexicon에 존재.
  3. 롤플레이: `startNodeId`와 모든 `next`가 실제 노드; 시작에서 도달 가능한 노드만 존재(고아 노드 금지); 도달 가능한 모든 노드에서 `end` 노드에 도달 가능; 각 choice 노드에 정답 옵션 ≥ 1.
  4. 블록: 각 `accepted` 문장을 공백 분할(정규화 후)한 토큰이 모두 `tokens`에 있는 토큰(정규화 후)으로 구성. OrderQuestion의 `answer`는 `tokens`의 순열.
- `scripts/check-content.ts`: `loadCourse/loadAllLessons/loadLexicon` → `checkContent` → 오류 출력 후 `process.exit(1)`, 없으면 `콘텐츠 검사 통과 (레슨 N개, 단어 M개)` 출력.
  (CLI는 `server-only`를 import하지 못하므로 `load.ts`의 파일 읽기 부분을 `lib/content/read-files.ts`로 분리해도 됨 — 분리 시 `load.ts`는 그것을 재export.)

- [ ] **Step 1:** 실패 테스트 — 각 검사 항목마다 위반 픽스처 1개씩(인메모리 객체), 기대 메시지에 해당 lessonId와 문제 ID 포함. 정상 픽스처 → `[]`. 사이클은 있지만 end에 도달 가능한 대본은 통과; end로 갈 수 없는 사이클은 실패.
- [ ] **Step 2:** FAIL 확인.
- [ ] **Step 3:** 구현 (그래프 검사는 BFS 두 번: 정방향 도달성, 역방향 그래프로 end 도달성). 블록 정규화는 Task 5가 아직 없으므로 이 Task에서는 `trim` + 공백 압축만; Task 5 완료 후 `normalizeHebrew`로 교체하는 것은 Task 5의 Step에 포함.
- [ ] **Step 4:** PASS 확인.
- [ ] **Step 5:** 커밋 `feat(content): add content integrity checker and CLI`.

---

### Task 4: 샘플 콘텐츠 (알파벳 샘플 + 우물가의 리브가)

**Files:**
- Create: `content/course.json`, `content/lexicon.json`, `content/lessons/alef-bet-1.json`, `content/lessons/rebekah-reading.json`, `content/lessons/rebekah-quiz.json`, `content/lessons/rebekah-roleplay.json`, `content/README.md`
- Test: `tests/content/real-content.test.ts`

**Interfaces:**
- Produces: 코스 `genesis-intro`, 유닛 `unit-0-alefbet`(레슨 `alef-bet-1`), `unit-1-rebekah`(레슨 순서 `rebekah-reading`, `rebekah-quiz`, `rebekah-roleplay`). E2E(Task 15)는 이 ID와 아래 정답에 의존.

내용 요구사항:
- `alef-bet-1`(quiz): 자음 א ב ג ד ה 의 이름 고르기 ChoiceQuestion 5개 (예: prompt.he `"א"`, choices `["알레프","베트","김멜"]`).
- `rebekah-reading`: 창 24:17, 24:18 두 구절. 본문 자음+모음(악센트 제외), 단어별 lemmaId·음역·한국어 뜻·간단 문법(예: `"명령형 남성 단수 + 1인칭 단수 접미사"`), 구절 번역.
  - 24:17 `וַיָּרָץ הָעֶבֶד לִקְרָאתָהּ וַיֹּאמֶר הַגְמִיאִינִי נָא מְעַט־מַיִם מִכַּדֵּךְ`
  - 24:18 `וַתֹּאמֶר שְׁתֵה אֲדֹנִי וַתְּמַהֵר וַתֹּרֶד כַּדָּהּ עַל־יָדָהּ וַתַּשְׁקֵהוּ`
- `rebekah-quiz`: ChoiceQuestion 4개(מַיִם, נָא, שְׁתֵה, אֲדֹנִי의 뜻) + OrderQuestion 1개(`מְעַט מַיִם` 어순 — tokens에 방해 토큰 1개 포함, answer 2개 토큰).
- `rebekah-roleplay`: 사용자는 아브라함의 종, NPC는 리브가. 노드 흐름:
  `intro`(narrationKo 상황 설명, choice: "물을 청한다" 정답 `הַגְמִיאִינִי נָא מְעַט מַיִם` / 오답 2개) → `rebekah-answers`(npc `שְׁתֵה אֲדֹנִי`, blocks: `promptKo: "다시 한번 \"물 조금\"을 청해 보세요"`, tokens `["מַיִם","מְעַט","כַּד"]`, accepted `["מְעַט מַיִם"]` — **이 유닛에서 배운 어휘만** 사용) → `end`(narrationKo로 마무리, `end: true`).
  최소 1개 choice 노드에 정답 옵션 2개가 서로 다른 `next`로 분기하도록 구성(분기 동작 검증용).
- lexicon: 위 레슨에 등장하는 모든 lemmaId (예: H7323 רוּץ, H5650 עֶבֶד, H7125 קִרְאָה/לִקְרַאת, H559 אָמַר, H1572 גָּמָא, H4994 נָא, H4592 מְעַט, H4325 מַיִם, H3537 כַּד, H8354 שָׁתָה, H113 אָדוֹן, H4116 מָהַר, H3381 יָרַד, H5921 עַל, H3027 יָד, H8248 שָׁקָה).
- `content/README.md`: 파일 형식 요약, `npm run check:content` 사용법, **"모든 히브리어 본문·문법 설명·번역은 출시 전 성경 히브리어 전문가 검수 필수"** 경고, OSHB 출처·라이선스.

- [ ] **Step 1:** 실패 테스트 `real-content.test.ts`: 실제 `content/`를 로드해 `checkContent(...)`가 `[]`; course의 유닛 ID·레슨 순서가 위와 일치; `rebekah-roleplay`에 정답 옵션이 2개 이상인 choice 노드가 1개 이상.
- [ ] **Step 2:** FAIL 확인.
- [ ] **Step 3:** 콘텐츠 파일 작성. 본문은 WLC 텍스트와 대조(가능하면 OSHB XML 해당 절 확인)하고 lemmaId는 OSHB 값 사용.
- [ ] **Step 4:** `npm test` PASS, `npm run check:content` → `콘텐츠 검사 통과 (레슨 4개, 단어 16개)` 형태 출력.
- [ ] **Step 5:** 커밋 `content: add alef-bet sample and Rebekah at the well unit`.

---

### Task 5: 히브리어 정규화와 규칙 채점

**Files:**
- Create: `lib/hebrew/normalize.ts`, `lib/grader/rules.ts`
- Modify: `lib/content/check.ts` (블록 정규화를 `normalizeHebrew`로 교체)
- Test: `tests/lib/hebrew/normalize.test.ts`, `tests/lib/grader/rules.test.ts`

**Interfaces:**
- Produces:
  ```ts
  normalizeHebrew(s: string, opts?: { stripNiqqud?: boolean }): string
  type GradeResult = { correct: boolean; next?: string; feedbackKo?: string }
  gradeChoice(reply: ChoiceReply, optionId: string): GradeResult   // 없는 optionId → throw
  gradeBlocks(reply: BlocksReply, picked: string[]): GradeResult   // correct면 next = reply.next
  gradeOrder(q: OrderQuestion, picked: string[]): boolean
  gradeChoiceQuestion(q: ChoiceQuestion, index: number): boolean
  ```
- `normalizeHebrew` 규칙(순서대로): NFD 분해 → 칸틸레이션 악센트 U+0591–U+05AF 제거 → 소프 파숙 U+05C3·파섹 U+05C0 제거 → 마카프 U+05BE를 공백으로 → `stripNiqqud`(기본 `false`)면 U+05B0–U+05BD, U+05BF, U+05C1, U+05C2, U+05C4, U+05C5, U+05C7 제거 → NFC → 공백 압축 + trim. 블록·어순 채점은 `stripNiqqud: false`로 비교(토큰이 콘텐츠에서 오므로 니쿠드 동일).

- [ ] **Step 1:** 실패 테스트 — `normalizeHebrew('מְעַט־מַיִם')` === `'מְעַט מַיִם'`; 악센트 포함 `'בְּרֵאשִׁ֖ית'` → `'בְּרֵאשִׁית'`; `stripNiqqud:true`로 `'מַיִם'` → `'מים'`; 모음 부호 입력 순서가 다른 두 문자열(NFC 순서 차이)이 같은 결과; 앞뒤·중복 공백 정리. rules: 정답 옵션 → `{correct:true, next}`; 오답 → `{correct:false, feedbackKo}`; 없는 optionId → throw; 블록에서 accepted 중 두 번째 문장과 일치해도 정답; 순서 틀리면 오답; 빈 배열 오답.
- [ ] **Step 2:** FAIL 확인.
- [ ] **Step 3:** 구현, `check.ts`가 `normalizeHebrew` 사용하도록 수정.
- [ ] **Step 4:** `npm test` 전체 PASS (Task 3·4 테스트 포함).
- [ ] **Step 5:** 커밋 `feat(grader): add Hebrew normalization and rule-based grading`.

---

### Task 6: 롤플레이 대본 엔진

**Files:**
- Create: `lib/script-engine/engine.ts`
- Test: `tests/lib/script-engine/engine.test.ts`

**Interfaces:**
- Consumes: `RoleplayLesson`, `ScriptNode`(Task 2), `GradeResult`(Task 5).
- Produces:
  ```ts
  const STARTING_LAMPS = 3
  type MissionState = { nodeId: string; lamps: number; mistakes: number; status: 'playing' | 'won' | 'lost'; history: string[] }
  startMission(lesson: RoleplayLesson): MissionState
  applyGrade(lesson: RoleplayLesson, state: MissionState, result: GradeResult): MissionState
  currentNode(lesson: RoleplayLesson, state: MissionState): ScriptNode
  ```
  규칙: `status !== 'playing'`이면 상태 그대로 반환(무시). 정답 → `nodeId = result.next`, `history`에 이전 nodeId 추가; 새 노드가 `end`면 `status: 'won'`. 오답 → `lamps - 1`, `mistakes + 1`, 노드 유지; `lamps === 0`이면 `status: 'lost'`. 정답인데 `next`가 없거나 존재하지 않는 노드 → throw. 순수 함수(입력 불변).

- [ ] **Step 1:** 실패 테스트 — 시작 상태 `{nodeId: startNodeId, lamps:3, mistakes:0, status:'playing', history:[]}`; 정답 2번으로 end 도달 시 `won`; 오답 3번 → `lost`, `lamps:0`; `lost` 상태에서 applyGrade → 동일 객체 값; 서로 다른 정답 옵션이 서로 다른 노드로 분기; 입력 state 객체가 변경되지 않음(`Object.freeze`로 확인).
- [ ] **Step 2:** FAIL 확인.
- [ ] **Step 3:** 구현.
- [ ] **Step 4:** PASS 확인.
- [ ] **Step 5:** 커밋 `feat(engine): add pure roleplay script engine with lamps`.

---

### Task 7: 진도 핵심 로직 (날짜·XP·스트릭·쉼표·잠금)

**Files:**
- Create: `lib/progress/dates.ts`, `lib/progress/snapshot.ts`, `lib/progress/streak.ts`, `lib/progress/unlock.ts`
- Test: `tests/lib/progress/dates.test.ts`, `tests/lib/progress/streak.test.ts`, `tests/lib/progress/unlock.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // dates.ts
  seoulDate(now: Date): string                 // Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' })
  addDays(date: string, n: number): string
  daysBetween(from: string, to: string): number
  isoWeek(date: string): string                // 'YYYY-Www'

  // snapshot.ts
  type ReviewItem = { lemmaId: string; intervalDays: number; nextReviewDate: string; correctCount: number; wrongCount: number }
  type ProgressSnapshot = {
    version: 1; xp: number; dailyGoal: number;
    completed: Record<string, { completedAt: string; score: number; perfect: boolean }>;
    streak: { current: number; longest: number; lastActiveDate: string | null };
    restTokens: number; restTokenWeek: string | null;
    today: { date: string; lessonsCompleted: number };
    reviews: Record<string, ReviewItem>;
  }
  emptySnapshot(today: string): ProgressSnapshot   // dailyGoal 1, restTokens 0, restTokenWeek null

  // streak.ts
  const XP = { reading: 10, quiz: 10, roleplay: 20, perfectBonus: 5, repeat: 5 } as const
  xpForLesson(type: Lesson['type'], perfect: boolean, isRepeat: boolean): number
  startOfDay(s: ProgressSnapshot, today: string): ProgressSnapshot   // rollover → grant 순서
  recordLessonComplete(s: ProgressSnapshot, lesson: { id: string; type: Lesson['type'] },
                       result: { score: number; perfect: boolean }, today: string, nowIso: string): ProgressSnapshot

  // unlock.ts
  isLessonUnlocked(course: Course, lessonId: string, completed: ProgressSnapshot['completed']): boolean
  isUnitUnlocked(course: Course, unitId: string, completed: ProgressSnapshot['completed']): boolean
  ```
- `startOfDay` 규칙 (순서 고정, Global Constraints 참고):
  1. 롤오버: `lastActiveDate`가 null이거나 `daysBetween(last, today) <= 1` → 변화 없음. 정확히 2일(하루 놓침)이고 `restTokens > 0` → `restTokens - 1`, `lastActiveDate = addDays(today, -1)`(스트릭 유지). 그 외 → `current = 0`.
  2. 쉼표 지급: `isoWeek(today) !== restTokenWeek` → `restTokens = min(1, restTokens + 1)`, `restTokenWeek = isoWeek(today)`.
  3. `today.date !== today` → `today = { date: today, lessonsCompleted: 0 }`.
- `recordLessonComplete`: 내부에서 `startOfDay`를 먼저 적용. XP 가산(`isRepeat` = 이미 completed에 있음; 반복이면 `XP.repeat`만). `completed[id]`는 더 높은 score로 갱신. `today.lessonsCompleted + 1`이 `dailyGoal`에 처음 도달하고 `lastActiveDate !== today`이면 `current + 1`, `longest = max`, `lastActiveDate = today`.
- 잠금: 코스 전체를 유닛 순서대로 평탄화했을 때 첫 레슨은 항상 열림, 나머지는 바로 앞 레슨이 completed일 때 열림. 유닛은 첫 레슨이 열려 있으면 열림.

- [ ] **Step 1:** 실패 테스트 —
  - dates: `seoulDate(new Date('2026-11-03T15:00:00Z'))` === `'2026-11-04'`; `'2026-11-03T14:59:59Z'` → `'2026-11-03'`; `daysBetween('2026-12-31','2027-01-01')` === 1; `isoWeek('2026-11-03')` === `'2026-W45'`; `isoWeek('2027-01-01')` === `'2026-W53'`.
  - streak: 첫 레슨 완료 → `current 1, longest 1`; 같은 날 두 번째 레슨 → `current` 그대로; 다음날 완료 → 2; 하루 놓치고 쉼표 1개 → `startOfDay` 후 `restTokens 0`, 완료 시 `current` 이어짐; 하루 놓치고 쉼표 0개 → 완료 시 `current 1`, `longest` 유지; 이틀 놓침 + 쉼표 1개 → 리셋; 같은 ISO 주에 `startOfDay` 두 번 → 쉼표 1개만; 쉼표 1개 보유 중 새 주 → 여전히 1(상한); **롤오버가 지급보다 먼저**: 일요일을 놓친 월요일(새 주), 쉼표 0개 → 스트릭 리셋 후 쉼표 1개 지급; XP: reading 10, roleplay perfect 25, 반복 완료 5; 반복 시 score는 최고값 유지.
  - unlock: 빈 completed → `alef-bet-1`만 열림; `alef-bet-1` 완료 → `rebekah-reading` 열림, `rebekah-quiz` 잠김; 없는 lessonId → false.
- [ ] **Step 2:** FAIL 확인.
- [ ] **Step 3:** 구현.
- [ ] **Step 4:** PASS 확인.
- [ ] **Step 5:** 커밋 `feat(progress): add Seoul dates, XP, streak, rest tokens, unlocking`.

---

### Task 8: 단어장 복습 큐

**Files:**
- Create: `lib/progress/review.ts`
- Test: `tests/lib/progress/review.test.ts`

**Interfaces:**
- Consumes: `ProgressSnapshot`, `ReviewItem`(Task 7), `Lexicon`, `ChoiceQuestion`(Task 2).
- Produces:
  ```ts
  const REVIEW_INTERVALS = [1, 3, 7, 14] as const
  addLearned(s: ProgressSnapshot, lemmaIds: string[], today: string): ProgressSnapshot      // 이미 있으면 건드리지 않음; 새 항목 interval 1, next = today+1
  recordReview(s: ProgressSnapshot, lemmaId: string, correct: boolean, today: string): ProgressSnapshot
      // 정답: 다음 간격(14 상한), 오답: 1로 리셋; next = today + interval; 없는 항목이면 생성
  dueReviews(s: ProgressSnapshot, today: string): ReviewItem[]   // nextReviewDate <= today, 날짜 오름차순
  buildReviewQuestion(lemmaId: string, lexicon: Lexicon, rng: () => number): ChoiceQuestion
      // prompt.he = lemma, choices = 정답 glossKo + 다른 단어 glossKo 3개(사전이 작으면 가능한 만큼, 최소 2지선다), 셔플, lemmaId 포함
  ```

- [ ] **Step 1:** 실패 테스트 — 간격 진행 1→3→7→14→14; 7에서 오답 → 1; `addLearned` 중복 무시; `dueReviews`가 오늘 이전·당일만 반환; `buildReviewQuestion`에 고정 rng 주입 시 결정적이고, 정답 index의 choice가 해당 glossKo, 중복 보기 없음, 사전에 단어 2개뿐이면 2지선다.
- [ ] **Step 2:** FAIL 확인.
- [ ] **Step 3:** 구현.
- [ ] **Step 4:** PASS 확인.
- [ ] **Step 5:** 커밋 `feat(progress): add spaced review queue`.

---

### Task 9: 진도 저장소와 React 컨텍스트

**Files:**
- Create: `lib/progress/store.ts`, `lib/progress/ProgressProvider.tsx`
- Test: `tests/lib/progress/store.test.ts`, `tests/lib/progress/ProgressProvider.test.tsx`

**Interfaces:**
- Consumes: Task 7·8 함수.
- Produces:
  ```ts
  const STORAGE_KEY = 'aleph-journey:progress'
  interface ProgressStore { load(today: string): ProgressSnapshot; save(s: ProgressSnapshot): void }
  createLocalStore(storage?: Storage): ProgressStore
      // load: 없음/JSON 오류/version !== 1/스키마 불일치/getItem 예외 → emptySnapshot(today). save 예외는 삼키고 console.warn.
  // ProgressProvider.tsx ('use client')
  <ProgressProvider store?: ProgressStore now?: () => Date>
  useProgress(): {
    snapshot: ProgressSnapshot; today: string;
    completeLesson(lesson: { id: string; type: Lesson['type'] }, result: { score: number; perfect: boolean }, learnedLemmaIds?: string[]): void;
    reviewAnswered(lemmaId: string, correct: boolean): void;
  }
  ```
  마운트 시 `load` → `startOfDay` → `save`. 모든 변경 후 즉시 `save`. 서버 렌더링 시에는 `emptySnapshot`으로 렌더하고 마운트 후 로드(하이드레이션 불일치 방지); 로드 전에는 `ready: false`도 반환(위 반환 타입에 `ready: boolean` 포함).
  `completeLesson`의 `learnedLemmaIds`는 `addLearned`로 반영.

- [ ] **Step 1:** 실패 테스트 — store: 저장 후 로드 왕복 동일; 깨진 JSON → empty; `version: 2` → empty; `getItem`이 throw하는 Storage 목 → empty, 예외 전파 없음; `setItem` throw → 예외 전파 없음. Provider: 테스트 컴포넌트에서 `completeLesson` 호출 시 화면의 XP 텍스트가 10으로 갱신되고 store.save가 호출됨; `now`를 주입해 `today` 확인.
- [ ] **Step 2:** FAIL 확인.
- [ ] **Step 3:** 구현.
- [ ] **Step 4:** PASS 확인.
- [ ] **Step 5:** 커밋 `feat(progress): add versioned localStorage store and ProgressProvider`.

---

### Task 10: 레이아웃, 홈 진도 지도, 유닛 페이지, 레슨 라우팅

**Files:**
- Create/Modify: `app/layout.tsx`, `app/page.tsx`, `app/unit/[unitId]/page.tsx`, `app/lesson/[lessonId]/page.tsx`, `app/not-found.tsx`, `components/HebrewText.tsx`, `components/HeaderStats.tsx`, `components/JourneyMap.tsx`, `components/LessonGate.tsx`, `app/globals.css`
- Test: `tests/components/JourneyMap.test.tsx`, `tests/components/LessonGate.test.tsx`, `tests/components/HebrewText.test.tsx`

**Interfaces:**
- Consumes: `loadCourse`, `loadLesson`(Task 2), `isLessonUnlocked`, `isUnitUnlocked`(Task 7), `useProgress`(Task 9).
- Produces:
  - `<HebrewText text: string className? />` — `<span lang="he" dir="rtl">`, Noto Serif Hebrew (next/font `--font-hebrew` CSS 변수).
  - `<LessonGate course lessonId unitId>{children}</LessonGate>` ('use client') — `ready` 전에는 로딩 표시, 잠겨 있으면 `router.replace('/unit/' + unitId)`, 열려 있으면 children.
  - `app/lesson/[lessonId]/page.tsx`(서버): `loadLesson`이 null이면 `notFound()`. 레슨이 속한 유닛을 course에서 찾아 `LessonGate`로 감싸고, `type`에 따라 `ReadingView`/`QuizView`/`RoleplayView`(Task 11–13) 렌더. 이 Task에서는 세 뷰를 `레슨 준비 중` 플레이스홀더 컴포넌트로 먼저 만들어 둔다(Task 11–13에서 교체).
  - 레이아웃: 헤더에 앱 이름 `알레프 여정`, `HeaderStats`(XP, 🔥 스트릭 일수, 쉼표 보유 수), 링크(지도 `/`, 단어장 `/vocab`); 푸터에 Global Constraints의 출처 문구. `ProgressProvider`로 전체 감싸기. 모바일 우선, 본문 최대폭 640px, 좌우 16px 여백.
  - `JourneyMap`: 유닛을 세로 경로로 나열, 각 유닛은 `mapLabelKo`·`titleKo`·완료 레슨 수/전체, 잠긴 유닛은 비활성(링크 없음, `aria-disabled`).
  - 유닛 페이지: 레슨 목록, 잠김/열림/완료 상태 표시.

- [ ] **Step 1:** 실패 테스트 — HebrewText가 `lang="he"`·`dir="rtl"` 속성; JourneyMap에 빈 진도 → 유닛 0 링크 활성, 유닛 1 `aria-disabled="true"`; `alef-bet-1` 완료 진도 → 유닛 1 활성, `1/1` 표시; LessonGate: 잠긴 레슨이면 `router.replace('/unit/unit-1-rebekah')` 호출(`next/navigation` 목), 열린 레슨이면 children 렌더.
- [ ] **Step 2:** FAIL 확인.
- [ ] **Step 3:** 구현.
- [ ] **Step 4:** `npm test` PASS. `npm run build` 성공. `npm run dev` 후 `/lesson/nope` → 404 화면, `/` 지도 표시 수동 확인.
- [ ] **Step 5:** 커밋 `feat(ui): add layout, journey map, unit page, lesson routing with lock gate`.

---

### Task 11: 본문 읽기 화면

**Files:**
- Create: `components/ReadingView.tsx`, `components/LessonComplete.tsx`
- Modify: `app/lesson/[lessonId]/page.tsx` (플레이스홀더 교체)
- Test: `tests/components/ReadingView.test.tsx`

**Interfaces:**
- Consumes: `ReadingLesson`, `HebrewText`, `useProgress().completeLesson`.
- Produces:
  - `<LessonComplete xpGained: number unitId: string nextLessonId?: string />` — "레슨 완료!", `+N XP`, 다음 레슨 버튼(있으면), 지도로 버튼. Task 12·13에서도 재사용.
  - `<ReadingView lesson: ReadingLesson lexicon: Lexicon unitId nextLessonId? />`: 서버 페이지가 이 레슨에 쓰인 lemmaId만 골라 `lexicon` 부분집합으로 전달. 구절을 한 번에 하나씩 표시. 단어는 RTL 순서의 버튼; 탭하면 아래 카드에 원형(`lexicon[lemmaId].lemma`), 음역, 뜻, 품사, 문법 표시. 구절 번역은 "해석 보기" 토글. 마지막 구절에서 "완료" → `completeLesson({id, type:'reading'}, {score:100, perfect:true}, 모든 lemmaId)` 후 LessonComplete(xpGained는 완료 전후 snapshot.xp 차이).
  - 모든 단어를 하나 이상 눌러봐야 완료 가능한 제약은 두지 않는다(YAGNI).

- [ ] **Step 1:** 실패 테스트 — 첫 구절의 단어 버튼 수 = 단어 수; `מַיִם` 버튼 클릭 → 카드에 `물` 표시; "해석 보기" 클릭 시 번역 표시; 다음 → 마지막 → 완료 클릭 시 `completeLesson`이 lemmaId 목록과 함께 호출되고 `+10 XP` 표시. (`useProgress`는 테스트용 Provider에 메모리 store 주입)
- [ ] **Step 2:** FAIL 확인.
- [ ] **Step 3:** 구현.
- [ ] **Step 4:** PASS 확인.
- [ ] **Step 5:** 커밋 `feat(ui): add reading view and lesson complete screen`.

---

### Task 12: 퀴즈 화면

**Files:**
- Create: `components/QuizView.tsx`, `components/ChoiceQuestionCard.tsx`, `components/OrderQuestionCard.tsx`
- Modify: `app/lesson/[lessonId]/page.tsx`
- Test: `tests/components/QuizView.test.tsx`

**Interfaces:**
- Consumes: `QuizLesson`, `gradeChoiceQuestion`, `gradeOrder`(Task 5), `useProgress().completeLesson / reviewAnswered`, `LessonComplete`.
- Produces:
  - `<ChoiceQuestionCard question onAnswered(correct: boolean) />`, `<OrderQuestionCard question onAnswered(correct: boolean) />` — Task 14 `ReviewSession`이 `ChoiceQuestionCard` 재사용. 답 선택 후 정답/오답 피드백(정답 보기 강조)과 "다음" 버튼; 답 확정 후에는 재선택 불가.
  - OrderQuestionCard: 토큰 은행에서 탭해 답 줄(RTL)에 추가, 답 줄 토큰 탭 시 은행으로 복귀, "확인" 버튼.
  - `<QuizView lesson unitId nextLessonId? />`: 문항 순차 진행, 진행 바, 오답 문항의 lemmaId(들)는 `reviewAnswered(id, false)`, 정답은 `reviewAnswered(id, true)`. 종료 시 score = 정답률(0–100 정수), perfect = 전부 정답 → `completeLesson`.
  - 퀴즈에는 패널티(등불) 없음.

- [ ] **Step 1:** 실패 테스트 — 정답 보기 클릭 → "정답!" 표시 후 다른 보기 클릭해도 변화 없음; 오답 → 정답 보기 강조; 어순 문제에서 토큰을 올바른 순서로 탭 후 확인 → 정답; 5문항 중 4개 정답으로 끝내면 `completeLesson`이 `{score: 80, perfect: false}`로 호출; 오답 문항 lemmaId로 `reviewAnswered(…, false)` 호출.
- [ ] **Step 2:** FAIL 확인.
- [ ] **Step 3:** 구현.
- [ ] **Step 4:** PASS 확인.
- [ ] **Step 5:** 커밋 `feat(ui): add quiz view with choice and word-order questions`.

---

### Task 13: 롤플레이 미션 화면

**Files:**
- Create: `components/RoleplayView.tsx`, `components/LampMeter.tsx`, `components/ChatBubble.tsx`, `components/ReplyChoices.tsx`, `components/ReplyBlocks.tsx`
- Modify: `app/lesson/[lessonId]/page.tsx`
- Test: `tests/components/RoleplayView.test.tsx`

**Interfaces:**
- Consumes: `startMission`, `applyGrade`, `currentNode`, `STARTING_LAMPS`(Task 6), `gradeChoice`, `gradeBlocks`(Task 5), `useProgress().completeLesson`, `LessonComplete`, `HebrewText`.
- Produces:
  - `<RoleplayView lesson unitId nextLessonId? />`: 상단 `setupKo` 카드와 `LampMeter`(켜진 등불 수 / 3, `aria-label="남은 등불 N개"`). 채팅 로그: 지나간 노드의 narration·npc 대사·사용자 선택 대사를 말풍선으로 누적(npc 왼쪽, 사용자 오른쪽). 각 히브리어 말풍선에 "음역"·"해석" 토글(기본: 음역 켜짐, 해석 꺼짐).
  - 응답 영역: `choice` → 옵션 버튼(히브리어 + 음역), `blocks` → 토큰 조립 + 확인.
  - 채점 후 피드백 단계: 정답이면 사용자 말풍선 추가 후 "계속"; 오답이면 `feedbackKo`(없으면 `"다시 해 보세요."`) 표시, 등불 감소 애니메이션, "다시" 버튼. **피드백 단계 동안 응답 입력은 비활성화**(연타 방지 — Review Focus 5).
  - `won` → `completeLesson({id,type:'roleplay'}, {score: round(100 * lamps/3), perfect: mistakes === 0})` → `LessonComplete`. `lost` → "등불이 모두 꺼졌어요" 화면 + "처음부터 다시"(`startMission`).

- [ ] **Step 1:** 실패 테스트 (`rebekah-roleplay` 실제 콘텐츠 로드 또는 동일 구조 픽스처) — 시작 시 `남은 등불 3개`; 오답 옵션 클릭 → `남은 등불 2개` + 피드백 문구; **오답 옵션을 빠르게 두 번 클릭해도 `남은 등불 2개`**; 정답 진행으로 끝까지 가면 `completeLesson`이 `{score:100, perfect:true}`; 오답 3번 → "등불이 모두 꺼졌어요", "처음부터 다시" 후 `남은 등불 3개`; 블록 조립 노드에서 정답 순서 → 다음 노드 진행; 두 정답 옵션이 서로 다른 다음 대사로 이어짐.
- [ ] **Step 2:** FAIL 확인.
- [ ] **Step 3:** 구현.
- [ ] **Step 4:** PASS 확인.
- [ ] **Step 5:** 커밋 `feat(ui): add roleplay mission view with lamps and branching`.

---

### Task 14: 단어장과 복습 세션

**Files:**
- Create: `app/vocab/page.tsx`, `components/VocabList.tsx`, `components/ReviewSession.tsx`
- Test: `tests/components/VocabList.test.tsx`, `tests/components/ReviewSession.test.tsx`

**Interfaces:**
- Consumes: `loadLexicon`(서버 페이지에서 로드 후 props 전달), `dueReviews`, `buildReviewQuestion`(Task 8), `ChoiceQuestionCard`(Task 12), `useProgress().reviewAnswered`.
- Produces:
  - `/vocab`: 상단 "오늘 복습할 단어 N개" + "복습 시작" 버튼(N=0이면 비활성, 문구 `"오늘은 복습할 단어가 없어요"`). 아래 `VocabList`: 배운 단어 전체(히브리어, 음역, 뜻, 다음 복습일), 배운 단어가 없으면 `"아직 배운 단어가 없어요. 첫 레슨을 시작해 보세요!"`.
  - `<ReviewSession lemmaIds lexicon rng? onDone() />`: 문항마다 `buildReviewQuestion`, 답하면 `reviewAnswered`, 끝나면 `"복습 완료! 정답 X/Y"`.

- [ ] **Step 1:** 실패 테스트 — 빈 진도 → 빈 단어장 문구 + 복습 버튼 비활성; reviews 2개(1개만 오늘 기한) → `오늘 복습할 단어 1개`; ReviewSession에서 정답 클릭 → `reviewAnswered(id, true)`, 끝나면 `정답 1/1`.
- [ ] **Step 2:** FAIL 확인.
- [ ] **Step 3:** 구현.
- [ ] **Step 4:** PASS 확인.
- [ ] **Step 5:** 커밋 `feat(ui): add vocabulary list and review session`.

---

### Task 15: E2E — 전체 흐름과 모바일 화면

**Files:**
- Create: `e2e/core-flow.spec.ts`, `e2e/mobile.spec.ts`
- Modify: `playwright.config.ts` (webServer: `npm run build && npm run start`, port 3000; 프로젝트 `desktop`(1280×800), `mobile`(390×844))

**Interfaces:**
- Consumes: Task 4 콘텐츠 ID·정답, 전체 UI.

- [ ] **Step 1:** `core-flow.spec.ts` 작성 —
  1. `/` → 유닛 1 비활성 확인 → 유닛 0 → `alef-bet-1` 전부 정답 → 완료 화면 `+15 XP`(quiz 10 + perfect 5) → 헤더 스트릭 `1`.
  2. 유닛 1 → 본문 읽기 완료 → 퀴즈 완료 → 롤플레이 중 오답 1회(등불 2개 확인) 후 정답으로 완주 → 완료 화면.
  3. 새로고침 후 XP·완료 상태 유지(localStorage).
  4. `/vocab`에 `מַיִם` 표시.
  5. 잠긴 레슨 직접 접근: 새 컨텍스트에서 `/lesson/rebekah-roleplay` → URL이 `/unit/unit-1-rebekah`로 바뀜. `/lesson/nope` → 404 문구.
  6. `localStorage`에 `aleph-journey:progress = "{broken"` 넣고 `/` 로드 → 지도 정상 표시, XP 0.
  7. 모든 페이지 푸터에 `Open Scriptures Hebrew Bible (CC BY 4.0)` 포함.
- [ ] **Step 2:** `mobile.spec.ts` — 390px 폭에서 `/`, 각 레슨 화면, `/vocab`에서 `document.documentElement.scrollWidth <= 390`(가로 스크롤 없음); 히브리어 말풍선의 `dir`이 `rtl`.
- [ ] **Step 3:** `npm run test:e2e` → 전부 PASS. (실패 시 원인 수정 후 재실행)
- [ ] **Step 4:** `npm test && npm run check:content && npm run build` 전부 성공 확인.
- [ ] **Step 5:** 커밋 `test(e2e): cover core learning flow, lock gate, corrupted storage, mobile width`.

---

## 설계 문서와의 차이 (계획 2에서 반영)
- 쉼표 주간 지급 추적을 위해 `restTokenWeek` 필드를 추가했다 → 계획 2에서 Supabase `profiles`에 `rest_token_week` 컬럼 추가.
- XP 수치(읽기 10, 퀴즈 10, 롤플레이 20, 무실수 +5, 반복 5)는 이 계획에서 새로 정한 값이다.

## 완료 기준 (계획 1)
- `npm test`, `npm run check:content`, `npm run build`, `npm run test:e2e` 모두 통과.
- 브라우저에서 알파벳 샘플 → 리브가 유닛(읽기·퀴즈·롤플레이) 완주, 새로고침 후 진도 유지.
- 콘텐츠 README에 전문가 검수 필요 경고가 있고, 앱 푸터에 출처 표기가 있음.
