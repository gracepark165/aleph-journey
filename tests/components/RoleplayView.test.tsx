import { describe, expect, test } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RoleplayView } from '@/components/RoleplayView'
import { readLesson } from '@/lib/content/read-files'
import type { RoleplayLesson } from '@/lib/content/schema'
import { renderWithProgress } from '../utils/progress'

const lesson = readLesson('rebekah-roleplay') as RoleplayLesson
const view = () => renderWithProgress(<RoleplayView lesson={lesson} unitId="unit-1-rebekah" />)
const option = (re: RegExp) => screen.getByRole('button', { name: re })
const lamps = (n: number) => screen.getByLabelText(`남은 등불 ${n}개`)

async function buildBlocks() {
  const bank = screen.getByRole('group', { name: '단어 블록' })
  await userEvent.click(within(bank).getByRole('button', { name: 'מְעַט' }))
  await userEvent.click(within(bank).getByRole('button', { name: 'מַיִם' }))
  await userEvent.click(screen.getByRole('button', { name: '확인' }))
}

describe('RoleplayView', () => {
  test('starts with three lamps and the setup', () => {
    view()
    expect(lamps(3)).toBeInTheDocument()
    expect(screen.getByText(lesson.setupKo)).toBeInTheDocument()
  })
  test('wrong option dims a lamp and shows feedback', async () => {
    view()
    await userEvent.click(option(/셰테 아도니/))
    expect(lamps(2)).toBeInTheDocument()
    expect(screen.getByText(/리브가가 할 대답이에요/)).toBeInTheDocument()
  })
  test('double-clicking a wrong option only costs one lamp', async () => {
    view()
    await userEvent.dblClick(option(/셰테 아도니/))
    expect(lamps(2)).toBeInTheDocument()
  })
  test('perfect run completes with score 100', async () => {
    const { store } = view()
    await userEvent.click(option(/메아트 마임$/))
    await userEvent.click(screen.getByRole('button', { name: '계속' }))
    expect(screen.getByText(/당신을 바라보며/)).toBeInTheDocument()
    await buildBlocks()
    await userEvent.click(screen.getByRole('button', { name: '계속' }))
    expect(await screen.findByText(/미션 완료/)).toBeInTheDocument()
    expect(store.current().completed['rebekah-roleplay']).toMatchObject({ score: 100, perfect: true })
    expect(screen.getByText('+25 XP')).toBeInTheDocument()
  })
  test('other correct option branches to a different line', async () => {
    view()
    await userEvent.click(option(/미카데크$/))
    await userEvent.click(screen.getByRole('button', { name: '계속' }))
    expect(screen.getByText(/급히 항아리를/)).toBeInTheDocument()
    expect(screen.queryByText(/당신을 바라보며/)).toBeNull()
  })
  test('three mistakes lose the mission and restart refills lamps', async () => {
    view()
    for (let i = 0; i < 3; i++) {
      await userEvent.click(option(/알 야다/))
      if (i < 2) await userEvent.click(screen.getByRole('button', { name: '다시' }))
    }
    expect(screen.getByText('등불이 모두 꺼졌어요')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '처음부터 다시' }))
    expect(lamps(3)).toBeInTheDocument()
  })
  test('one mistake then success scores 67 and is not perfect', async () => {
    const { store } = view()
    await userEvent.click(option(/알 야다/))
    await userEvent.click(screen.getByRole('button', { name: '다시' }))
    await userEvent.click(option(/메아트 마임$/))
    await userEvent.click(screen.getByRole('button', { name: '계속' }))
    await buildBlocks()
    await userEvent.click(screen.getByRole('button', { name: '계속' }))
    expect(store.current().completed['rebekah-roleplay']).toMatchObject({ score: 67, perfect: false })
  })
  test('hebrew bubbles are RTL with translit/translation toggles', async () => {
    view()
    await userEvent.click(option(/메아트 마임$/))
    await userEvent.click(screen.getByRole('button', { name: '계속' }))
    const npc = screen.getByRole('article', { name: '리브가의 말' })
    expect(within(npc).getByText('שְׁתֵה אֲדֹנִי')).toHaveAttribute('dir', 'rtl')
    expect(within(npc).queryByText('마시십시오, 내 주여')).toBeNull()
    await userEvent.click(within(npc).getByRole('button', { name: '해석' }))
    expect(within(npc).getByText('마시십시오, 내 주여')).toBeInTheDocument()
  })
  test('npc bubble shows the character avatar', async () => {
    view()
    await userEvent.click(option(/메아트 마임$/))
    await userEvent.click(screen.getByRole('button', { name: '계속' }))
    const npc = screen.getByRole('article', { name: '리브가의 말' })
    expect(within(npc).getByRole('img', { name: '리브가' })).toHaveAttribute('src', '/illustrations/rebekah-face.webp')
  })
  test('wrong answer feedback comes with Zoe', async () => {
    view()
    await userEvent.click(option(/알 야다/))
    expect(screen.getByRole('status')).toHaveTextContent(/그녀의 손 위에/)
    expect(screen.getByTestId('zoe-feedback')).toBeInTheDocument()
  })
})
