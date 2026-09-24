import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright-core'

const baseUrl = process.env.FANCHEN_URL || 'http://127.0.0.1:4173/'
const outputDir = process.env.FANCHEN_SCREENSHOT_DIR || '/tmp/fanchen-visual'
const executablePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

await mkdir(outputDir, { recursive: true })

const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: [
    '--disable-background-networking',
    '--disable-component-update',
    '--disable-default-apps',
    '--disable-sync',
    '--no-default-browser-check',
    '--no-first-run',
  ],
})

try {
  await verifyViewport('desktop', { width: 1440, height: 900 })
  await verifyViewport('mobile', { width: 390, height: 844 })
  console.log(`Visual smoke checks passed. Screenshots: ${outputDir}`)
} finally {
  await browser.close()
}

async function verifyViewport(name, viewport) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 })
  const page = await context.newPage()
  const pageErrors = []
  page.on('pageerror', error => pageErrors.push(error.message))
  await page.addInitScript(() => localStorage.clear())
  await page.goto(baseUrl, { waitUntil: 'networkidle' })

  const overlay = page.locator('.story-overlay')
  await overlay.waitFor({ state: 'visible' })
  await assertInsideViewport(page, '.story-overlay__panel')

  const firstChoice = page.locator('.story-choice-button:not(:disabled)').first()
  assert.equal(await firstChoice.evaluate(element => element === document.activeElement), true, `${name}: first story choice should receive focus`)
  assert.equal(await hasHorizontalOverflow(page), false, `${name}: opening screen has horizontal overflow`)

  const progressBefore = await page.locator('.current-focus__facts dd').nth(1).textContent()
  await page.waitForTimeout(8_000)
  const progressAfter = await page.locator('.current-focus__facts dd').nth(1).textContent()
  assert.equal(progressAfter, progressBefore, `${name}: world advanced while the story dialog was open`)

  await page.screenshot({ path: `${outputDir}/${name}-opening.png` })
  await completeOpeningTutorial(page)

  assert.equal(await overlay.count(), 0, `${name}: story overlay should close at the terminal node`)
  assert.match(await page.locator('.dock-tab-btn.active').textContent(), /势力/, `${name}: tutorial should finish on the affiliation panel`)
  assert.equal(await hasHorizontalOverflow(page), false, `${name}: gameplay shell has horizontal overflow`)

  const backgroundImage = await page.locator('.current-focus').evaluate(element => getComputedStyle(element).backgroundImage)
  assert.match(backgroundImage, /bg\.png/, `${name}: current-focus background asset did not load`)

  if (name === 'mobile') {
    await page.getByRole('button', { name: '纪事' }).click()
    await page.locator('.pin-rail').waitFor({ state: 'visible' })
    await assertInsideViewport(page, '.pin-rail')
    await assertInsideViewport(page, '.pin-card')
    await page.screenshot({ path: `${outputDir}/${name}-journal.png` })
  } else {
    await page.screenshot({ path: `${outputDir}/${name}-playing.png` })
  }

  assert.deepEqual(pageErrors, [], `${name}: uncaught page errors: ${pageErrors.join('; ')}`)
  await context.close()
}

async function completeOpeningTutorial(page) {
  await page.getByRole('button', { name: /我想拜入宗门/ }).click()
  await page.getByRole('button', { name: /先看看青禾周遭的路脉/ }).click()
  await page.locator('.v3-panel-full').waitFor({ state: 'attached' })
  assert.equal(await page.locator('.story-overlay').isVisible(), true, 'story disappeared after opening the map')

  await page.getByRole('button', { name: /把护身和口粮先收下/ }).click()
  await page.getByRole('button', { name: /去青禾找一家势力挂靠/ }).click()
  await page.locator('.story-choice-button--finish').click()
}

async function hasHorizontalOverflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
}

async function assertInsideViewport(page, selector) {
  const box = await page.locator(selector).first().boundingBox()
  assert.ok(box, `${selector} has no bounding box`)
  const viewport = page.viewportSize()
  assert.ok(viewport, 'viewport is unavailable')
  assert.ok(box.x >= -1, `${selector} overflows left (${box.x})`)
  assert.ok(box.y >= -1, `${selector} overflows top (${box.y})`)
  assert.ok(box.x + box.width <= viewport.width + 1, `${selector} overflows right (${box.x + box.width} > ${viewport.width})`)
  assert.ok(box.y + box.height <= viewport.height + 1, `${selector} overflows bottom (${box.y + box.height} > ${viewport.height})`)
}
