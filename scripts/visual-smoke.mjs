import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { chromium } from 'playwright-core'

// 默认直接以 file:// 打开发布包，顺带验证“双击 dist/index.html 可玩”；也可用 FANCHEN_URL 指向开发或预览服务。
const baseUrl = process.env.FANCHEN_URL || pathToFileURL(resolve('dist/index.html')).href
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
  await verifyViewport('phone-landscape', { width: 844, height: 390 })
  await verifyPortraitHint({ width: 390, height: 844 })
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
  await page.goto(baseUrl, { waitUntil: 'load' })

  await page.getByRole('button', { name: /踏入凡尘/ }).click()
  await page.getByRole('button', { name: '入世' }).click()

  // 开场是一卷事件：选择之前，时间不走。
  await page.locator('.event-scroll').first().waitFor({ state: 'visible' })
  await assertInsideViewport(page, '.event-scroll')
  assert.ok(await page.locator('.event-choice').count() >= 2, `${name}: opening should offer choices`)
  assert.equal(await hasHorizontalOverflow(page), false, `${name}: opening screen has horizontal overflow`)
  const timeBefore = await page.locator('.top-bar__time').textContent()
  await page.waitForTimeout(3_000)
  assert.equal(await page.locator('.top-bar__time').textContent(), timeBefore, `${name}: time passed without the player doing anything`)
  await page.screenshot({ path: `${outputDir}/${name}-opening.png` })

  await page.locator('.event-choice').first().click()
  await page.locator('.event-scroll__continue').click()
  await page.waitForFunction(() => !document.querySelector('.event-scroll'))
  for (const selector of ['.top-bar', '.character-card', '.objective-card', '.local-panel', '.action-dock']) {
    await assertInsideViewport(page, selector)
  }
  assert.equal(await hasHorizontalOverflow(page), false, `${name}: gameplay screen has horizontal overflow`)
  assert.equal(await sceneHasInk(page), true, `${name}: scene canvas rendered nothing`)

  // 做一件事：练体，选最短的时长，做完要务卡上记下“刚才”。
  await page.locator('.action-btn', { hasText: '练体' }).click()
  await page.locator('.duration-pop__option').first().click()
  await page.locator('.objective-card__milestone-title', { hasText: '练体' }).waitFor({ state: 'visible' })
  await page.waitForTimeout(450)
  await page.screenshot({ path: `${outputDir}/${name}-after-training.png` })

  await page.keyboard.press('j')
  await page.locator('.book').waitFor({ state: 'visible' })
  assert.match(await page.locator('.book__title').textContent(), /纪事/, `${name}: J should open the chronicle book`)
  await assertInsideViewport(page, '.book')
  await page.waitForTimeout(450)
  await page.screenshot({ path: `${outputDir}/${name}-chronicle.png` })
  await page.keyboard.press('Escape')

  await page.keyboard.press('m')
  await page.locator('.book').waitFor({ state: 'visible' })
  assert.match(await page.locator('.book__title').textContent(), /山河/, `${name}: M should open the map book`)
  await assertInsideViewport(page, '.book')
  await page.waitForTimeout(450)
  await page.screenshot({ path: `${outputDir}/${name}-map.png` })
  await page.keyboard.press('Escape')

  assert.deepEqual(pageErrors, [], `${name}: uncaught page errors: ${pageErrors.join('; ')}`)
  await context.close()
}

async function verifyPortraitHint(viewport) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 })
  const page = await context.newPage()
  await page.addInitScript(() => localStorage.clear())
  await page.goto(baseUrl, { waitUntil: 'load' })
  await page.locator('.rotate-hint').waitFor({ state: 'visible' })
  assert.equal(await hasHorizontalOverflow(page), false, 'portrait: rotate hint has horizontal overflow')
  await page.screenshot({ path: `${outputDir}/phone-portrait.png` })
  await context.close()
}

async function hasHorizontalOverflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
}

/** 场景画布里要真有墨色：取中间一条像素，明暗差不能太小。 */
async function sceneHasInk(page) {
  return page.locator('.scene-view__canvas').evaluate(canvas => {
    const ctx = canvas.getContext('2d')
    if (!ctx || !canvas.width || !canvas.height) return false
    const row = ctx.getImageData(0, Math.floor(canvas.height * 0.6), canvas.width, 1).data
    let min = 255
    let max = 0
    for (let i = 0; i < row.length; i += 4) {
      const lum = (row[i] + row[i + 1] + row[i + 2]) / 3
      min = Math.min(min, lum)
      max = Math.max(max, lum)
    }
    return max - min > 12
  })
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
