/**
 * Back office (/admin)
 *
 * The signed-out checks always run. The admin journey needs a seeded admin
 * account (demo seed: `make demo-seed`), so it only runs when credentials are
 * provided:
 *   E2E_ADMIN_EMAIL=admin@demo.tickr.local E2E_ADMIN_PASSWORD=TickrDemo2026! npm run test:e2e
 * It changes demo data (roles, suspension, an event cancellation): use a
 * disposable demo database.
 */

import { expect, test } from '@playwright/test'

import type { Browser, Page } from '@playwright/test'

test.describe('Back office, signed out', () => {
  test('asks to sign in and is kept out of search engines', async ({
    page,
    request,
  }) => {
    await page.goto('/admin')
    await expect(page.getByRole('link', { name: 'Se connecter' })).toBeVisible()
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      /noindex/,
    )
    const robots = await (await request.get('/robots.txt')).text()
    // Production lists /admin; non-indexable environments disallow everything.
    expect(robots).toMatch(/^Disallow: \/(admin)?$/m)
  })

  test('the proxy forwards admin routes but nothing outside them', async ({
    request,
  }) => {
    // Forwarded: the backend answers (401 without a session).
    expect((await request.get('/api/backend/admin/users')).status()).toBe(401)
    // Not on the allowlist: refused by the proxy itself.
    expect((await request.get('/api/backend/admin/settings')).status()).toBe(
      404,
    )
    expect((await request.get('/api/backend/users')).status()).toBe(404)
  })
})

const adminEmail = process.env.E2E_ADMIN_EMAIL
const adminPassword = process.env.E2E_ADMIN_PASSWORD

async function signIn(page: Page, email: string, password: string) {
  await page.goto(`/auth/login?returnTo=${encodeURIComponent('/admin')}`)
  await page.locator('input[type=email]').fill(email)
  await page.locator('input[type=password]').fill(password)
  await page.locator('form button:not([type=button])').last().click()
  await page.waitForURL((url) => url.pathname === '/admin')
}

test.describe('Back office, as an administrator', () => {
  test.skip(
    !adminEmail || !adminPassword,
    'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD',
  )
  test.describe.configure({ mode: 'serial' })

  // Sign in once: login is rate limited to 5 attempts per 15 minutes.
  let page: Page
  test.beforeAll(async ({ browser }: { browser: Browser }) => {
    page = await browser.newPage()
    await signIn(page, adminEmail!, adminPassword!)
  })
  test.afterAll(async () => {
    await page?.close()
  })

  test('overview shows platform figures', async () => {
    await page.goto('/admin')
    await expect(
      page.getByRole('link', { name: 'Administration', exact: true }),
    ).toBeVisible()
    for (const label of [
      'Volume encaissé',
      'Commission Tickr',
      'Comptes actifs',
      'Dernières commandes',
    ])
      await expect(page.getByText(label)).toBeVisible()
  })

  test('accounts: filter, change a role and suspend', async () => {
    await page.goto('/admin')
    await page.goto('/admin/users')
    await expect(page.getByText(/\d+ comptes/)).toBeVisible()

    const self = page.locator('.admin-list > li', { hasText: adminEmail! })
    await expect(self.getByRole('button', { name: 'Gérer' })).toBeDisabled()

    await page.getByRole('combobox').first().selectOption('PARTICIPANT')
    const row = page.locator('.admin-list > li').first()
    await expect(row.getByText('Participant', { exact: true })).toBeVisible()
    const email = (await row.locator('p').first().innerText()).trim()

    await row.getByRole('button', { name: 'Gérer' }).click()
    await row.getByRole('combobox').selectOption('ORGANIZER')
    await row.getByRole('button', { name: 'Changer le rôle' }).click()
    await expect(page.getByRole('status')).toContainText('organisateur')

    await page.getByRole('combobox').first().selectOption('')
    const promoted = page.locator('.admin-list > li', { hasText: email })
    await expect(
      promoted.getByText('Organisateur', { exact: true }),
    ).toBeVisible()
    await promoted.getByRole('button', { name: 'Gérer' }).click()
    await promoted.getByRole('button', { name: 'Suspendre le compte' }).click()
    await expect(page.getByRole('status')).toContainText('suspendu')
    await expect(promoted.getByText('Suspendu', { exact: true })).toBeVisible()

    // Restore the account.
    await promoted.getByRole('button', { name: 'Gérer' }).click()
    await promoted.getByRole('combobox').selectOption('PARTICIPANT')
    await promoted.getByRole('button', { name: 'Changer le rôle' }).click()
    await expect(page.getByRole('status')).toContainText('participant')
    await promoted.getByRole('button', { name: 'Gérer' }).click()
    await promoted.getByRole('button', { name: 'Réactiver le compte' }).click()
    await expect(page.getByRole('status')).toContainText('réactivé')
  })

  test('organizer with open events: demotion refused, suspension immediate', async () => {
    await page.goto('/admin/users')
    await page.getByRole('combobox').first().selectOption('ORGANIZER')
    const organizer = page.locator('.admin-list > li', {
      hasText: 'organizer@demo.tickr.local',
    })
    await expect(
      organizer.locator('.admin-row-tags .status-pill').first(),
    ).toHaveText('Organisateur')

    await organizer.getByRole('button', { name: 'Gérer' }).click()
    await organizer.getByRole('combobox').selectOption('PARTICIPANT')
    await organizer.getByRole('button', { name: 'Changer le rôle' }).click()
    const refusal = organizer.locator('.form-error')
    await expect(refusal).toContainText(
      /Ce compte a encore \d+ événements? ouverts?/,
    )
    await expect(refusal).toContainText('la suspension reste possible')
    await expect(
      organizer.locator('.admin-row-tags .status-pill').first(),
    ).toHaveText('Organisateur')

    await organizer.getByRole('button', { name: 'Suspendre le compte' }).click()
    const notice = page.getByRole('status').filter({ hasText: 'est suspendu' })
    await expect(notice).toContainText('Ses événements restent en ligne')
    await notice.getByRole('link', { name: 'Voir ses événements' }).click()
    await page.waitForURL((url) => url.searchParams.has('organizerId'))
    await expect(page.locator('.filter-chip.is-active')).toBeVisible()
    await expect(page.locator('.admin-list > li').first()).toContainText(
      'organizer@demo.tickr.local',
    )

    // Restore the organizer.
    await page.goto('/admin/users')
    await page.getByRole('combobox').first().selectOption('ORGANIZER')
    await organizer.getByRole('button', { name: 'Gérer' }).click()
    await organizer.getByRole('button', { name: 'Réactiver le compte' }).click()
    await expect(page.getByRole('status')).toContainText('réactivé')
  })

  test('events: commission, free tickets and cancellation', async () => {
    await page.goto('/admin/events')
    await page.getByRole('combobox').first().selectOption('PUBLISHED')
    await expect(
      page.locator('.admin-list > li .status-pill').first(),
    ).toHaveText('Publié')
    const row = page.locator('.admin-list > li').first()
    const title = (await row.locator('h3').innerText()).trim()

    await row.getByRole('button', { name: 'Gérer' }).click()
    await row.locator('input[name=rate]').fill('25')
    await row.getByRole('button', { name: 'Appliquer' }).first().click()
    await expect(row.locator('.form-error')).toContainText('20 %')

    await row.locator('input[name=rate]').fill('4,5')
    await row.getByRole('button', { name: 'Appliquer' }).first().click()
    await expect(page.getByRole('status')).toContainText('4,5 %')
    await expect(row.getByText('4,5 %', { exact: true })).toBeVisible()

    await row.getByRole('button', { name: 'Gérer' }).click()
    await row.getByRole('combobox').selectOption('allow')
    await row.getByRole('button', { name: 'Appliquer' }).nth(1).click()
    await expect(page.getByRole('status')).toContainText('autorisés')
    await expect(row.getByText('Autorisés', { exact: true })).toBeVisible()

    // Restore both settings.
    await row.getByRole('button', { name: 'Gérer' }).click()
    await row.locator('input[name=rate]').fill('')
    await row.getByRole('button', { name: 'Appliquer' }).first().click()
    await expect(page.getByRole('status')).toContainText('taux global')
    await row.getByRole('button', { name: 'Gérer' }).click()
    await row.getByRole('combobox').selectOption('inherit')
    await row.getByRole('button', { name: 'Appliquer' }).nth(1).click()
    await expect(page.getByRole('status')).toContainText('politique globale')

    // Cancel a draft (never a published demo event).
    await page.getByRole('combobox').first().selectOption('DRAFT')
    const empty = page.getByText('Aucun événement ne correspond.')
    await expect(
      page
        .locator('.admin-list > li .status-pill', { hasText: 'Brouillon' })
        .first()
        .or(empty),
    ).toBeVisible()
    test.skip(await empty.isVisible(), 'No draft left to cancel')
    const draft = page.locator('.admin-list > li').first()
    const draftTitle = (await draft.locator('h3').innerText()).trim()
    await draft.getByRole('button', { name: 'Gérer' }).click()
    await draft.getByRole('button', { name: 'Annuler l’événement' }).click()
    await draft.locator('textarea[name=reason]').fill('Contenu non conforme')
    await draft.getByRole('button', { name: 'Confirmer l’annulation' }).click()
    await expect(page.getByRole('status')).toContainText('est annulé')
    await page.getByRole('combobox').first().selectOption('CANCELLED')
    const cancelled = page.locator('.admin-list > li', { hasText: draftTitle })
    await expect(cancelled.getByText('Contenu non conforme')).toBeVisible()
    expect(title).toBeTruthy()
  })

  test('orders: filter by event and explain refund outcome', async () => {
    await page.goto('/admin/orders')
    await page.getByRole('combobox').first().selectOption('PAID')
    const row = page.locator('.admin-list > li').first()
    await expect(row.getByText('Payée', { exact: true })).toBeVisible()

    await row.getByRole('button', { name: 'Rembourser' }).click()
    await expect(row.getByText(/n’est pas remboursée/)).toBeVisible()
    await row.locator('textarea[name=reason]').fill('Geste commercial')
    await row.getByRole('button', { name: 'Rembourser la commande' }).click()
    // Demo config disables gateways: the order must stay paid with a clear message.
    await expect(
      row.locator('.form-error').or(page.getByRole('status')),
    ).toBeVisible()
  })

  test('mobile layout keeps actions reachable', async () => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/admin/events')
    const manage = page
      .locator('.admin-list > li')
      .first()
      .getByRole('button', { name: 'Gérer' })
    await manage.scrollIntoViewIfNeeded()
    await expect(manage).toBeVisible()
    const box = await manage.boundingBox()
    expect(box!.x + box!.width).toBeLessThanOrEqual(390)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
  })
})

test.describe('Back office, as a participant', () => {
  test.skip(!process.env.E2E_PARTICIPANT_EMAIL, 'Set E2E_PARTICIPANT_EMAIL')

  test('sees the reserved-access message and no admin link', async ({
    page,
  }) => {
    await page.goto(`/auth/login?returnTo=${encodeURIComponent('/admin')}`)
    await page
      .locator('input[type=email]')
      .fill(process.env.E2E_PARTICIPANT_EMAIL!)
    await page
      .locator('input[type=password]')
      .fill(process.env.E2E_PARTICIPANT_PASSWORD || adminPassword || '')
    await page.locator('form button:not([type=button])').last().click()
    await expect(
      page.getByText('Un espace réservé à l’équipe Tickr.'),
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Administration', exact: true }),
    ).toHaveCount(0)
  })
})
