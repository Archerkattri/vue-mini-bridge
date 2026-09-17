// Captures the README playground GIFs and screenshots from the live site.
// Run: node test/capture-site.cjs
// Needs playwright, gifenc, and pngjs resolvable (npm install -D, or
// NODE_PATH pointing at a tree that has them, e.g. the progressbeam repo).
// Output: docs/playground-demo.gif, docs/playground-demo-dark.gif,
// docs/shot-hero.png, docs/shot-platforms.png, docs/shot-pipeline.png
const fs = require('node:fs')
const http = require('node:http')
const path = require('node:path')

let PNG, GIFEncoder, quantize, chromium
try {
  PNG = require('pngjs').PNG
  const gifenc = require('gifenc')
  GIFEncoder = gifenc.GIFEncoder
  quantize = gifenc.quantize
  chromium = require('playwright').chromium
} catch (error) {
  console.error('capture: missing dependency. Install playwright, gifenc, pngjs first:')
  console.error('  npm install -D playwright gifenc pngjs')
  process.exit(1)
}

// Exact nearest-color mapping. gifenc's applyPalette caches by reduced-
// precision bin, so distinct colors in one bin inherit the first pixel's
// mapping — invisible in photos, but it shifts flat UI colors systematically.
// Exact 24-bit cache keys keep the mapping correct and still fast.
function nearestIndex (r, g, b, palette) {
  // Starts at 1: slot 0 is the reserved transparent dummy.
  let best = 1
  let bestDist = Infinity
  for (let i = 1; i < palette.length; i += 1) {
    const c = palette[i]
    const dist = (r - c[0]) * (r - c[0]) + (g - c[1]) * (g - c[1]) + (b - c[2]) * (b - c[2])
    if (dist < bestDist) {
      bestDist = dist
      best = i
    }
  }
  return best
}

function mapExact (data, palette, cache) {
  const index = new Uint8Array(data.length >> 2)
  for (let p = 0; p < data.length; p += 4) {
    const key = (data[p] << 16) | (data[p + 1] << 8) | data[p + 2]
    let idx = cache.get(key)
    if (idx === undefined) {
      idx = nearestIndex(data[p], data[p + 1], data[p + 2], palette)
      cache.set(key, idx)
    }
    index[p >> 2] = idx
  }
  return index
}

const root = path.resolve(__dirname, '..')
const port = 4175
const baseUrl = `http://127.0.0.1:${port}/index.html`
const fps = 6
const frameMs = 1000 / fps
const colors = 64
// [atMs, tabList, index] — cycles targets, then examples.
const schedule = [
  [300, '#platform-tabs', 1],
  [1500, '#platform-tabs', 2],
  [2700, '#platform-tabs', 3],
  [3900, '#platform-tabs', 0],
  [5100, '#example-tabs', 1],
  [6800, '#platform-tabs', 3],
  [8500, '#example-tabs', 2],
  [10200, '#platform-tabs', 0]
]
const endMs = 12000

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
}

function startServer () {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent(req.url.split('?')[0])
      const filePath = path.normalize(path.join(root, urlPath === '/' ? 'index.html' : urlPath))
      if (!filePath.startsWith(root) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        res.writeHead(404, { 'content-type': 'text/plain' })
        res.end('not found')
        return
      }
      res.writeHead(200, { 'content-type': MIME[path.extname(filePath)] || 'application/octet-stream' })
      fs.createReadStream(filePath).pipe(res)
    })
    server.listen(port, '127.0.0.1', () => resolve(server))
  })
}

async function captureTheme (browser, theme, outFile) {
  const context = await browser.newContext({
    viewport: { width: 900, height: 1000 },
    colorScheme: theme,
    deviceScaleFactor: 1
  })
  const page = await context.newPage()
  await page.goto(baseUrl)
  await page.waitForFunction(() => document.querySelectorAll('#platform-tabs button').length === 4)
  // Measure the panel at its tallest fixture so the clip never cuts output.
  await page.locator('#example-tabs button').nth(1).click()
  await page.locator('#platform-tabs button').nth(3).click()
  await page.evaluate(() => {
    const panel = document.querySelector('#playground .playground-panel')
    window.scrollTo({ top: panel.getBoundingClientRect().top + window.scrollY, behavior: 'instant' })
  })
  const box = await page.locator('#playground .playground-panel').boundingBox()
  await page.locator('#example-tabs button').nth(0).click()
  await page.locator('#platform-tabs button').nth(0).click()
  const clip = {
    x: 0,
    y: Math.max(0, Math.floor(box.y)),
    width: 900,
    height: Math.min(1000 - Math.floor(box.y), Math.ceil(box.height) + 4)
  }

  const frames = []
  const pending = schedule.slice()
  const started = Date.now()
  const totalFrames = Math.round(endMs / frameMs)
  for (let i = 0; i < totalFrames; i += 1) {
    const elapsed = Date.now() - started
    while (pending.length && pending[0][0] <= elapsed) {
      const [, list, index] = pending.shift()
      await page.locator(`${list} button`).nth(index).click()
    }
    frames.push(PNG.sync.read(await page.screenshot({ clip })))
    const wait = started + (i + 1) * frameMs - Date.now()
    if (wait > 0) await page.waitForTimeout(wait)
  }
  await context.close()
  console.log(`capture: ${theme} took ${frames.length} frames`)

  // One global palette sampled across states so colors stay stable. Slot 0
  // is a reserved dummy that no real pixel may use: it is the transparent
  // index, and giving it a real color would repaint every pixel of that
  // color wherever anything changes.
  const samples = [frames[0].data, frames[Math.floor(frames.length / 2)].data,
    frames[frames.length - 1].data]
  const combined = Buffer.concat(samples.map((data) => Buffer.from(data)))
  const palette = [[255, 0, 255, 255],
    ...quantize(combined, colors - 1, { format: 'rgba4444' })]
  // Unchanged pixels go transparent so static regions cost almost nothing.
  // Slot 0 stays unused by real pixels (nearestIndex starts at 1), so the
  // transparent index can never collide with a real color.
  const TRANSPARENT_INDEX = 0
  const gif = GIFEncoder()
  const colorCache = new Map()
  let prevData = null
  frames.forEach((frame, i) => {
    const index = mapExact(frame.data, palette, colorCache)
    if (i === 0) {
      gif.writeFrame(index, frame.width, frame.height, {
        palette,
        delay: frameMs,
        repeat: 0
      })
    } else {
      const data = frame.data
      for (let p = 0; p < data.length; p += 4) {
        if (data[p] === prevData[p] && data[p + 1] === prevData[p + 1] &&
            data[p + 2] === prevData[p + 2] && data[p + 3] === prevData[p + 3]) {
          index[p >> 2] = TRANSPARENT_INDEX
        }
      }
      gif.writeFrame(index, frame.width, frame.height, {
        delay: frameMs,
        transparent: true,
        transparentIndex: TRANSPARENT_INDEX,
        dispose: 1
      })
    }
    prevData = frame.data
  })
  gif.finish()
  fs.mkdirSync(path.dirname(outFile), { recursive: true })
  fs.writeFileSync(outFile, Buffer.from(gif.bytes()))
  console.log(`capture: wrote ${path.relative(root, outFile)} ` +
    `${(fs.statSync(outFile).size / 1024).toFixed(0)} KB`)
}

async function captureShots (browser) {
  const context = await browser.newContext({
    viewport: { width: 1200, height: 800 },
    colorScheme: 'light',
    deviceScaleFactor: 1
  })
  const page = await context.newPage()
  await page.goto(baseUrl)
  await page.waitForFunction(() => document.querySelectorAll('#platform-tabs button').length === 4)
  await page.screenshot({ path: path.join(root, 'docs', 'shot-hero.png') })
  await page.locator('.matrix-table').screenshot({ path: path.join(root, 'docs', 'shot-platforms.png') })
  await page.locator('.pipeline-figure').screenshot({ path: path.join(root, 'docs', 'shot-pipeline.png') })
  await context.close()
  console.log('capture: wrote docs/shot-hero.png docs/shot-platforms.png docs/shot-pipeline.png')
}

async function main () {
  const server = await startServer()
  try {
    const browser = await chromium.launch()
    try {
      await captureTheme(browser, 'light', path.join(root, 'docs', 'playground-demo.gif'))
      await captureTheme(browser, 'dark', path.join(root, 'docs', 'playground-demo-dark.gif'))
      await captureShots(browser)
    } finally {
      await browser.close()
    }
  } finally {
    server.close()
  }
}

main().catch((error) => {
  console.error(error.message || error)
  process.exit(1)
})
