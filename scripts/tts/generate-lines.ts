/**
 * Records the player's right lines for each roleplay whose character has a `voiceId`, with the
 * Fish Audio text-to-speech API, and links each recording into the lesson JSON (`audioSrc`).
 * The victory scene plays them back. The key stays here: the app only ships the mp3 files.
 *
 *   FISH_API_KEY=... npx tsx scripts/tts/generate-lines.ts [lessonId ...]
 *
 * Existing recordings are kept; delete an mp3 to record it again.
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const LESSONS = path.join(ROOT, 'content', 'lessons')
const OUT = path.join(ROOT, 'public', 'audio', 'lines')
const MODEL = process.env.FISH_MODEL ?? 's2-pro'

type Line = { he: string; audioSrc?: string }
type Reply =
  | { mode: 'choice'; options: { line: Line; correct: boolean }[] }
  | { mode: 'blocks'; accepted: string[]; audioSrc?: string }
type Lesson = { id: string; type: string; character?: { voiceId?: string }; nodes?: Record<string, { reply?: Reply }> }

const fileFor = (lessonId: string, he: string) =>
  `${lessonId}-${crypto.createHash('sha1').update(he.normalize('NFC')).digest('hex').slice(0, 10)}.mp3`

async function record(text: string, voiceId: string, file: string): Promise<void> {
  const res = await fetch('https://api.fish.audio/v1/tts', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.FISH_API_KEY}`, 'Content-Type': 'application/json', model: MODEL },
    body: JSON.stringify({ text, reference_id: voiceId, format: 'mp3', mp3_bitrate: 64, normalize: false }),
  })
  if (!res.ok) throw new Error(`Fish Audio ${res.status}: ${(await res.text()).slice(0, 200)}`)
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()))
}

async function main() {
  if (!process.env.FISH_API_KEY) throw new Error('FISH_API_KEY is not set')
  fs.mkdirSync(OUT, { recursive: true })
  const only = new Set(process.argv.slice(2))
  for (const name of fs.readdirSync(LESSONS).filter(f => f.endsWith('.json')).sort()) {
    const file = path.join(LESSONS, name)
    const lesson = JSON.parse(fs.readFileSync(file, 'utf8')) as Lesson
    const voiceId = lesson.character?.voiceId
    if (lesson.type !== 'roleplay' || !voiceId || (only.size > 0 && !only.has(lesson.id))) continue

    // Every line a player can get right: correct choice lines and each blocks answer.
    const targets: { he: string; link(src: string): void }[] = []
    for (const node of Object.values(lesson.nodes ?? {})) {
      const reply = node.reply
      if (reply?.mode === 'choice') {
        for (const o of reply.options) if (o.correct) targets.push({ he: o.line.he, link: src => { o.line.audioSrc = src } })
      } else if (reply?.mode === 'blocks') {
        targets.push({ he: reply.accepted[0], link: src => { reply.audioSrc = src } })
      }
    }

    for (const t of targets) {
      const mp3 = fileFor(lesson.id, t.he)
      const dest = path.join(OUT, mp3)
      if (!fs.existsSync(dest)) {
        await record(t.he, voiceId, dest)
        console.log(`recorded ${mp3}  ${t.he}`)
      }
      t.link(`/audio/lines/${mp3}`)
    }
    fs.writeFileSync(file, JSON.stringify(lesson, null, 2) + '\n')
  }
}

main().catch(e => { console.error(e instanceof Error ? e.message : e); process.exit(1) })
