# 유닛 2~10 생성 스크립트

`content/` 아래 JSON이 정본이며, 이 스크립트는 유닛 2~10을 처음 만들 때 쓴 도구입니다.
JSON을 직접 고친 뒤 스크립트를 다시 돌리면 고친 내용이 덮어써지니 주의하세요.

```bash
D=/tmp/content-data && mkdir -p $D/oshb $D/strongs
for b in Gen Ruth 1Sam 1Kgs Hos Jonah; do curl -sSfL -o $D/oshb/$b.xml https://raw.githubusercontent.com/openscriptures/morphhb/master/wlc/$b.xml; done
curl -sSfL -o $D/strongs/hebrew.js https://raw.githubusercontent.com/openscriptures/strongs/master/hebrew/strongs-hebrew-dictionary.js
python3 -I scripts/content-gen/extract_verses.py $D          # -> $D/verses.json
python3 -I scripts/content-gen/gen_units.py $D .              # -> content/*.json
npm run check:content
```
