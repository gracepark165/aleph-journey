"""Silent Night (Franz Gruber, 1818; public domain) — gentle piano + celesta arrangement for the intro."""
import mido, sys
TPB = 480          # ticks per quarter
E = TPB // 2       # one eighth note
TEMPO = mido.bpm2tempo(75)   # quarter = 75 (eighth = 150), dotted quarter = 50

MEL = [  # (midi, eighths) per bar, 6/8
 [(67,3),(69,1),(67,2)], [(64,6)], [(67,3),(69,1),(67,2)], [(64,6)],
 [(74,2),(74,1),(71,3)], [(72,2),(72,1),(67,3)],
 [(69,2),(69,1),(72,1.5),(71,.5),(69,1)], [(67,1.5),(69,.5),(67,1),(64,3)],
 [(69,2),(69,1),(72,1.5),(71,.5),(69,1)], [(67,1.5),(69,.5),(67,1),(64,3)],
 [(74,2),(74,1),(77,1.5),(74,.5),(71,1)], [(72,6)], [(76,6)],
 [(72,1.5),(67,.5),(64,1),(67,1.5),(65,.5),(62,1)], [(60,6)],
]
CH = ['C','C','C','C','G7','C','F','C','F','C','G7','C','C','C/G7','C']
PAT = {'C':[48,55,60,64,60,55], 'G7':[43,50,53,59,53,50], 'F':[41,48,53,57,53,48]}
INTRO, OUTRO = 2, 2

def bar_chords(i):
    c = CH[i]
    return [PAT['C'][:3] + PAT['G7'][3:]] if c == 'C/G7' else [PAT[c]]

mid = mido.MidiFile(ticks_per_beat=TPB)
events = []  # (tick, channel, msg)
def note(ch, t, n, d, v):
    events.append((t, ch, mido.Message('note_on', note=n, velocity=v, channel=ch)))
    events.append((t + int(d) - 10, ch, mido.Message('note_off', note=n, velocity=0, channel=ch)))
def cc(ch, t, c, v):
    events.append((t, ch, mido.Message('control_change', control=c, value=v, channel=ch)))

BAR = 6 * E
bars = INTRO + len(MEL) + OUTRO
for b in range(bars):
    t0 = b * BAR
    cc(0, t0, 64, 0); cc(0, t0 + 20, 64, 100)           # re-pedal each bar
    mi = b - INTRO
    pat = PAT['C'] if mi < 0 or mi >= len(MEL) else bar_chords(mi)[0]
    if mi >= len(MEL):                                   # outro: one rolled, held chord
        if mi == len(MEL):
            for k, n in enumerate([36, 48, 55, 64, 67, 72]):
                note(0, t0 + k * 40, n, 2 * BAR - k * 40, 42 - k * 2)
            note(1, t0 + 300, 84, BAR, 34)
        continue
    for k, n in enumerate(pat):                          # left-hand arpeggio
        note(0, t0 + k * E, n, 2 * E, 40 if k else 46)
    if mi >= 0:
        t = t0
        for n, d in MEL[mi]:
            dur = int(d * E)
            note(0, t, n, dur, 66)                       # piano melody
            note(1, t, n + 12, dur, 30)                  # celesta an octave up, soft
            t += dur

for ch, prog in ((0, 0), (1, 8)):                        # 0 Acoustic Grand, 8 Celesta
    events.append((0, ch, mido.Message('program_change', program=prog, channel=ch)))
    events.append((0, ch, mido.Message('control_change', control=91, value=70, channel=ch)))  # reverb send
events.append((0, 1, mido.Message('control_change', control=7, value=80, channel=1)))

track = mido.MidiTrack(); mid.tracks.append(track)
track.append(mido.MetaMessage('set_tempo', tempo=TEMPO, time=0))
track.append(mido.MetaMessage('time_signature', numerator=6, denominator=8, time=0))
last = 0
for t, _, msg in sorted(events, key=lambda e: (e[0], e[2].type != 'note_off')):
    track.append(msg.copy(time=t - last)); last = t
mid.save(sys.argv[1])
print('bars', bars, 'seconds', round(mido.MidiFile(sys.argv[1]).length, 1))
