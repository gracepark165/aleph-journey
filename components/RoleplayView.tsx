'use client'

import { useEffect, useRef, useState } from 'react'
import type { BlocksReply, ChoiceReply, HebrewLine, RoleplayLesson, ScriptNode } from '@/lib/content/schema'
import { gradeBlocks, gradeChoice, type GradeResult } from '@/lib/grader/rules'
import { useLessonFinish } from '@/lib/progress/useLessonFinish'
import { applyGrade, currentNode, startMission, STARTING_LAMPS, type MissionState } from '@/lib/script-engine/engine'
import { ChatBubble } from './ChatBubble'
import { HebrewText } from './HebrewText'
import { LampMeter } from './LampMeter'
import { LessonComplete } from './LessonComplete'
import { TokenPicker } from './TokenPicker'

type Phase =
  | { kind: 'answer' }
  | { kind: 'right'; result: GradeResult; line: HebrewLine }
  | { kind: 'wrong'; feedbackKo: string }

const ME = '나'

function NodeLines({ node, npcName }: { node: ScriptNode; npcName: string }) {
  return (
    <>
      {node.narrationKo && <p className="narration">{node.narrationKo}</p>}
      {node.npc && <ChatBubble line={node.npc} speaker={npcName} side="npc" />}
    </>
  )
}

function blocksLine(reply: BlocksReply, picked: number[]): HebrewLine {
  return { he: picked.map(i => reply.tokens[i]).join(' '), translit: '', ko: '', lemmaIds: reply.lemmaIds }
}

export function RoleplayView({ lesson, unitId, nextLessonId }: { lesson: RoleplayLesson; unitId: string; nextLessonId?: string }) {
  const [mission, setMission] = useState<MissionState>(() => startMission(lesson))
  const [myLines, setMyLines] = useState<HebrewLine[]>([])
  const [phase, setPhase] = useState<Phase>({ kind: 'answer' })
  const [picked, setPicked] = useState<number[]>([])
  const busy = useRef(false) // guards against double taps before re-render
  const { finish, xpGained } = useLessonFinish(lesson)
  const npcName = lesson.character.nameKo

  useEffect(() => {
    if (mission.status === 'won') {
      finish({ score: Math.round((100 * mission.lamps) / STARTING_LAMPS), perfect: mission.mistakes === 0 })
    }
  }, [mission, finish])

  const node = currentNode(lesson, mission)

  const submit = (result: GradeResult, line: HebrewLine) => {
    if (busy.current || phase.kind !== 'answer') return
    busy.current = true
    if (result.correct) {
      setPhase({ kind: 'right', result, line })
    } else {
      setMission(m => applyGrade(lesson, m, result))
      setPhase({ kind: 'wrong', feedbackKo: result.feedbackKo ?? '다시 해 보세요.' })
    }
  }

  const proceed = () => {
    if (phase.kind !== 'right') return
    setMyLines(l => [...l, phase.line])
    setMission(m => applyGrade(lesson, m, phase.result))
    setPhase({ kind: 'answer' })
    setPicked([])
    busy.current = false
  }

  const retry = () => {
    setPhase({ kind: 'answer' })
    setPicked([])
    busy.current = false
  }

  const restart = () => {
    setMission(startMission(lesson))
    setMyLines([])
    retry()
  }

  const reply = node.reply
  return (
    <article>
      <div className="mission-head">
        <h1 className="page-title">{lesson.titleKo}</h1>
        <LampMeter lamps={mission.lamps} />
      </div>
      <p className="card">{lesson.setupKo}</p>

      <div className="chat" aria-live="polite">
        {mission.history.map((id, i) => (
          <div key={`${id}-${i}`} className="chat" style={{ margin: 0 }}>
            <NodeLines node={lesson.nodes[id]} npcName={npcName} />
            {myLines[i] && <ChatBubble line={myLines[i]} speaker={ME} side="me" />}
          </div>
        ))}
        <NodeLines node={node} npcName={npcName} />
        {phase.kind === 'right' && <ChatBubble line={phase.line} speaker={ME} side="me" />}
      </div>

      {mission.status === 'won' && xpGained !== null && <LessonComplete titleKo="미션 성공!" xpGained={xpGained} unitId={unitId} nextLessonId={nextLessonId} />}

      {mission.status === 'lost' && (
        <section className="card center">
          <h2>등불이 모두 꺼졌어요</h2>
          <p className="muted">본문을 다시 떠올리며 처음부터 도전해 보세요.</p>
          <button type="button" className="btn" onClick={restart}>처음부터 다시</button>
        </section>
      )}

      {mission.status === 'playing' && reply && (
        <section className="card">
          {reply.mode === 'choice'
            ? <ChoiceReplyInput reply={reply} disabled={phase.kind !== 'answer'} onPick={id => submit(gradeChoice(reply, id), reply.options.find(o => o.id === id)!.line)} />
            : (
              <>
                <p className="center">{reply.promptKo}</p>
                <TokenPicker tokens={reply.tokens} picked={picked} onChange={setPicked} disabled={phase.kind !== 'answer'} />
                {phase.kind === 'answer' && (
                  <button type="button" className="btn block" disabled={picked.length === 0}
                    onClick={() => submit(gradeBlocks(reply, picked.map(i => reply.tokens[i])), blocksLine(reply, picked))}>확인</button>
                )}
              </>
            )}
          {phase.kind === 'right' && (
            <>
              <p className="feedback good" role="status">좋아요!</p>
              <button type="button" className="btn block" onClick={proceed}>계속</button>
            </>
          )}
          {phase.kind === 'wrong' && (
            <>
              <p className="feedback bad" role="status">{phase.feedbackKo}</p>
              <button type="button" className="btn block" onClick={retry}>다시</button>
            </>
          )}
        </section>
      )}
    </article>
  )
}

function ChoiceReplyInput({ reply, disabled, onPick }: { reply: ChoiceReply; disabled: boolean; onPick(id: string): void }) {
  return (
    <div className="choices">
      {reply.options.map(o => (
        <button key={o.id} type="button" className="choice" disabled={disabled} onClick={() => onPick(o.id)}>
          <HebrewText text={o.line.he} />
          <span className="sub muted" style={{ display: 'block', fontSize: '0.85rem' }}>{o.line.translit}</span>
        </button>
      ))}
    </div>
  )
}
