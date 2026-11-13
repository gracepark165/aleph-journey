import { expect, test, type Page } from '@playwright/test'
import { btn, introSeen } from './helpers'

async function noHorizontalScroll(page: Page) {
  const width = await page.evaluate(() => document.documentElement.scrollWidth)
  expect(width).toBeLessThanOrEqual(390)
}

const card = (page: Page) => page.getByRole('region', { name: '친구 순위' })

test.beforeEach(async ({ page }) => {
  await introSeen(page)
})

test('home shows the leaderboard card with my row', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '🏆 이번 주 친구 순위' })).toBeVisible()
  await expect(card(page).getByText('(나)')).toBeVisible()
})

test('adding the demo friend puts them first on the home ranking', async ({ page }) => {
  await page.goto('/friends')
  await page.getByLabel('친구 코드').fill('demo')
  await btn(page, '추가').click()
  await expect(page.getByText('다윗').first()).toBeVisible()

  await page.goto('/')
  const rows = card(page).getByRole('listitem')
  await expect(rows).toHaveCount(2)
  await expect(rows.nth(0)).toContainText('다윗')
  await expect(rows.nth(0)).toContainText('120 XP')
  await expect(rows.nth(1)).toContainText('(나)')
})

test('invite links: already a friend, and unknown code', async ({ page }) => {
  await page.goto('/friends')
  await page.getByLabel('친구 코드').fill('demo')
  await btn(page, '추가').click()
  await expect(page.getByText('다윗').first()).toBeVisible()

  await page.goto('/invite/ALEF-DEMO')
  await btn(page, '친구 되기').click()
  await expect(page.getByText('이미 친구예요')).toBeVisible()

  await page.goto('/invite/ALEF-ZZZZ')
  await expect(page.getByText('초대 코드를 찾을 수 없어요')).toBeVisible()
})

test('finishing a lesson raises my weekly XP on the home card', async ({ page }) => {
  await page.goto('/')
  const mine = card(page).getByRole('listitem').filter({ hasText: '(나)' })
  await expect(mine).toContainText('0 XP')
  await page.goto('/lesson/alef-bet-1')
  for (const a of ['알레프', '베트', '기멜', '달레트', '헤']) {
    await btn(page, a).click()
    await btn(page, '다음').click()
  }
  await expect(page.getByText('+15 XP')).toBeVisible()
  await page.goto('/')
  await expect(mine).toContainText('15 XP')
})

test('friends pages fit a 390px screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  for (const path of ['/friends', '/invite/ALEF-DEMO']) {
    await page.goto(path)
    await page.waitForLoadState('networkidle')
    await noHorizontalScroll(page)
  }
})
