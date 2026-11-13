/** Intro soundtrack: our own piano + celesta arrangement of Silent Night (public domain; see public/audio/README.md), plus a synthesized sparkle for the shooting star. */
export const INTRO_MUSIC_SRC = '/audio/intro-silent-night.mp3'
export const MUSIC_VOLUME = 0.7

/** Ramp an audio element's volume; resolves when done. */
export function fadeVolume(audio: HTMLAudioElement, to: number, ms: number): Promise<void> {
  return new Promise(resolve => {
    const from = audio.volume
    const steps = Math.max(1, Math.round(ms / 40))
    let i = 0
    const timer = setInterval(() => {
      i++
      audio.volume = Math.min(1, Math.max(0, from + ((to - from) * i) / steps))
      if (i >= steps) {
        clearInterval(timer)
        resolve()
      }
    }, 40)
  })
}

/** A soft descending sparkle (Web Audio). Silently does nothing where audio is unavailable. */
export function playSparkle(): void {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const now = ctx.currentTime
    ;[1568, 1319, 1047, 784].forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      const t = now + i * 0.09
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.08, t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.9)
      osc.connect(gain).connect(ctx.destination)
      osc.start(t)
      osc.stop(t + 1)
    })
    setTimeout(() => ctx.close().catch(() => {}), 2000)
  } catch {
    /* no audio */
  }
}
