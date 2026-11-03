import type { RoleplayLesson, ScriptNode } from '@/lib/content/schema'
import type { GradeResult } from '@/lib/grader/rules'

export const STARTING_LAMPS = 3

export type MissionState = {
  nodeId: string
  lamps: number
  mistakes: number
  status: 'playing' | 'won' | 'lost'
  history: string[]
}

export function startMission(lesson: RoleplayLesson): MissionState {
  return { nodeId: lesson.startNodeId, lamps: STARTING_LAMPS, mistakes: 0, status: 'playing', history: [] }
}

export function currentNode(lesson: RoleplayLesson, state: MissionState): ScriptNode {
  const node = lesson.nodes[state.nodeId]
  if (!node) throw new Error(`[${lesson.id}] unknown node: ${state.nodeId}`)
  return node
}

export function applyGrade(lesson: RoleplayLesson, state: MissionState, result: GradeResult): MissionState {
  if (state.status !== 'playing') return state
  if (!result.correct) {
    const lamps = state.lamps - 1
    return { ...state, lamps, mistakes: state.mistakes + 1, status: lamps <= 0 ? 'lost' : 'playing' }
  }
  const next = result.next !== undefined ? lesson.nodes[result.next] : undefined
  if (!next) throw new Error(`[${lesson.id}] correct answer without valid next: ${result.next}`)
  return { ...state, nodeId: next.id, history: [...state.history, state.nodeId], status: next.end ? 'won' : 'playing' }
}
