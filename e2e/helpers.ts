import { expect, type Page } from '@playwright/test'

export const btn = (page: Page, name: string) => page.getByRole('button', { name, exact: true })

export async function answerChoices(page: Page, answers: string[]) {
  for (const a of answers) {
    await btn(page, a).click()
    await btn(page, '다음').click()
  }
}

export async function buildTokens(page: Page, tokens: string[]) {
  const bank = page.getByRole('group', { name: '단어 블록' })
  for (const t of tokens) await bank.getByRole('button', { name: t, exact: true }).click()
  await btn(page, '확인').click()
}

/** Plays the whole course from a fresh state; leaves the page on the roleplay success screen. */
export async function playThrough(page: Page, { roleplayMistake = true } = {}) {
  await page.goto('/')
  await page.getByRole('link', { name: /알파벳 첫걸음/ }).click()
  await page.getByRole('link', { name: /첫 다섯 글자/ }).click()
  await answerChoices(page, ['알레프', '베트', '기멜', '달레트', '헤'])
  await expect(page.getByText('+15 XP')).toBeVisible()
  await page.getByRole('link', { name: '다음 레슨' }).click()

  await btn(page, '다음 구절').click()
  await btn(page, '완료').click()
  await expect(page.getByText('+10 XP')).toBeVisible()
  await page.getByRole('link', { name: '다음 레슨' }).click()

  await answerChoices(page, ['물', '부디, 제발', '마시라', '나의 주여'])
  await buildTokens(page, ['מְעַט', 'מַיִם'])
  await btn(page, '다음').click()
  await expect(page.getByText('+15 XP')).toBeVisible()
  await page.getByRole('link', { name: '다음 레슨' }).click()

  if (roleplayMistake) {
    await page.getByRole('button', { name: /알 야다/ }).click()
    await expect(page.getByLabel('남은 등불 2개')).toBeVisible()
    await btn(page, '다시').click()
  }
  await page.getByRole('button', { name: /메아트 마임$/ }).click()
  await btn(page, '계속').click()
  await buildTokens(page, ['מְעַט', 'מַיִם'])
  await btn(page, '계속').click()
  await expect(page.getByText('미션 성공!')).toBeVisible()
}
