import { test, expect } from '@playwright/test'

test.describe('Fazoo Admin UI', () => {
  test('login page renders', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('text=Fazoo')).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button:has-text("Sign in")')).toBeVisible()
  })

  test('login shows error on bad credentials', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', 'wrong@example.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    await page.click('button:has-text("Sign in")')
    await expect(page.locator('.text-red-400')).toBeVisible({ timeout: 10000 })
  })

  test('dashboard redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login/)
  })

  test('assistants page renders when navigated', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('text=Fazoo')).toBeVisible()
  })
})

test.describe('Widget Chat UI', () => {
  test('widget shows no assistant message when no assistantId', async ({ page }) => {
    await page.goto('/widget')
    await expect(page.locator('text=No assistant configured')).toBeVisible()
  })

  test('widget shows error for invalid assistant', async ({ page }) => {
    await page.goto('/widget?assistantId=00000000-0000-0000-0000-000000000000')
    await expect(page.locator('text=Unable to load chat')).toBeVisible({ timeout: 10000 })
  })

  test('widget layout has no admin nav', async ({ page }) => {
    await page.goto('/widget')
    await expect(page.locator('nav')).toHaveCount(0)
  })
})

test.describe('API Health', () => {
  test('health endpoint returns ok', async ({ request }) => {
    const API_URL = process.env.API_URL || 'http://localhost:4000'
    const response = await request.get(`${API_URL}/health`)
    expect(response.ok()).toBeTruthy()
    const body = await response.json()
    expect(body.ok).toBe(true)
  })
})
