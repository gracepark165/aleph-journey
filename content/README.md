# 콘텐츠 파일 안내

> ⚠️ **출시 전 필수:** 이 폴더의 모든 히브리어 본문, 문법 설명, 음역, 한국어 번역은 **성경 히브리어 전문가의 검수**를 받아야 합니다. 현재 내용은 개발용 초안입니다.

## 구조
- `course.json`: 코스 → 유닛 → 레슨 ID 순서. 이 순서가 잠금 해제 순서입니다.
- `lexicon.json`: 단어 사전. 키는 OSHB/Strong's 번호(`H4325`).
- `lessons/<id>.json`: 레슨 하나당 파일 하나. `type`은 `reading`, `quiz`, `roleplay` 중 하나. 형식은 `lib/content/schema.ts`를 따릅니다.

## 검사
```bash
npm run check:content
```
스키마 검증, 사전에 없는 단어 ID, 대본 분기(도달 불가 노드, 끝에 도달할 수 없는 노드), 블록·어순 정답 토큰을 검사합니다.

## 출처
- 본문: Westminster Leningrad Codex (퍼블릭 도메인)
- 형태소·원형 정보: Open Scriptures Hebrew Bible (OSHB), CC BY 4.0. https://github.com/openscriptures/morphhb
- 본문은 칸틸레이션 악센트와 메텍을 제거하고 자음·모음만 표기합니다.
