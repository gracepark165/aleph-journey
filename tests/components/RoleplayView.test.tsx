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

  describe('monster battle', () => {
    const hp = () => screen.getByRole('meter', { name: '목마름 먼지구름 체력' })
    test('shows the monster with full health', () => {
      view()
      expect(screen.getByRole('img', { name: '목마름 먼지구름' })).toBeInTheDocument()
      expect(hp()).toHaveAttribute('aria-valuenow', '2')
      expect(hp()).toHaveAttribute('aria-valuemax', '2')
    })
    test('a right line hits the monster, a wrong one does not', async () => {
      view()
      await userEvent.click(option(/셰테 아도니/))
      expect(hp()).toHaveAttribute('aria-valuenow', '2')
      expect(screen.getByRole('img', { name: '조에' })).toHaveAttribute('src', '/illustrations/zoe-worried.webp')
      await userEvent.click(screen.getByRole('button', { name: '다시' }))
      await userEvent.click(option(/메아트 마임$/))
      expect(hp()).toHaveAttribute('aria-valuenow', '1')
      expect(screen.getByText('명중! 좋아요!')).toBeInTheDocument()
    })
    test('the last right line defeats the monster', async () => {
      view()
      await userEvent.click(option(/메아트 마임$/))
      await userEvent.click(screen.getByRole('button', { name: '계속' }))
      await buildBlocks()
      expect(hp()).toHaveAttribute('aria-valuenow', '0')
      expect(screen.getAllByText(lesson.monster!.defeatKo).length).toBeGreaterThan(0)
    })
  })

  test('after the win, Rebekah smiles and says the right lines back', async () => {
    view()
    await userEvent.click(option(/메아트 마임$/))
    await userEvent.click(screen.getByRole('button', { name: '계속' }))
    await buildBlocks()
    await userEvent.click(screen.getByRole('button', { name: '계속' }))
    const scene = screen.getByRole('region', { name: '리브가의 대답' })
    expect(within(scene).getByRole('img', { name: '웃고 있는 리브가' })).toBeInTheDocument()
    expect(await within(scene).findByText('부디 물을 조금 마시게 해 주세요', {}, { timeout: 2000 })).toBeInTheDocument()
    expect(await within(scene).findByText('물 조금', {}, { timeout: 5000 })).toBeInTheDocument()
    expect(await within(scene).findByRole('button', { name: '다시 듣기' }, { timeout: 5000 })).toBeInTheDocument()
  }, 15000)

  test('once Rebekah has spoken, the map arrows to the next stage', async () => {
    renderWithProgress(
      <RoleplayView lesson={lesson} unitId="unit-1-rebekah"
        stage={{ index: 1, titleKo: '우물가의 리브가', unitId: 'unit-1-rebekah' }}
        nextStage={{ index: 2, titleKo: '하란의 우물가', unitId: 'unit-2-jacob' }} />,
    )
    await userEvent.click(option(/메아트 마임$/))
    await userEvent.click(screen.getByRole('button', { name: '계속' }))
    await buildBlocks()
    await userEvent.click(screen.getByRole('button', { name: '계속' }))
    expect(screen.queryByRole('region', { name: '여정 지도' })).toBeNull()
    const map = await screen.findByRole('region', { name: '여정 지도' }, { timeout: 8000 })
    expect(within(map).getByText('2단계: 하란의 우물가')).toBeInTheDocument()
    expect(within(map).getByText('홍해에서 기다리고 있어요')).toBeInTheDocument()
    expect(within(map).getByRole('link', { name: '다음 스테이지' })).toHaveAttribute('href', '/unit/unit-2-jacob')
  }, 15000)
})
