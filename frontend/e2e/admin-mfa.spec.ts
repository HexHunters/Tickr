/**
 * Administrator two-factor authentication (authenticator app).
 *
 * The signed-out checks always run. The journey needs an ADMIN account with
 * no authenticator yet; it enrolls one, so reset it before each run:
 *   (backend) npm run mfa:reset -- admin@demo.tickr.local
 *   E2E_ADMIN_EMAIL=admin@demo.tickr.local E2E_ADMIN_PASSWORD=… npm run test:e2e
 */

import { createHmac } from 'node:crypto'

import { expect, test } from '@playwright/test'

import type { Browser, Page } from '@playwright/test'

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

/** What an authenticator app shows for this key (RFC 6238, SHA-1, 6 digits). */
function totp(secret: string, offset = 0): string {
  let bits = 0
  let value = 0
  const bytes: number[] = []
  for (const char of secret.replace(/\s/g, '')) {
    value = (value << 5) | BASE32.indexOf(char)
    bits += 5
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  const counter = Buffer.alloc(8)
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30_000) + offset))
  const hmac = createHmac('sha1', Buffer.from(bytes)).update(counter).digest()
  const at = hmac[hmac.length - 1] & 0x0f
  const binary =
    ((hmac[at] & 0x7f) << 24) |
    (hmac[at + 1] << 16) |
    (hmac[at + 2] << 8) |
    hmac[at + 3]
  return String(binary % 1_000_000).padStart(6, '0')
}

/** Avoid typing a code in the last seconds of its 30 s window. */
async function safeWindow(page: Page) {
  const remaining = 30_000 - (Date.now() % 30_000)
  if (remaining < 3000) await page.waitForTimeout(remaining + 100)
}

async function enterPassword(page: Page, email: string, password: string) {
  await page.goto(`/auth/login?returnTo=${encodeURIComponent('/account')}`)
  await page.locator('input[type=email]').fill(email)
  await page.locator('input[type=password]').fill(password)
  await page.locator('form button:not([type=button])').last().click()
}

test.describe('Two-factor screens without a sign-in in progress', () => {
  test('setup and code pages send the visitor back to the password step', async ({
    page,
  }) => {
    await page.goto('/auth/mfa/setup')
    await expect(page.locator('.form-error')).toContainText(
      'Votre connexion a expiré',
    )
    await expect(
      page.getByRole('link', { name: 'Se reconnecter' }),
    ).toBeVisible()

    await page.goto('/auth/mfa')
    await page.getByLabel('Code à 6 chiffres').fill('123456')
    await page.getByRole('button', { name: 'Se connecter' }).click()
    await expect(page.locator('.form-error')).toContainText(
      'Votre connexion a expiré',
    )
  })
})

const email = process.env.E2E_ADMIN_EMAIL
const password = process.env.E2E_ADMIN_PASSWORD

test.describe('Administrator sign-in with an authenticator app', () => {
  test.skip(!email || !password, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD')
  test.describe.configure({ mode: 'serial' })

  let page: Page
  let secret = ''
  let recoveryCodes: string[] = []

  test.beforeAll(async ({ browser }: { browser: Browser }) => {
    page = await browser.newPage()
  })
  test.afterAll(async () => {
    await page?.close()
  })

  test('first sign-in: the password alone opens nothing, the QR code enrolls', async () => {
    await enterPassword(page, email!, password!)
    await page.waitForURL((url) => url.pathname === '/auth/mfa/setup')

    // No session yet.
    const session = await page.request.get('/api/auth/session')
    expect((await session.json()).user).toBeNull()

    await expect(page.getByRole('img', { name: /QR code/ })).toBeVisible()
    await page.getByText('Impossible de scanner ? Saisir la clé').click()
    secret = (await page.locator('.mfa-secret').innerText()).replace(/\s/g, '')
    expect(secret).toMatch(/^[A-Z2-7]{32}$/)

    await page.getByLabel('Code à 6 chiffres').fill('000000')
    await page.getByRole('button', { name: 'Activer et continuer' }).click()
    await expect(page.locator('.form-error')).toContainText('ne correspond pas')

    await safeWindow(page)
    await page.getByLabel('Code à 6 chiffres').fill(totp(secret, -1))
    await page.getByRole('button', { name: 'Activer et continuer' }).click()

    await expect(
      page.getByRole('heading', { name: 'Votre compte est protégé.' }),
    ).toBeVisible()
    recoveryCodes = await page
      .locator('.mfa-recovery-codes code')
      .allInnerTexts()
    expect(recoveryCodes).toHaveLength(10)
    const download = page.getByRole('link', { name: 'Télécharger' })
    expect(
      decodeURIComponent((await download.getAttribute('href'))!),
    ).toContain(recoveryCodes[0])

    const proceed = page.getByRole('button', { name: 'Continuer' })
    await expect(proceed).toBeDisabled()
    await page.getByLabel('J’ai conservé ces codes en lieu sûr.').check()
    await proceed.click()
    await page.waitForURL((url) => url.pathname === '/account')
    await expect(page.locator('#securite')).toContainText(
      '10 codes de récupération disponibles',
    )
  })

  test('later sign-in: a code from the app', async () => {
    await page.request.post('/api/auth/logout')
    await enterPassword(page, email!, password!)
    await page.waitForURL((url) => url.pathname === '/auth/mfa')

    await page.getByLabel('Code à 6 chiffres').fill('000000')
    await page.getByRole('button', { name: 'Se connecter' }).click()
    await expect(page.locator('.form-error')).toContainText('ne correspond pas')

    await safeWindow(page)
    await page.getByLabel('Code à 6 chiffres').fill(totp(secret, 0))
    await page.getByRole('button', { name: 'Se connecter' }).click()
    await page.waitForURL((url) => url.pathname === '/account')
    expect(
      (await (await page.request.get('/api/auth/session')).json()).user.role,
    ).toBe('ADMIN')
  })

  test('lost phone: a recovery code works once', async () => {
    await page.request.post('/api/auth/logout')
    await enterPassword(page, email!, password!)
    await page.waitForURL((url) => url.pathname === '/auth/mfa')

    await page
      .getByRole('button', { name: 'Je n’ai pas accès à mon application' })
      .click()
    await page
      .getByLabel('Code de récupération')
      .fill(recoveryCodes[0].toLowerCase())
    await page.getByRole('button', { name: 'Se connecter' }).click()
    await expect(page.getByRole('status')).toContainText(
      'Il vous reste 9 codes de récupération',
    )
    await page.getByRole('button', { name: 'Continuer' }).click()
    await page.waitForURL((url) => url.pathname === '/account')
  })

  test('account page: new recovery codes replace the old ones', async () => {
    await page.goto('/account#securite')
    const security = page.locator('#securite')
    await expect(security).toContainText('9 codes de récupération disponibles')

    await safeWindow(page)
    await security.getByLabel('Code de votre application').fill(totp(secret, 1))
    await security
      .getByRole('button', { name: 'Générer de nouveaux codes' })
      .click()
    await expect(security.locator('.mfa-recovery-codes code')).toHaveCount(10)
    const fresh = await security
      .locator('.mfa-recovery-codes code')
      .allInnerTexts()
    expect(fresh).toHaveLength(10)
    expect(fresh).not.toContain(recoveryCodes[1])

    // An old code no longer signs in.
    await page.request.post('/api/auth/logout')
    await enterPassword(page, email!, password!)
    await page.waitForURL((url) => url.pathname === '/auth/mfa')
    await page
      .getByRole('button', { name: 'Je n’ai pas accès à mon application' })
      .click()
    await page.getByLabel('Code de récupération').fill(recoveryCodes[1])
    await page.getByRole('button', { name: 'Se connecter' }).click()
    await expect(page.locator('.form-error')).toContainText('ne correspond pas')
  })
})
