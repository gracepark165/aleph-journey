import type { Course, Lesson, Lexicon, RoleplayLesson } from './schema'
import { normalizeHebrew as norm } from '@/lib/hebrew/normalize'

function missingFromBank(answer: string[], tokens: string[]): string[] {
  const bank = new Map<string, number>()
  for (const t of tokens.map(t => norm(t))) bank.set(t, (bank.get(t) ?? 0) + 1)
  const missing: string[] = []
  for (const t of answer.map(t => norm(t))) {
    const n = bank.get(t) ?? 0
    if (n === 0) missing.push(t)
    else bank.set(t, n - 1)
  }
  return missing
}

function lemmaIdsOf(lesson: Lesson): string[] {
  switch (lesson.type) {
    case 'reading':
      return lesson.verses.flatMap(v => v.words.map(w => w.lemmaId))
    case 'quiz':
      return lesson.questions.flatMap(q => (q.kind === 'choice' ? (q.lemmaId ? [q.lemmaId] : []) : q.lemmaIds))
    case 'roleplay':
      return Object.values(lesson.nodes).flatMap(n => [
        ...(n.npc?.lemmaIds ?? []),
        ...(n.reply?.mode === 'choice' ? n.reply.options.flatMap(o => o.line.lemmaIds) : []),
        ...(n.reply?.mode === 'blocks' ? n.reply.lemmaIds : []),
      ])
  }
}

function nextIds(node: RoleplayLesson['nodes'][string]): string[] {
  if (!node.reply) return []
  if (node.reply.mode === 'blocks') return [node.reply.next]
  return node.reply.options.flatMap(o => (o.next ? [o.next] : []))
}

function checkRoleplay(l: RoleplayLesson, err: (m: string) => void) {
  const nodes = l.nodes
  for (const [key, n] of Object.entries(nodes)) {
    if (key !== n.id) err(`노드 키 ${key}와 id ${n.id}가 다릅니다`)
    for (const t of nextIds(n)) if (!nodes[t]) err(`노드 ${n.id}의 next ${t}가 존재하지 않습니다`)
    if (n.reply?.mode === 'choice' && !n.reply.options.some(o => o.correct)) err(`노드 ${n.id}에 정답 옵션이 없습니다`)
    if (n.reply?.mode === 'blocks') {
      for (const a of n.reply.accepted) {
        const miss = missingFromBank(norm(a).split(' '), n.reply.tokens)
        if (miss.length) err(`노드 ${n.id}의 정답 "${a}"에 블록에 없는 토큰이 있습니다: ${miss.join(', ')}`)
      }
    }
  }
  if (!nodes[l.startNodeId]) {
    err(`시작 노드 ${l.startNodeId}가 존재하지 않습니다`)
    return
  }
  const reach = new Set<string>([l.startNodeId])
  const queue = [l.startNodeId]
  while (queue.length) {
    for (const t of nextIds(nodes[queue.shift()!])) if (nodes[t] && !reach.has(t)) { reach.add(t); queue.push(t) }
  }
  for (const id of Object.keys(nodes)) if (!reach.has(id)) err(`노드 ${id}는 시작 노드에서 도달할 수 없습니다(고아 노드)`)

  const reverse = new Map<string, string[]>()
  for (const n of Object.values(nodes)) for (const t of nextIds(n)) reverse.set(t, [...(reverse.get(t) ?? []), n.id])
  const canEnd = new Set(Object.values(nodes).filter(n => n.end).map(n => n.id))
  const q2 = [...canEnd]
  while (q2.length) for (const p of reverse.get(q2.shift()!) ?? []) if (!canEnd.has(p)) { canEnd.add(p); q2.push(p) }
  for (const id of reach) if (!canEnd.has(id)) err(`노드 ${id}에서 끝 노드에 도달할 수 없습니다`)
}

export function checkContent(course: Course, lessons: Lesson[], lexicon: Lexicon): string[] {
  const errors: string[] = []
  const byId = new Map(lessons.map(l => [l.id, l]))
  const seen = new Set<string>()
  for (const unit of course.units) {
    for (const id of unit.lessonIds) {
      if (seen.has(id)) errors.push(`[${id}] 코스에 레슨이 중복되어 있습니다`)
      seen.add(id)
      if (!byId.has(id)) errors.push(`[${id}] 유닛 ${unit.id}가 참조하는 레슨 파일이 없습니다`)
    }
  }
  for (const l of lessons) {
    const err = (m: string) => errors.push(`[${l.id}] ${m}`)
    if (!seen.has(l.id)) err('어떤 유닛에도 속하지 않은 레슨입니다')
    for (const id of new Set(lemmaIdsOf(l))) if (!lexicon[id]) err(`사전에 없는 단어 ID: ${id}`)
    if (l.type === 'quiz') {
      l.questions.forEach((q, i) => {
        if (q.kind !== 'order') return
        const miss = missingFromBank(q.answer, q.tokens)
        if (miss.length) err(`문항 ${i + 1}의 정답에 토큰에 없는 단어가 있습니다: ${miss.join(', ')}`)
      })
    }
    if (l.type === 'roleplay') checkRoleplay(l, err)
  }
  return errors
}
