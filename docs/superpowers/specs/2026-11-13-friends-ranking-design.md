# 친구와 주간 순위 (계정·동기화) — 설계 문서

- 작성일: 2026-11-13
- 상태: 사용자 검토 대기
- 선행 작업: 홈 프로필 카드·히브리어 알파벳 랭크·주간 XP(`weekXp`) — 배포 완료
- 처음 설계 문서의 "계획 2(Supabase 로그인·동기화)"를 이 문서가 대체한다.

## 1. 목표

**사용자가 정한 것**
- 개인 친구끼리 경쟁한다 (모임·그룹 단위는 범위 밖).
- 로그인은 **카카오**.
- **로그인하지 않아도(게스트) 앱 전체와 친구 경쟁을 쓸 수 있다.** 카카오 로그인은 선택.
- 백엔드는 **Supabase**.

**성공 기준**
- 처음 방문자가 아무 로그인 없이 친구 초대 링크를 보내고, 받은 친구가 링크를 열기만 하면 둘이 서로의 주간 순위표에 보인다.
- 카카오를 연결한 사용자는 다른 기기에서 카카오로 로그인하면 진도·프로필·친구가 그대로 이어진다.
- 서버·네트워크 장애가 있어도 학습(레슨 진행·진도 저장)은 멈추지 않는다.

## 2. 계정 모델

| 상태 | 만들어지는 때 | 할 수 있는 것 | 잃을 위험 |
|---|---|---|---|
| 게스트 | 온라인으로 처음 방문할 때 자동 (Supabase 익명 로그인) | 전부 (친구, 순위 포함) | 브라우저 데이터 삭제·기기 변경 시 계정 분실 |
| 카카오 연결 | 사용자가 "카카오 계정 연결"을 누를 때 (익명 계정에 카카오 신원 연결) | 전부 + 다른 기기에서 이어하기 | 없음 |

- 게스트 → 카카오 연결 시 **같은 사용자 ID를 유지**하므로 진도·친구·순위가 그대로다 (Supabase identity linking).
- 다른 기기에서 카카오로 로그인했는데 그 기기에 이미 게스트 진도가 있으면, 두 진도를 **합친다** (아래 4장 규칙). 남는 게스트 계정은 친구 관계를 카카오 계정으로 옮긴 뒤 삭제한다.
- 카카오 동의 항목: **닉네임, 프로필 사진만**. 이메일은 받지 않는다 (설정 단계에서 가능 여부 확인; 불가하면 이메일을 "선택 동의"로).
- 첫 닉네임: 이미 앱에서 정한 닉네임 → 없으면 카카오 닉네임 → 없으면 "순례자".
- 프로필 편집 화면에 **로그아웃**(카카오 연결 사용자만), **계정 삭제**(서버 데이터 전부 삭제, 브라우저 진도는 남김).
- 게스트 남용 방지: Supabase 익명 로그인에 CAPTCHA(Turnstile)를 켤 수 있도록 설정 항목으로 남긴다 (MVP는 끈 상태, 문제 시 켬).

## 3. 데이터 (Supabase Postgres)

```
profiles      (user_id PK → auth.users, nickname text ≤12, avatar_id text, friend_code text UNIQUE,
               created_at, updated_at)
progress      (user_id PK, snapshot jsonb, updated_at)          -- 브라우저 ProgressSnapshot 그대로
weekly_xp     (user_id, week text 'YYYY-Www', xp int ≥0, streak int ≥0, updated_at, PK(user_id, week))
friendships   (user_a, user_b, created_at, PK(user_a, user_b), CHECK user_a < user_b)  -- 양방향 1행
```

- **친구 코드**: `ALEF-` + 4자 (혼동 문자 0/O/1/I 제외한 대문자·숫자), 충돌 시 재생성.
- **RLS**
  - `profiles`: 본인 행 읽기·쓰기. 친구의 행은 `nickname, avatar_id`만 순위 함수로 노출.
  - `progress`: 본인 행만.
  - `weekly_xp`: 직접 쓰기 금지. 아래 RPC로만 갱신.
  - `friendships`: 본인이 포함된 행 읽기·삭제. 생성은 RPC로만.
- **RPC (security definer)**
  - `add_friend(code text)` → 친구 프로필 요약. 오류: 코드 없음, 자기 코드, 이미 친구.
  - `record_xp(week text, gained int, streak int)` → 서버 검사: `gained` 1~30, 한 주 누적 상한 2,100 XP(하루 300 × 7), `week`는 서버 시각 기준 이번 주 또는 지난주만 허용.
  - `friend_leaderboard(week text)` → 나와 친구들의 `{user_id, nickname, avatar_id, total_xp, week_xp, streak, is_me, crown}`. 정렬: 주간 XP 내림차순 → 연속일 내림차순 → 닉네임.
  - `crown`: 지난주 친구 순위 1위(주간 XP > 0)였으면 true.
  - 총 XP·랭크는 `progress.snapshot->>'xp'`에서 읽는다.
- SQL은 저장소 `supabase/migrations/*.sql`로 관리한다.

## 4. 동기화

- 진도의 정본은 **브라우저**(오프라인 우선). 서버는 백업·기기 간 이동·순위용.
- 레슨 완료 시: 브라우저에 저장 → `record_xp` 호출 + `progress` 업서트. 실패하면 **보낼 목록(큐)**에 넣고 다음 실행·온라인 복귀 시 재전송.
- 앱 시작·로그인 직후: 서버 `progress`를 받아 브라우저와 **합친다**.
  - `xp`: 큰 값, `completed`: 합집합(레슨별 높은 점수), `reviews`: 단어별 `nextReviewDate`가 늦은 쪽,
    `streak`: `lastActiveDate`가 최근인 쪽, `weekXp`: 같은 주면 큰 값, `restTokens`·기타: 최근 갱신 쪽.
  - 합친 결과를 브라우저와 서버 양쪽에 저장.
- 프로필(닉네임·사진): 서버 `profiles`가 정본, 브라우저는 캐시.

## 5. 화면

**홈 (프로필 카드 아래) "🏆 이번 주 친구 순위"**
- 기간 표시(월~일), 순위 목록: 순위, 사진, 닉네임(내 줄 강조·"(나)"), 랭크 글자, 주간 XP, 🔥연속일, 지난주 1위 👑.
- 친구가 없으면 나만 표시 + **친구 초대하기** 강조.
- 불러오기 실패: "순위를 불러오지 못했어요 · 다시 시도". 오프라인: "인터넷에 연결되면 순위가 보여요".
- 버튼: **친구 초대하기**(카톡 공유/링크 복사), **코드로 추가**.

**친구 초대** `/invite/ALEF-XXXX`
- 열면: 초대한 사람 사진·닉네임 + "함께 히브리어 여정을 떠나요" + **친구 되기** 버튼(게스트 계정 자동 생성 후 `add_friend`). 성공 시 "다윗 님과 친구가 되었어요!" → 홈.
- 공유: Web Share API(모바일 카톡 등) → 미지원 시 링크 복사. 카카오 SDK 공유 메시지는 MVP 범위 밖.

**친구 관리** `/friends`
- 내 친구 코드(복사), 코드 입력해 추가, 친구 목록과 **친구 끊기**.

**프로필 편집** `/profile` (기존 화면 확장)
- 게스트: "카카오 계정 연결하면 기록이 안전하게 보관돼요" + **카카오로 연결** 버튼.
- 카카오 연결: 연결됨 표시 + **로그아웃**. 공통: **계정 삭제**(확인 단계 포함).

## 6. 오류 처리
- Supabase 미설정(환경 변수 없음)이면 친구 기능을 숨기고 앱은 지금처럼 동작한다 (로컬 개발·미리보기 안전).
- 모든 서버 호출 실패는 학습을 막지 않는다. 진도는 큐로 재전송.
- 잘못된 코드 "초대 코드를 찾을 수 없어요", 자기 코드 "내 코드예요", 이미 친구 "이미 친구예요".
- 카카오 로그인 취소·실패: 게스트 상태 유지 + "카카오 연결이 취소되었어요".

## 7. 테스트
- 단위: 진도 합치기 규칙, 주간 순위 정렬, 친구 코드 형식, 큐 재전송, 미설정 시 비활성.
- 서버 SQL: RLS·RPC를 로컬 Postgres(Supabase CLI 또는 pg)에서 SQL 테스트로 확인 (상한·자기 코드·중복 친구).
- 컴포넌트·E2E: Supabase 클라이언트를 가짜 구현으로 바꿔 순위 카드, 초대 링크, 코드 추가, 카카오 연결 버튼 흐름 확인.
- 실제 카카오 로그인: 설정 완료 후 사용자와 함께 1회 수동 확인.

## 8. 사용자가 할 설정 (안내 제공)
1. supabase.com 프로젝트 생성 (Northeast Asia/Seoul). Authentication에서 **Anonymous sign-ins** 켜기.
2. developers.kakao.com 앱 등록 → 카카오 로그인 활성화 → Redirect URI에 Supabase 콜백 주소 → 동의 항목(닉네임, 프로필 사진).
3. Supabase Authentication > Providers > Kakao에 REST API 키·Client Secret 입력, **Manual linking** 허용.
4. Vercel 환경 변수 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 입력 (공개 키만; 서비스 키는 앱에 넣지 않음).
5. `supabase/migrations` SQL 적용 (Supabase SQL 편집기에 붙여넣기 또는 CLI).

## 9. 범위 밖
- 모임(그룹) 순위, 친구 요청 수락 단계, 푸시 알림, 카카오톡 공유 템플릿, 구글 로그인, 전체 사용자 리그.
