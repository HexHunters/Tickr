#!/usr/bin/env bash
set -euo pipefail

chart_dir="$(cd "$(dirname "$0")/.." && pwd)"
node --input-type=module - "$chart_dir" <<'JS'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const chart = process.argv[2]
const require = createRequire(join(chart, '../../frontend/package.json'))
const { chromium } = require('playwright')
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const executablePath = process.env.CHROME_PATH || (existsSync(chrome) ? chrome : undefined)
const browser = await chromium.launch({ executablePath, headless: true })
try {
  const page = await browser.newPage({ reducedMotion: 'reduce' })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  const previews = join(chart, 'assets/previews')
  await mkdir(previews, { recursive: true })
  for (const filename of ['coming-soon.html', 'brand-book.html']) {
    await page.goto(pathToFileURL(join(chart, filename)).href)
    await page.evaluate(() => document.fonts.ready)
    await page.evaluate(() => Promise.all([...document.images].map(image => {
      image.loading = 'eager'
      return image.decode()
    })))
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 })
      const problems = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth,
        brokenImages: [...document.images].filter(image => !image.complete || !image.naturalWidth).map(image => image.src),
      }))
      assert.equal(problems.overflow, false, `${filename}: horizontal overflow at ${width}px`)
      assert.deepEqual(problems.brokenImages, [], `${filename}: missing images`)
    }
    if (filename === 'coming-soon.html') {
      await page.screenshot({ path: join(previews, 'coming-soon-desktop.png'), scale: 'css' })
      await page.setViewportSize({ width: 390, height: 844 })
      await page.screenshot({ path: join(previews, 'coming-soon-mobile.png'), scale: 'css' })
      assert.equal(await page.locator('.hero-copy').evaluate(element => getComputedStyle(element).animationName), 'none')
    } else {
      assert.equal(await page.locator('.sheet').count(), 24)
      await page.emulateMedia({ media: 'print' })
      const overlaps = await page.evaluate(() => [...document.querySelectorAll('.sheet')].flatMap(sheet => {
        const footer = sheet.querySelector('.folio').getBoundingClientRect().top
        return [...sheet.children].filter(element => element.tagName !== 'FOOTER' && !element.classList.contains('cover-art') && element.getBoundingClientRect().bottom > footer).map(() => sheet.id)
      }))
      assert.deepEqual(overlaps, [], 'Content overlaps a printed footer')
      await page.pdf({ path: join(chart, 'tickr-charte-graphique.pdf'), preferCSSPageSize: true, printBackground: true, tagged: true, outline: true })
      await page.emulateMedia({ media: 'screen' })
      await page.locator('#couverture').screenshot({ path: join(previews, 'brand-cover.png'), scale: 'css' })
    }
  }
  assert.deepEqual(errors, [], 'Browser runtime errors')
  process.stdout.write('Exported PDF from 24 checked sheets and three previews. Layout/images verified at 320, 390, 768 and 1440px.\n')
} finally {
  await browser.close()
}
JS
