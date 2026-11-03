import { describe, expect, test } from 'vitest'
import { screen } from '@testing-library/react'
import { VocabPage } from '@/components/VocabPage'
import { readLexicon } from '@/lib/content/read-files'
import { emptySnapshot } from '@/lib/progress/snapshot'
import { addLearned } from '@/lib/progress/review'
import { memoryStore, renderWithProgress, TODAY } from '../utils/progress'

const lexicon = readLexicon()

describe('VocabPage', () => {
  test('empty state', async () => {
    renderWithProgress(<VocabPage lexicon={lexicon} />)
    expect(await screen.findByText('아직 배운 단어가 없어요. 첫 레슨을 시작해 보세요!')).toBeInTheDocument()
    expect(screen.getByText('오늘은 복습할 단어가 없어요')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '복습 시작' })).toBeDisabled()
  })
  test('lists learned words and counts due ones', async () => {
    let s = addLearned(emptySnapshot(TODAY), ['H4325'], '2026-11-02') // due today
    s = addLearned(s, ['H4994'], TODAY) // due tomorrow
    renderWithProgress(<VocabPage lexicon={lexicon} />, memoryStore(s))
    expect(await screen.findByText('오늘 복습할 단어 1개')).toBeInTheDocument()
    expect(screen.getByText('מַיִם')).toBeInTheDocument()
    expect(screen.getByText('נָא')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '복습 시작' })).toBeEnabled()
  })
})
