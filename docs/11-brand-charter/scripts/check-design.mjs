import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const { tokens, contrast } = JSON.parse(
  await readFile(new URL('tokens.json', root), 'utf8'),
)
const css = await readFile(new URL('tokens.css', root), 'utf8')

function flatten(object, prefix = '') {
  return Object.entries(object).flatMap(([key, value]) => {
    const name = prefix ? `${prefix}-${key}` : key
    return typeof value === 'object'
      ? flatten(value, name)
      : [[`--${name}`, String(value)]]
  })
}

const expected = new Map(flatten(tokens))
const actual = new Map()
for (const match of css.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
  assert(!actual.has(match[1]), `Duplicate CSS token ${match[1]}`)
  const value = match[2].trim()
  actual.set(
    match[1],
    /^#[\da-f]{6}$/i.test(value) ? value.toUpperCase() : value,
  )
}
assert.deepEqual(actual, expected, 'tokens.css must exactly mirror tokens.json')

function luminance(hex) {
  assert.match(hex, /^#[0-9A-F]{6}$/i, `Invalid sRGB color: ${hex}`)
  const channels = hex
    .slice(1)
    .match(/../g)
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) =>
      channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
    )
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
}

const report = []
function checkPairs(pairs, minimum, kind) {
  for (const [foreground, background] of pairs) {
    assert(tokens.color[foreground], `Unknown color: ${foreground}`)
    assert(tokens.color[background], `Unknown color: ${background}`)
    const a = luminance(tokens.color[foreground])
    const b = luminance(tokens.color[background])
    const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
    assert(
      ratio >= minimum,
      `${kind}: ${foreground} on ${background} is ${ratio.toFixed(3)}:1; requires ${minimum}:1`,
    )
    report.push({ kind, foreground, background, ratio, minimum })
  }
}

checkPairs(
  contrast.textForegrounds.flatMap((foreground) =>
    contrast.lightBackgrounds.map((background) => [foreground, background]),
  ),
  contrast.textMinimum,
  'text',
)
checkPairs(contrast.additionalTextPairs, contrast.textMinimum, 'text')
checkPairs(contrast.controlBoundaryPairs, contrast.boundaryMinimum, 'control')
checkPairs(contrast.focusPairs, contrast.boundaryMinimum, 'focus')

assert.equal(tokens.focus.width, '3px')
assert.equal(tokens.focus.offset, '3px')
for (const [step, value] of Object.entries(tokens.space)) {
  assert.equal(Number.parseInt(value, 10), Number(step) * 4)
}
assert.deepEqual(Object.values(tokens.radius), ['8px', '12px', '20px', '999px'])
for (const filename of [
  'assets/fonts/manrope-latin.woff2',
  'assets/fonts/readex-arabic.woff2',
  'assets/fonts/readex-latin.woff2',
]) {
  const contents = await readFile(new URL(filename, root))
  assert.equal(contents.subarray(0, 4).toString('ascii'), 'wOF2', filename)
  assert(contents.length > 5000, `Unexpectedly small font: ${filename}`)
}
for (const filename of [
  'wordmark.svg',
  'wordmark-reverse.svg',
  'symbol.svg',
  'symbol-reverse.svg',
]) {
  const svg = await readFile(new URL(`assets/logo/${filename}`, root), 'utf8')
  assert.match(svg, /<title[\s>]/, `Missing SVG title: ${filename}`)
  assert.match(svg, /<path[\s>]/, `Missing SVG geometry: ${filename}`)
  assert(
    !/<(?:text|image|script)[\s>]/i.test(svg),
    `Non-vector logo: ${filename}`,
  )
}

if (process.argv.includes('--json')) {
  process.stdout.write(
    `${JSON.stringify({ tokenCount: expected.size, pairs: report }, null, 2)}\n`,
  )
} else {
  const lowest = (kind) =>
    Math.min(
      ...report.filter((row) => row.kind === kind).map((row) => row.ratio),
    ).toFixed(2)
  process.stdout.write(
    `${expected.size} CSS tokens match JSON; ${report.length} contrast pairs pass.\n` +
      `Minimum text ${lowest('text')}:1; control ${lowest('control')}:1; focus ${lowest('focus')}:1.\n` +
      'Local WOFF2 fonts and outlined SVG logos verified. Palette checks only; inspect complete UI separately.\n',
  )
}
