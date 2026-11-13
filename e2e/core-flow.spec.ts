import { expect, test } from '@playwright/test'
import { introSeen, playThrough } from './helpers'

test.describe('first visit', () => {
  test('intro plays once: shooting star, Genesis 15:5, then home', async ({ page }) => {
    await page.goto('/')
    const intro = page.getByRole('dialog', { name: '인트로' })
    await expect(intro).toBeVisible()
    await intro.getByRole('button', { name: /화면을 눌러 시작하세요/ }).click()
    await expect(intro).toHaveClass(/is-playing/)
    await expect(intro.getByText('הַבֶּט־נָא הַשָּׁמַיְמָה וּסְפֹר הַכּוֹכָבִים')).toBeVisible()
    const audio = await page.evaluate(() => { const a = document.querySelector('audio'); return a && { src: a.src, paused: a.paused } })
    expect(audio?.src).toContain('/audio/intro-silent-night.mp3')
    await intro.getByRole('button', { name: '여정 시작하기' }).click()
    await expect(intro).toHaveCount(0)
    await expect(page.getByText(/저는 조에예요/)).toBeVisible()
    await page.reload()
    await expect(page.getByText(/저는 조에예요/)).toBeVisible()
    await expect(page.getByRole('dialog', { name: '인트로' })).toHaveCount(0)
  })
})

test.describe('returning visitor', () => {
test.beforeEach(async ({ page }) => { await introSeen(page) })

test('review mode (?unlock=all) opens every lesson until turned off', async ({ page }) => {
  await page.goto('/journey?unlock=all')
  await expect(page.getByText('검토 모드 · 모든 레슨 열림')).toBeVisible()
  await page.getByRole('link', { name: /폭풍 속의 요나/ }).click()
  await page.getByRole('link', { name: /미션: 선원들에게/ }).click()
  await expect(page.getByLabel('남은 등불 3개')).toBeVisible()
  await page.goto('/journey')
  await page.getByRole('button', { name: '끄기' }).click()
  await expect(page.getByRole('link', { name: /폭풍 속의 요나/ })).toHaveCount(0)
})


test('home: Zoe greets a new learner and starts the first lesson', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText(/저는 조에예요/)).toBeVisible()
  await page.getByRole('link', { name: /시작하기/ }).click()
  await expect(page).toHaveURL(/\/lesson\/alef-bet-1$/)
})

test('first visit: only the alphabet unit is open', async ({ page }) => {
  await page.goto('/journey')
  await expect(page.getByRole('link', { name: /알파벳 첫걸음/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /우물가의 리브가/ })).toHaveCount(0)
  await expect(page.locator('[aria-disabled="true"]', { hasText: '우물가의 리브가' })).toBeVisible()
})

test('full course play-through persists across reload', async ({ page }) => {
  await playThrough(page)
  await expect(page.getByLabel('연속 학습 1일')).toBeVisible()
  await page.reload()
  await expect(page.getByLabel('경험치 60')).toBeVisible() // 15 + 10 + 15 + 20 (one roleplay mistake)
  await page.goto('/journey')
  await expect(page.getByRole('link', { name: /우물가의 리브가/ })).toContainText('3/3')
  await page.goto('/')
  await expect(page.getByText('준비된 레슨을 모두 마쳤어요', { exact: false }).or(page.getByText('오늘 목표 완료', { exact: false }))).toBeVisible()
  await page.goto('/vocab')
  await expect(page.getByText('מַיִם', { exact: true })).toBeVisible()
})

test('locked lesson URL redirects to its unit; unknown lesson is 404', async ({ page }) => {
  await page.goto('/lesson/rebekah-roleplay')
  await expect(page).toHaveURL(/\/unit\/unit-1-rebekah$/)
  const res = await page.goto('/lesson/nope')
  expect(res?.status()).toBe(404)
  await expect(page.getByText('길을 잃었어요')).toBeVisible()
})

test('corrupted saved progress starts fresh without crashing', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('aleph-journey:progress', '{broken'))
  await page.goto('/')
  await expect(page.getByRole('link', { name: /시작하기/ })).toBeVisible()
  await expect(page.getByLabel('경험치 0')).toBeVisible()
})

test('attribution footer on every page', async ({ page }) => {
  for (const path of ['/', '/journey', '/unit/unit-0-alefbet', '/lesson/alef-bet-1', '/vocab', '/lesson/nope']) {
    await page.goto(path)
    await expect(page.locator('footer')).toContainText('Open Scriptures Hebrew Bible (CC BY 4.0)')
  }
})
})
