# 친구와 주간 순위 (게스트·카카오·Supabase) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 로그인 없이(게스트) 또는 카카오로 친구를 맺고, 홈에서 "이번 주 친구 순위"로 경쟁하며, 진도가 서버에 백업·기기 간 이동되는 기능.

**Architecture:** Supabase(익명 로그인 + 카카오 OAuth, Postgres + RLS + security-definer RPC). 클라이언트는 `CloudApi` 인터페이스 하나로만 서버와 대화하고(실구현 Supabase, 테스트·E2E용 가짜 구현), 진도의 정본은 계속 브라우저(오프라인 우선)이며 XP 이벤트는 보낼 목록(outbox)으로 재전송한다. 환경 변수가 없으면 클라우드 기능 전체가 꺼지고 앱은 지금처럼 동작한다.

**Tech Stack:** Next.js 15, React 19, `@supabase/supabase-js@2.118.0`, Postgres 16(로컬 SQL 테스트), Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-13-friends-ranking-design.md`

## Global Constraints

- 게스트도 모든 기능 사용. 카카오는 선택. 카카오 동의 항목: 닉네임, 프로필 사진(이메일 받지 않음).
- 친구에게 노출: `nickname, avatar_id`, 랭크(총 XP), 주간 XP, 연속일만.
- 친구 코드: `ALEF-` + 4자, 문자 집합 `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (0/O/1/I 제외).
- `record_xp`: `gained` 1~30, 한 주 누적 상한 2,100, `week`는 서버 시각(Asia/Seoul) 기준 이번 주 또는 지난주만.
- 순위 정렬: 주간 XP 내림차순 → 연속일 내림차순 → 닉네임. 주 시작: 월요일 0시(Asia/Seoul). 지난주 친구 1위(주간 XP>0)에 👑.
- 환경 변수 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`가 없으면 클라우드 UI를 숨기고 아무 요청도 보내지 않는다. 서비스 키는 앱에 넣지 않는다.
- 서버 호출 실패는 학습을 막지 않는다.
- 오류 문구: "초대 코드를 찾을 수 없어요" / "내 코드예요" / "이미 친구예요" / "순위를 불러오지 못했어요 · 다시 시도" / "인터넷에 연결되면 순위가 보여요" / "카카오 연결이 취소되었어요".
- 새 의존성 버전은 2주 이상 된 정확한 버전으로 고정.

## Review Focus

1. **두 기기 합치기** — B 기기에서 게스트로 쌓은 진도와 친구가, 이미 A 기기에서 카카오를 연결한 계정으로 로그인할 때 덮어써지지 않고 합쳐져야 한다. → Task 9 `absorb` 테스트.
2. **주 경계의 늦은 전송** — 일요일 23:59(서울)에 끝낸 레슨이 오프라인 큐에 있다가 월요일에 전송되면 지난주로 인정돼야 한다(지난주까지 허용, 2주 전은 거부). → Task 1 SQL 테스트.
3. **첫 방문에 서버 불통** — 세션을 만들 수 없어도 앱은 정상, 순위 카드는 오류/오프라인 상태, 다음 실행 때 재시도. → Task 5 테스트.
4. **자기 초대 링크** — 초대한 본인이 링크를 열면 오류 없이 "내 코드예요". → Task 7 테스트.
5. **새 기기에서 프로필** — 카카오로 다른 기기 로그인 시 서버 닉네임·사진이 브라우저 기본값을 덮어야 한다(반대 아님). → Task 5 테스트.

---

## File Structure

```
supabase/migrations/20261113000000_friends.sql   # 테이블, RLS, RPC
supabase/tests/stub_auth.sql                      # 로컬 Postgres용 auth 스키마 흉내 (auth.users, auth.uid(), 역할)
supabase/tests/friends.test.sql                   # SQL 단언 테스트
scripts/test-sql.sh                               # 임시 Postgres로 마이그레이션+테스트 실행
lib/cloud/types.ts          # CloudApi 인터페이스, 타입, CloudError
lib/cloud/config.ts         # 환경 변수 → 설정 여부
lib/cloud/supabase-api.ts   # CloudApi 실구현
lib/cloud/fake-api.ts       # 브라우저 메모리/로컬저장 가짜 구현 (E2E용, NEXT_PUBLIC_CLOUD_FAKE=1)
lib/cloud/outbox.ts         # XP 이벤트 보낼 목록
lib/cloud/CloudProvider.tsx # 세션·프로필·동기화·순위 컨텍스트
lib/progress/merge.ts       # 두 스냅샷 합치기
lib/week.ts                 # 주 범위 표시
components/LeaderboardCard.tsx, components/InviteButton.tsx
components/FriendsManager.tsx, components/AccountSection.tsx
app/friends/page.tsx, app/invite/[code]/page.tsx, app/auth/callback/page.tsx
docs/setup-supabase-kakao.md                      # 사용자 설정 안내
tests/utils/fake-cloud.ts                         # 단위 테스트용 가짜 CloudApi (vi.fn 기반)
```

---

### Task 1: 데이터베이스 마이그레이션과 SQL 테스트

**Files:** Create `supabase/migrations/20261113000000_friends.sql`, `supabase/tests/stub_auth.sql`, `supabase/tests/friends.test.sql`, `scripts/test-sql.sh`; Modify `package.json` (script `test:sql`).

**Interfaces — Produces (SQL):**
- 테이블 `profiles(user_id uuid pk references auth.users on delete cascade, nickname text check (char_length between 1 and 12), avatar_id text, friend_code text unique not null, created_at, updated_at)`, `progress(user_id pk, snapshot jsonb not null, updated_at)`, `weekly_xp(user_id, week text, xp int check (xp between 0 and 2100), streak int check (streak >= 0), updated_at, pk(user_id, week))`, `friendships(user_a, user_b, created_at, pk(user_a,user_b), check (user_a < user_b))`, `transfer_tickets(ticket text pk, guest_id uuid, expires_at timestamptz)`.
- 함수 `current_week() returns text` = `to_char(now() at time zone 'Asia/Seoul', 'IYYY-"W"IW')`, `previous_week() returns text`.
- RPC (모두 `security definer`, `search_path = public`, `auth.uid()` 필수):
  - `ensure_profile(p_nickname text, p_avatar_id text) returns profiles` — 없으면 생성(코드 발급), 있으면 그대로 반환(덮지 않음).
  - `update_profile(p_nickname text, p_avatar_id text) returns profiles`
  - `profile_by_code(p_code text) returns table(nickname text, avatar_id text, is_me boolean)` — 코드는 대소문자 무시, 없으면 0행.
  - `add_friend(p_code text) returns table(user_id uuid, nickname text, avatar_id text)` — 예외 `P0001` 메시지 `not_found` / `self` / `already`.
  - `remove_friend(p_user uuid) returns void`
  - `record_xp(p_week text, p_gained int, p_streak int) returns int` (그 주 누적) — 범위 위반 시 `invalid_gained` / `invalid_week` / 상한은 2100에서 멈춤(오류 아님).
  - `friend_leaderboard(p_week text) returns table(user_id uuid, nickname text, avatar_id text, total_xp int, week_xp int, streak int, is_me boolean, crown boolean)` — 정렬은 Global Constraints. `total_xp`는 `coalesce((progress.snapshot->>'xp')::int, 0)`.
  - `create_transfer_ticket() returns text` (10분 유효), `absorb_guest(p_ticket text) returns void` — 티켓의 게스트 친구 관계를 호출자로 옮기고(자기 자신·중복 제외), `weekly_xp`는 주별 큰 값으로 합치고, 게스트 `auth.users` 행 삭제.
  - `delete_my_account() returns void` — 호출자 `auth.users` 삭제(cascade).
- RLS: `profiles` 본인 select/update만; `progress` 본인 select/insert/update만; `weekly_xp`·`friendships`·`transfer_tickets` 직접 접근 없음(RPC만). `anon` 역할은 RPC 실행 불가, `authenticated`만 허용.

- [ ] **Step 1:** `stub_auth.sql` — `create schema auth; create table auth.users(id uuid primary key default gen_random_uuid(), is_anonymous boolean default true);` `auth.uid()`는 `current_setting('request.jwt.claim.sub', true)::uuid`. 역할 `anon`, `authenticated` 생성(존재하면 무시).
- [ ] **Step 2:** `friends.test.sql` 작성 — 헬퍼 `as_user(uuid)`(set role authenticated + set_config sub). 단언(`do $$ ... assert ... $$`):
  - 두 사용자 A, B `ensure_profile` → 코드가 `^ALEF-[A-HJ-NP-Z2-9]{4}$`, 서로 다름; 두 번째 `ensure_profile('다른', 'saul')`은 닉네임을 바꾸지 않음.
  - A가 B 코드로 `add_friend` → `friend_leaderboard(current_week())`를 A와 B 각각 실행하면 둘 다 2행.
  - 같은 코드 재추가 → `already`; 자기 코드 → `self`; 없는 코드 → `not_found`; 소문자 코드도 성공.
  - `record_xp(current_week(), 31, 1)` → `invalid_gained`; `record_xp('2020-W01', 10, 1)` → `invalid_week`; `record_xp(previous_week(), 10, 1)` 성공 (Review Focus 2); 30을 71번 → 누적 2100에서 멈춤.
  - 순위: A 주간 50/연속 2, B 50/연속 5, C(친구 아님) 999 → A의 순위표는 [B, A], C 없음.
  - 왕관: 지난주 B 40, A 10 → 이번 주 순위의 B `crown = true`, A false; 지난주 모두 0이면 왕관 없음.
  - A가 B의 `progress`를 select하면 0행(RLS).
  - `remove_friend(B)` 후 A 순위표 1행.
  - 게스트 G가 친구 B와 지난주 XP 30을 갖고 `create_transfer_ticket()` → K로 `absorb_guest(ticket)` → K 순위표에 B, K의 지난주 XP ≥ 30, G `auth.users`에서 사라짐; 만료 티켓 → `invalid_ticket`.
  - `delete_my_account()` 후 그 사용자 `profiles` 0행.
- [ ] **Step 3:** `scripts/test-sql.sh` — 임시 디렉터리에 `initdb`, 임의 포트로 `pg_ctl start`, `psql -v ON_ERROR_STOP=1`로 stub → migration → test 순서 실행, 종료 시 정리(trap). `package.json`: `"test:sql": "bash scripts/test-sql.sh"`. 실행: `npm run test:sql` → 마이그레이션이 없어 FAIL.
- [ ] **Step 4:** 마이그레이션 작성. 친구 코드는 `gen_random_bytes` 대신 `random()`으로 문자 집합에서 4자 뽑고 unique 충돌 시 반복.
- [ ] **Step 5:** `npm run test:sql` → `friends.test.sql: all assertions passed` 출력, 종료 코드 0.
- [ ] **Step 6:** 커밋 `feat(db): Supabase schema, RLS and RPCs for friends and weekly XP`.

---

### Task 2: CloudApi 인터페이스, 설정, 가짜 구현

**Files:** Create `lib/cloud/types.ts`, `lib/cloud/config.ts`, `lib/cloud/fake-api.ts`, `tests/utils/fake-cloud.ts`; Test `tests/lib/cloud/fake-api.test.ts`, `tests/lib/cloud/config.test.ts`.

**Interfaces — Produces:**
```ts
type CloudUser = { id: string; isGuest: boolean }
type CloudProfile = { nickname: string; avatarId: string; friendCode: string }
type FriendSummary = { userId: string; nickname: string; avatarId: string }
type LeaderboardRow = FriendSummary & { totalXp: number; weekXp: number; streak: number; isMe: boolean; crown: boolean }
class CloudError extends Error { code: 'not_found' | 'self' | 'already' | 'invalid_ticket' | 'network' | 'unknown' }
interface CloudApi {
  ensureSession(): Promise<CloudUser>                 // 세션 없으면 익명 로그인
  ensureProfile(p: Profile): Promise<CloudProfile>
  updateProfile(p: Profile): Promise<CloudProfile>
  pullProgress(): Promise<ProgressSnapshot | null>
  pushProgress(s: ProgressSnapshot): Promise<void>
  recordXp(week: string, gained: number, streak: number): Promise<void>
  leaderboard(week: string): Promise<LeaderboardRow[]>
  profileByCode(code: string): Promise<(FriendSummary & { isMe: boolean }) | null>
  addFriend(code: string): Promise<FriendSummary>
  removeFriend(userId: string): Promise<void>
  connectKakao(returnTo: string): Promise<void>       // 게스트에 카카오 연결(리다이렉트). 이미 다른 계정이면 티켓 발급 후 카카오 로그인으로 진행
  finishAuth(): Promise<{ absorbed: boolean }>        // /auth/callback에서 호출
  signOut(): Promise<void>
  deleteAccount(): Promise<void>
}
// config.ts
isCloudConfigured(env?: Record<string, string | undefined>): boolean
createCloudApi(): CloudApi | null   // 설정 없으면 null, NEXT_PUBLIC_CLOUD_FAKE=1이면 fake
```
- `tests/utils/fake-cloud.ts`: `fakeCloud(overrides?)` → 모든 메서드가 `vi.fn`인 `CloudApi` + 기본 동작(내 코드 `ALEF-ME22`, 친구 없음).
- `lib/cloud/fake-api.ts`: `createFakeCloudApi(storage?: Storage)` — 로컬 저장소 기반, 미리 심어둔 친구 코드 `ALEF-DEMO`(닉네임 "다윗", 아바타 `saul`, 이번 주 XP 120, 연속 6)를 가진다. 같은 오류 코드 규칙.

- [ ] **Step 1:** 실패 테스트 — config: 두 변수 다 있으면 true, 하나라도 없으면 false. fake-api: `ensureSession` 두 번 호출해도 같은 id; `addFriend('alef-demo')` 성공 후 `leaderboard`가 [다윗(120), 나]; 같은 코드 재추가 `already`; 내 코드 `self`; 없는 코드 `not_found`; `recordXp(week, 31, 1)`은 `unknown` 오류(상한 흉내).
- [ ] **Step 2:** FAIL 확인 → **Step 3:** 구현 → **Step 4:** `npx vitest run tests/lib/cloud` PASS.
- [ ] **Step 5:** 커밋 `feat(cloud): CloudApi contract, config switch and fake backend`.

---

### Task 3: 진도 합치기

**Files:** Create `lib/progress/merge.ts`; Test `tests/lib/progress/merge.test.ts`.

**Interfaces — Produces:** `mergeSnapshots(a: ProgressSnapshot, b: ProgressSnapshot): ProgressSnapshot` (교환 법칙 성립: `merge(a,b)`와 `merge(b,a)`가 같음).

규칙(스펙 4장): `xp` 큰 값; `completed` 합집합, 같은 레슨은 점수 높은 쪽(동점이면 `perfect` OR); `reviews` 단어별 `nextReviewDate` 늦은 쪽(같으면 `correctCount+wrongCount` 큰 쪽); `streak`는 `lastActiveDate` 최근 쪽 전체(같으면 `current` 큰 쪽), `longest`는 둘 중 최대; `weekXp` 같은 주면 큰 값, 다르면 주가 늦은 쪽; `today` 날짜 늦은 쪽(같으면 `lessonsCompleted` 큰 쪽); `restTokens`/`restTokenWeek`/`dailyGoal`은 `restTokenWeek` 늦은 쪽 값.

- [ ] **Step 1:** 실패 테스트 — 위 규칙마다 1개 + 교환 법칙(두 다른 스냅샷으로 `toEqual`) + 빈 스냅샷과 합치면 원본과 같음.
- [ ] **Step 2–4:** FAIL → 구현 → PASS. **Step 5:** 커밋 `feat(progress): merge snapshots from two devices`.

---

### Task 4: 보낼 목록(outbox)과 ProgressProvider 연결점

**Files:** Create `lib/cloud/outbox.ts`; Modify `lib/progress/ProgressProvider.tsx`; Test `tests/lib/cloud/outbox.test.ts`, `tests/lib/progress/ProgressProvider.test.tsx`(추가).

**Interfaces — Produces:**
- `type XpEvent = { week: string; gained: number; streak: number }`
- `OUTBOX_KEY = 'aleph-journey:outbox'`; `enqueue(ev: XpEvent): void`; `pending(): XpEvent[]`; `flush(send: (ev: XpEvent) => Promise<void>): Promise<{ sent: number; left: number }>` — 앞에서부터 보내고 첫 실패에서 멈춤(순서 보존), 보낸 것만 제거. 저장소 예외 시 메모리로 동작.
- `ProgressApi` 추가: `subscribe(listener: (s: ProgressSnapshot, ev: XpEvent | null) => void): () => void` — `completeLesson`이 커밋할 때 `ev`(이번에 얻은 XP, 주, 현재 연속일)와 함께 호출, `reviewAnswered`는 `ev = null`. `replaceSnapshot(s: ProgressSnapshot): void` — 합친 결과 반영(저장 포함, 리스너 호출 없음).

- [ ] **Step 1:** 실패 테스트 — outbox: 3개 넣고 두 번째에서 send 실패 → `{sent:1,left:2}`, 다음 flush에서 남은 2개를 순서대로; 저장소 throw여도 enqueue/flush 동작. Provider: `completeLesson` 후 리스너가 `ev = { week: '2026-W45', gained: 10, streak: 1 }`로 1회 호출(FIXED_NOW 기준); 해제 후 호출 없음; `replaceSnapshot`이 화면 XP를 바꾸고 store에 저장.
- [ ] **Step 2–4:** FAIL → 구현 → PASS(`npm test`). **Step 5:** 커밋 `feat(cloud): XP outbox and progress subscription hooks`.

---

### Task 5: CloudProvider (세션·프로필·동기화·순위)

**Files:** Create `lib/cloud/CloudProvider.tsx`, `lib/week.ts`; Modify `app/layout.tsx`(ProgressProvider 안쪽에 CloudProvider), `lib/progress/ProgressProvider.tsx`(필요 시 `setProfile`이 리스너 알림); Test `tests/lib/cloud/CloudProvider.test.tsx`, `tests/lib/week.test.ts`.

**Interfaces:**
- Consumes: Task 2 `CloudApi`, Task 3 `mergeSnapshots`, Task 4 `subscribe/replaceSnapshot/outbox`, 기존 `useProgress().profile/setProfile`.
- Produces: `<CloudProvider api?: CloudApi | null>`(기본 `createCloudApi()`), `useCloud(): { status: 'off' | 'connecting' | 'ready' | 'error'; user: CloudUser | null; profile: CloudProfile | null; leaderboard: { rows: LeaderboardRow[]; state: 'idle' | 'loading' | 'ready' | 'error' | 'offline' }; refreshLeaderboard(): Promise<void>; lookupCode(code: string): Promise<(FriendSummary & { isMe: boolean }) | null>; addFriend(code): Promise<FriendSummary>; removeFriend(id): Promise<void>; connectKakao(): Promise<void>; signOut(): Promise<void>; deleteAccount(): Promise<void> }`.
- `lib/week.ts`: `weekRangeLabel(today: string): string` → `'11월 10일 ~ 16일'` (월~일; 달이 바뀌면 `'11월 30일 ~ 12월 6일'`).
- 시작 순서(ProgressProvider `ready` 이후 1회): `ensureSession` → `ensureProfile(로컬 profile)` → **서버 프로필로 로컬 프로필 덮기**(Review Focus 5) → `pullProgress` → 있으면 `mergeSnapshots`로 `replaceSnapshot` → `pushProgress(합친 결과)` → `outbox.flush(recordXp)` → `refreshLeaderboard`. 단계 실패 시 `status='error'`, 순위 `state = navigator.onLine ? 'error' : 'offline'`; `online` 이벤트와 다음 마운트에서 재시도(Review Focus 3).
- `subscribe`: `ev`가 있으면 `outbox.enqueue(ev)` 후 flush, 항상 `pushProgress`(1초 디바운스), 성공 후 `refreshLeaderboard`.
- 로컬 `setProfile` 시 `updateProfile` 호출.
- `api === null`이면 `status='off'`, 아무 호출 없음.

- [ ] **Step 1:** 실패 테스트(가짜 api, `renderWithProgress` 확장) — off: api null이면 `status off`, 호출 0; 정상: 순서대로 호출되고 `status ready`, 순위 rows 노출; 서버 프로필 `{nickname:'다윗',avatarId:'saul'}`이면 로컬 프로필이 '다윗'으로 바뀜; 서버 진도 xp 50·로컬 15 → 화면 xp 50, `pushProgress`가 50으로 호출; `ensureSession` reject → `status error`, 순위 `error`, 앱은 렌더(Review Focus 3); 레슨 완료 → `recordXp('2026-W45', 15, 1)` 호출; `recordXp` 실패 → outbox에 남음; week: `weekRangeLabel('2026-11-13')` = `'11월 10일 ~ 16일'`, `weekRangeLabel('2026-12-02')` = `'11월 30일 ~ 12월 6일'`.
- [ ] **Step 2–4:** FAIL → 구현 → `npm test` PASS. **Step 5:** 커밋 `feat(cloud): CloudProvider for session, profile sync, progress merge and leaderboard`.

---

### Task 6: 홈 순위 카드와 친구 초대 버튼

**Files:** Create `components/LeaderboardCard.tsx`, `components/InviteButton.tsx`; Modify `components/TodayHome.tsx`(ProfileCard 아래), `components/ProfileCard.tsx`(👑 표시: 내 행 crown이면 닉네임 옆), `app/globals.css`; Test `tests/components/LeaderboardCard.test.tsx`, `tests/components/InviteButton.test.tsx`.

**Interfaces:** Consumes `useCloud()`, `weekRangeLabel`, `avatarById`, `rankFor`. Produces `<LeaderboardCard />`(status off면 `null`), `<InviteButton code: string nickname: string />` — `navigator.share({ title: '알레프 여정', text: '{nickname} 님이 히브리어 여정에 초대했어요', url: origin + '/invite/' + code })`, 미지원/거부 시 `navigator.clipboard.writeText(url)` 후 "초대 링크를 복사했어요", 둘 다 실패하면 링크를 선택 가능한 텍스트로 표시.

카드 구성: 제목 "🏆 이번 주 친구 순위" + 기간; 행: 순위 숫자, 아바타, 닉네임(내 행 `(나)`·강조 클래스 `me`), 랭크 글자(`rankFor(totalXp)`), `{weekXp} XP`, `🔥 {streak}`, crown이면 👑; 친구 0명이면 내 행 + "친구를 초대해 함께 경쟁해 보세요" + 강조된 초대 버튼; 하단 "친구 초대하기", "코드로 추가"(→ `/friends`).

- [ ] **Step 1:** 실패 테스트 — 행 순서·`(나)` 강조·👑·랭크 글자; error 상태 문구와 "다시 시도" 클릭 시 `refreshLeaderboard` 호출; offline 문구; off면 아무것도 렌더 안 함; InviteButton: share 있으면 정확한 url로 호출, share 없으면 clipboard 호출 후 안내 문구.
- [ ] **Step 2–4:** FAIL → 구현 → PASS. **Step 5:** 커밋 `feat(home): weekly friends leaderboard and invite button`.

---

### Task 7: 초대 링크 페이지

**Files:** Create `app/invite/[code]/page.tsx`(클라이언트 컴포넌트, `export const dynamic = 'force-dynamic'` 불필요 — 클라이언트에서 조회), `components/InviteLanding.tsx`; Test `tests/components/InviteLanding.test.tsx`.

**Interfaces:** Consumes `useCloud().lookupCode` / `addFriend` (Task 5). Produces `<InviteLanding code: string />`.

상태: 불러오는 중 / 코드 없음("초대 코드를 찾을 수 없어요" + 홈으로) / 내 코드("내 코드예요" + 내 초대 버튼)(Review Focus 4) / 정상: 초대자 아바타·닉네임, "함께 히브리어 여정을 떠나요", **친구 되기** → `addFriend` → 성공 "{닉네임} 님과 친구가 되었어요!" 후 2초 뒤 `/`로 이동, `already`면 "이미 친구예요" + 홈으로. 클라우드 off면 "친구 기능은 준비 중이에요" + 홈으로. 첫 방문자는 인트로를 보지 않고 바로 이 화면(인트로는 다음 홈 방문 때).

- [ ] **Step 1:** 실패 테스트 — 위 다섯 상태 각각(가짜 cloud로) + 친구 되기 클릭 시 `addFriend('ALEF-DEMO')` 호출과 성공 문구.
- [ ] **Step 2–4:** FAIL → 구현 → PASS. **Step 5:** 커밋 `feat: invite link landing page`.

---

### Task 8: 친구 관리 페이지

**Files:** Create `app/friends/page.tsx`, `components/FriendsManager.tsx`; Test `tests/components/FriendsManager.test.tsx`.

**Interfaces:** Consumes `useCloud()`(`profile.friendCode`, `leaderboard.rows`, `addFriend`, `removeFriend`). Produces `<FriendsManager />`.

구성: 내 코드(큰 글씨 + "복사" 버튼, clipboard 실패 시 선택 가능한 텍스트 유지) + 초대 버튼; 코드 입력(`id="friend-code"`, 라벨 "친구 코드", 입력은 대문자로 정규화, 앞뒤 공백 제거, `ALEF-` 없이 4자만 넣어도 접두사 보충) + "추가"; 오류 문구는 Global Constraints; 목록(내 행 제외) 각 행 "친구 끊기" → 페이지 안 확인 단계("정말 끊을까요?" 예/아니오, `confirm()` 금지) → `removeFriend`.

- [ ] **Step 1:** 실패 테스트 — `' k7q2 '` 입력 → `addFriend('ALEF-K7Q2')`; 오류 코드별 문구 3종; 끊기 확인 단계 후에만 `removeFriend` 호출; 복사 버튼이 clipboard에 내 코드.
- [ ] **Step 2–4:** FAIL → 구현 → PASS. **Step 5:** 커밋 `feat: friends page with code entry and removal`.

---

### Task 9: 카카오 연결, 로그아웃, 계정 삭제 (실 Supabase 구현 포함)

**Files:** Create `lib/cloud/supabase-api.ts`, `app/auth/callback/page.tsx`, `components/AccountSection.tsx`; Modify `components/ProfileEditor.tsx`(아래에 AccountSection), `package.json`(`@supabase/supabase-js@2.118.0`); Test `tests/lib/cloud/supabase-api.test.ts`, `tests/components/AccountSection.test.tsx`.

**Interfaces:** Produces `createSupabaseCloudApi(url: string, anonKey: string): CloudApi` (config의 `createCloudApi`가 사용).

`supabase-api` 동작:
- `ensureSession`: `auth.getSession()` 없으면 `auth.signInAnonymously()`. `isGuest = user.is_anonymous`.
- RPC 오류 메시지 `not_found|self|already|invalid_ticket` → 같은 `CloudError.code`, fetch 실패 → `network`.
- `connectKakao(returnTo)`: 게스트면 `create_transfer_ticket()` 결과를 `sessionStorage['aleph-journey:ticket']`에 저장 → `auth.linkIdentity({ provider: 'kakao', options: { redirectTo: origin + '/auth/callback?next=' + returnTo } })`. 응답이 "이미 다른 계정에 연결된 신원" 오류면 `auth.signInWithOAuth({ provider: 'kakao', ... })`로 진행(티켓 유지).
- `finishAuth`: 세션 확정 후, 저장된 티켓이 있고 현재 사용자가 티켓 발급자와 다르면 `absorb_guest(ticket)` → `{absorbed:true}`; 티켓 삭제. (Review Focus 1: 진도 합치기는 CloudProvider 재시작의 `pull→merge→push`가 처리)
- `deleteAccount`: `delete_my_account()` → `auth.signOut()` → 로컬 프로필 키 삭제(진도는 유지).
- `/auth/callback`: `finishAuth()` 후 `next`(기본 `/`)로 이동; URL에 `error`가 있으면 "카카오 연결이 취소되었어요"를 보여주고 3초 뒤 `/profile`.

AccountSection: 게스트 — "카카오 계정을 연결하면 기록이 안전하게 보관돼요" + **카카오로 연결**(노란 버튼, 문구 "카카오로 연결"); 카카오 사용자 — "카카오 계정 연결됨" + **로그아웃**; 공통 — **계정 삭제** → 페이지 안 확인("서버의 기록과 친구가 모두 삭제돼요. 이 기기의 진도는 남아요." 삭제/취소). 클라우드 off면 렌더 안 함.

- [ ] **Step 1:** 실패 테스트 — supabase-api(`@supabase/supabase-js`의 `createClient`를 vi.mock): 세션 없을 때 `signInAnonymously` 1회; `add_friend` 오류 메시지 → `CloudError('self')`; `connectKakao`가 티켓 저장 후 `linkIdentity` 호출, `linkIdentity`가 `identity_already_exists` 오류면 `signInWithOAuth` 호출; `finishAuth`: 티켓 발급자 ≠ 현재 사용자면 `absorb_guest` 호출하고 `{absorbed:true}`, 같으면 호출 안 함; AccountSection: 게스트/카카오별 버튼, 삭제 확인 단계 후에만 `deleteAccount`.
- [ ] **Step 2:** `npm i @supabase/supabase-js@2.118.0` → FAIL 확인 → **Step 3:** 구현 → **Step 4:** PASS, `npm run build` 성공(환경 변수 없이도).
- [ ] **Step 5:** 커밋 `feat(cloud): Supabase implementation with Kakao linking, sign-out and account deletion`.

---

### Task 10: E2E(가짜 백엔드)와 설정 안내 문서

**Files:** Modify `playwright.config.ts`(webServer env `NEXT_PUBLIC_CLOUD_FAKE=1`, `NEXT_PUBLIC_SUPABASE_URL=http://fake.local`, `NEXT_PUBLIC_SUPABASE_ANON_KEY=fake`), `e2e/core-flow.spec.ts`; Create `e2e/friends.spec.ts`, `docs/setup-supabase-kakao.md`.

- [ ] **Step 1:** `friends.spec.ts` — (인트로 본 상태) 홈에 "🏆 이번 주 친구 순위"와 내 행 `(나)`; `/friends`에서 `demo` 입력 → 추가 → 홈 순위 1위 "다윗" 120 XP, 내 행 2위; `/invite/ALEF-DEMO` 열기 → "이미 친구예요"; `/invite/ALEF-ZZZZ` → "초대 코드를 찾을 수 없어요"; 레슨 하나 완료 후 홈의 내 주간 XP 증가; 390px에서 가로 스크롤 없음(`/friends`, `/invite/ALEF-DEMO`).
- [ ] **Step 2:** 실패 확인 → 필요한 수정 → `npm run test:e2e` 전부 PASS(기존 9개 포함).
- [ ] **Step 3:** `docs/setup-supabase-kakao.md` — 스펙 8장 순서대로 화면별 단계: Supabase 프로젝트(Seoul), Anonymous sign-ins 켜기, Manual linking 켜기, SQL 편집기에 마이그레이션 붙여넣기, Kakao 앱 등록·플랫폼(Web: `https://aleph-journey.vercel.app`)·Redirect URI(Supabase 콜백)·동의 항목, Supabase Kakao provider에 키 입력, Supabase URL Configuration(Site URL, Redirect URLs에 `/auth/callback`), Vercel 환경 변수 2개 후 Redeploy, 확인 방법(홈에 순위 카드가 보이면 성공).
- [ ] **Step 4:** `npm test && npm run test:sql && npm run lint && npm run build && npm run test:e2e` 모두 성공.
- [ ] **Step 5:** 커밋 `test(e2e): friends flow on fake backend; docs: Supabase and Kakao setup guide`.

---

## 완료 기준
- 모든 테스트(단위, SQL, E2E), lint, build 통과.
- 환경 변수 없이 배포해도 앱이 지금과 똑같이 동작(친구 UI 숨김).
- 사용자가 설정 안내를 따라 Supabase·카카오를 연결한 뒤, 실제 기기에서: 게스트로 순위 카드 확인 → 초대 링크로 다른 브라우저와 친구 맺기 → 카카오 연결 → 다른 기기에서 카카오 로그인 시 진도·친구 유지. (실 서비스 확인은 사용자와 함께)
