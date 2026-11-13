/** Intro soundtrack: our own piano + celesta arrangement of Silent Night (public domain; see public/audio/README.md) */
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
