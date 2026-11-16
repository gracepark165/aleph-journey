# Supabase + 카카오 연결 설정 안내

친구 순위와 카카오 연결은 Supabase 프로젝트와 카카오 로그인 앱이 있어야 켜져요. 아래 순서대로 진행하세요.
환경 변수를 넣지 않으면 앱은 지금처럼 동작하고 친구 UI는 숨겨져요.

> **보안 주의**: Client Secret, DB 비밀번호, `service_role` 키는 채팅·이슈·저장소 어디에도 붙여 넣지 마세요. 앱에는 공개용(anon / publishable) 키만 들어갑니다.

## 1. Supabase 프로젝트 만들기

1. https://supabase.com 에서 **New project**를 만듭니다.
2. Region은 **Northeast Asia (Seoul)** 을 고릅니다.
3. DB 비밀번호는 비밀번호 관리자에 저장하세요(이 앱에서는 쓰지 않아요).
4. 프로젝트가 만들어지면 **Project Settings → API**에서 `Project URL`과 `anon`(publishable) 키를 확인해 둡니다. 프로젝트 ref는 URL의 `https://<project-ref>.supabase.co` 부분이에요.

## 2. 익명 로그인과 계정 연결 켜기

**Authentication → Sign In / Providers** (또는 Settings)에서:

1. **Allow anonymous sign-ins** (Anonymous sign-ins)를 **ON**.
2. **Allow manual linking** (Manual linking)을 **ON**. (게스트 계정에 카카오를 연결할 때 필요해요.)

## 3. SQL 마이그레이션 실행

1. **SQL Editor → New query**를 엽니다.
2. 저장소의 `supabase/migrations/20261113000000_friends.sql` 파일 내용을 전부 복사해 붙여 넣습니다.
3. **Run**을 누르고 오류가 없는지 확인합니다. (테이블, RPC 함수, RLS 정책이 만들어져요.)
4. 새 쿼리를 열고 `supabase/migrations/20261114000000_friend_code_limits.sql`도 같은 방법으로 **이어서** 실행합니다. 반드시 첫 번째 파일 **다음에** 실행해야 해요. (이미 첫 번째 파일을 실행한 프로젝트라면 이 파일만 실행하면 돼요.)

두 번째 파일이 하는 일:

- **친구 코드 조회 제한**: 한 사용자가 1시간 안에 없는 코드를 20번 조회하면(초대 링크 열기와 친구 추가 모두 포함), 그 뒤로 1시간이 지날 때까지 그 사용자의 코드 조회가 모두 `rate_limited`로 거절돼요. 앱에서는 "잠시 후 다시 시도해 주세요"가 보여요. 맞는 코드 조회는 횟수에 들어가지 않아요.
- **게스트 합치기 확인 강화**: 합치려는 계정이 아직 게스트(익명)일 때만 합쳐요.

익명 계정은 누구나 쉽게 만들 수 있어서 이 제한만으로는 코드 대입을 늦출 뿐이에요. 남용이 보이면 **Authentication → Attack Protection**에서 **CAPTCHA protection**(Cloudflare Turnstile)을 켜는 것을 고려하세요. 이 경우 익명 로그인에도 CAPTCHA 토큰이 필요해져서 앱 코드에 Turnstile 위젯을 추가해야 해요.

## 4. URL Configuration

**Authentication → URL Configuration**:

- **Site URL**: `https://aleph-journey.vercel.app`
- **Redirect URLs**에 추가: `https://aleph-journey.vercel.app/auth/callback**`

콜백 주소 뒤에 쿼리 문자열이 붙기 때문에 끝의 `**`가 꼭 필요해요. (`/auth/callback`만 넣으면 거절될 수 있어요.)

## 5. 카카오 디벨로퍼스 앱 설정

https://developers.kakao.com 에서:

1. **내 애플리케이션 → 애플리케이션 추가**로 앱을 만듭니다.
2. **앱 설정 → 플랫폼 → Web**에 사이트 도메인 `https://aleph-journey.vercel.app`을 등록합니다.
3. **제품 설정 → 카카오 로그인**을 **ON**으로 바꿉니다.
4. 같은 화면의 **Redirect URI**에 `https://<project-ref>.supabase.co/auth/v1/callback`을 등록합니다.
5. **동의항목**에서 **닉네임**과 **프로필 사진**만 설정합니다(이메일은 받지 않아요).
6. **카카오 로그인 → 보안**에서 **Client Secret**을 생성하고 **사용함**으로 바꿉니다.
7. **앱 키**의 **REST API 키**가 Supabase의 **Client ID**예요. REST API 키와 Client Secret 두 값을 준비합니다.

> 앱은 `profile_nickname`, `profile_image`만 요청하지만 Supabase의 Kakao 제공자가 기본 scope(`account_email`)를 덧붙일 수 있어요. 처음 로그인할 때 카카오가 이메일 동의 오류를 보이면 둘 중 하나를 하세요: (a) Supabase Kakao 설정에서 이메일 없는 사용자 허용 옵션(Allow users without an email)을 켜거나, (b) 카카오 동의항목에서 **이메일**을 **선택 동의**로 추가. 첫 로그인에서 꼭 확인하세요.

## 6. Supabase에 Kakao 제공자 연결

**Authentication → Sign In / Providers → Kakao**:

1. **Enable**을 켭니다.
2. **Client ID** = 카카오 REST API 키, **Client Secret** = 카카오에서 만든 Client Secret.
3. **Save**.

## 7. Vercel 환경 변수

Vercel 프로젝트 **Settings → Environment Variables**에 추가(Production):

| 이름 | 값 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon / publishable 키 |

`service_role` 키는 절대 넣지 마세요. 저장한 뒤 **Deployments → 최신 배포 → Redeploy**를 눌러야 값이 빌드에 반영돼요(`NEXT_PUBLIC_*`는 빌드 시점에 들어갑니다).

## 8. 실제 기기에서 확인

1. 기기 A에서 앱을 열면 홈에 **🏆 이번 주 친구 순위** 카드가 보여야 해요(게스트 상태).
2. 친구 화면에서 초대 링크를 복사해 기기 B(다른 브라우저)에서 열고 친구를 맺습니다. 양쪽 순위에 서로가 보이는지 확인.
3. 기기 A의 프로필에서 **카카오 연결**을 합니다.
4. 기기 B에서 **카카오로 로그인**하면 진도와 친구가 그대로 이어져야 해요(게스트 데이터를 옮기는 transfer-ticket 흡수 경로를 점검하는 단계예요).

## 9. 실제 프로젝트에서 한 번 확인할 것

- `delete_my_account` / `absorb_guest` 함수가 `auth.users`에서 행을 지울 수 있는지: 테스트 계정으로 프로필의 **계정 삭제**를 눌러 오류 없이 삭제되는지 확인하세요. 권한 오류가 나면 함수 소유자/권한(`security definer`)을 점검합니다.
- 로그인한 게스트(익명 사용자)로 RPC(`record_xp`, 친구 추가, 순위 조회 등)가 정상 동작하는지.
- 카카오 첫 로그인에서 이메일 동의 오류가 없는지(5번 아래 참고 사항).

## 문제 해결

- 순위 카드가 안 보임: 환경 변수 2개가 Production에 있고 Redeploy를 했는지 확인.
- 카카오 로그인 후 주소 거절: 4번의 Redirect URL 끝 `**` 확인.
- "카카오 연결이 취소되었어요": 사용자가 동의 화면을 닫은 경우예요. 다시 시도하면 됩니다.
