# 오디오

## `intro-silent-night.mp3` (인트로 배경음악)
- **곡**: "고요한 밤(Stille Nacht)", 프란츠 그루버 작곡(1818). 퍼블릭 도메인입니다.
- **편곡·연주**: 이 프로젝트에서 직접 만들었습니다 (`scripts/music/silent_night.py`). 피아노 아르페지오와 멜로디에 첼레스타를 한 옥타브 위로 겹쳤습니다. 6/8박자, 점4분음표 = 50.
- **악기 소리**: FluidR3_GM 사운드폰트 (Frank Wen, **MIT 라이선스**: 상업적 사용, 수정, 배포 가능).
- 따라서 이 녹음은 상업적 서비스에 자유롭게 쓸 수 있습니다. MIT 라이선스 조건에 따라 아래 저작권 표시를 함께 둡니다.

> FluidR3_GM soundfont, Copyright © 2000-2002, 2008 Frank Wen. Released under the MIT license.

### 다시 만들기
```bash
apt-get install -y fluidsynth fluid-soundfont-gm && pip install mido
python3 scripts/music/silent_night.py /tmp/sn.mid
fluidsynth -ni -q -g 0.7 -R 1 -r 44100 -F /tmp/sn.wav /usr/share/sounds/sf2/FluidR3_GM.sf2 /tmp/sn.mid
ffmpeg -y -i /tmp/sn.wav -af "silenceremove=start_periods=1:start_threshold=-60dB,loudnorm=I=-20:TP=-2:LRA=11,afade=t=in:st=0:d=0.8,areverse,silenceremove=start_periods=1:start_threshold=-55dB,afade=t=in:st=0:d=3,areverse" -b:a 96k -map_metadata -1 public/audio/intro-silent-night.mp3
```
