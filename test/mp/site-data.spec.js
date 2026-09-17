const fs = require('fs')
const path = require('path')
const { generate } = require('../../scripts/build-site-data.cjs')

const root = path.join(__dirname, '..', '..')

function readAsset (relPath) {
  return fs.readFileSync(path.join(root, relPath))
}

describe('site data', () => {
  it('matches a fresh compile from the template compiler', () => {
    const committed = JSON.parse(readAsset('support/playground-data.json').toString())
    expect(generate()).toEqual(committed)
  })

  it('pins versions that exist in the repo', () => {
    const committed = JSON.parse(readAsset('support/playground-data.json').toString())
    const bridgePkg = JSON.parse(readAsset('package.json').toString())
    const compilerPkg = JSON.parse(readAsset('packages/mpvue-template-compiler/package.json').toString())
    expect(committed.versions.bridge).toEqual(bridgePkg.version)
    expect(committed.versions.compiler).toEqual(compilerPkg.version)
  })
})

describe('site assets', () => {
  it('ships the playground GIFs', () => {
    for (const relPath of ['docs/playground-demo.gif', 'docs/playground-demo-dark.gif']) {
      const bytes = readAsset(relPath)
      expect(bytes.length).toBeGreaterThan(1024)
      expect(bytes.slice(0, 6).toString()).toEqual('GIF89a')
    }
  })

  it('ships the screenshots', () => {
    const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    for (const relPath of ['docs/shot-hero.png', 'docs/shot-platforms.png', 'docs/shot-pipeline.png']) {
      const bytes = readAsset(relPath)
      expect(bytes.length).toBeGreaterThan(1024)
      expect(bytes.slice(0, 8).equals(pngSignature)).toEqual(true)
    }
  })
})
