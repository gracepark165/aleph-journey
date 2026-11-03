import { expect, test, type Page } from '@playwright/test'
import { btn } from './helpers'

async function noHorizontalScroll(page: Page) {
  const width = await page.evaluate(() => document.documentElement.scrollWidth)
  expect(width).toBeLessThanOrEqual(390)
}

test('pages fit a 390px screen and Hebrew is RTL', async ({ page }) => {
  // Unlock everything by seeding completed lessons.
  await page.addInitScript(() => {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date())
    const done = { completedAt: 'x', score: 100, perfect: true }
    localStorage.setItem('aleph-journey:progress', JSON.stringify({
      version: 1, xp: 0, dailyGoal: 1,
      completed: { 'alef-bet-1': done, 'rebekah-reading': done, 'rebekah-quiz': done },
      streak: { current: 0, longest: 0, lastActiveDate: null }, restTokens: 0, restTokenWeek: null,
      today: { date: today, lessonsCompleted: 0 }, reviews: {},
    }))
  })
  for (const path of ['/', '/unit/unit-1-rebekah', '/lesson/alef-bet-1', '/lesson/rebekah-reading', '/lesson/rebekah-quiz', '/lesson/rebekah-roleplay', '/vocab']) {
    await page.goto(path)
    await page.waitForLoadState('networkidle')
    await noHorizontalScroll(page)
  }
  await page.goto('/lesson/rebekah-roleplay')
  await page.getByRole('button', { name: /메아트 마임$/ }).click()
  await btn(page, '계속').click()
  const npc = page.getByRole('article', { name: '리브가의 말' })
  await expect(npc.locator('[lang="he"]').first()).toHaveAttribute('dir', 'rtl')
  await noHorizontalScroll(page)
})
