const hash = require('hash-sum')
const uniq = require('lodash.uniq')
import { isJS } from './util'

const assetName = asset => typeof asset === 'string' ? asset : asset.name

export default class VueSSRClientPlugin {
  constructor (options = {}) {
    this.options = Object.assign({
      filename: 'vue-ssr-client-manifest.json'
    }, options)
  }

  apply (compiler) {
    compiler.hooks.thisCompilation.tap('VueSSRClientPlugin', compilation => {
      compilation.hooks.processAssets.tapPromise(
        {
          name: 'VueSSRClientPlugin',
          stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_SUMMARIZE
        },
        () => {
          const stats = compilation.getStats().toJson()

          const allFiles = uniq(stats.assets
            .map(a => a.name))

          const initialFiles = uniq(Object.keys(stats.entrypoints)
            .map(name => stats.entrypoints[name].assets.map(assetName))
            .reduce((assets, all) => all.concat(assets), [])
            .filter(isJS))

          const asyncFiles = allFiles
            .filter(isJS)
            .filter(file => initialFiles.indexOf(file) < 0)

          const manifest = {
            publicPath: stats.publicPath,
            all: allFiles,
            initial: initialFiles,
            async: asyncFiles,
            modules: { /* [identifier: string]: Array<index: number> */ }
          }

          const assetModules = stats.modules.filter(m => m.assets.length)
          const fileToIndex = file => manifest.all.indexOf(file)
          stats.modules.forEach(m => {
            // ignore modules duplicated in multiple chunks
            if (m.chunks.length === 1) {
              const cid = m.chunks[0]
              const chunk = stats.chunks.find(c => c.id === cid)
              if (!chunk || !chunk.files) {
                return
              }
              const files = manifest.modules[hash(m.identifier)] = chunk.files.map(fileToIndex)
              // find all asset files (css, images, fonts) in the same chunk
              const auxFiles = chunk.auxiliaryFiles || []
              auxFiles.forEach(f => {
                files.push(fileToIndex(f))
              })
              // find all asset modules associated with the same chunk
              assetModules.forEach(m => {
                if (m.chunks.some(id => id === cid)) {
                  files.push.apply(files, m.assets.map(fileToIndex))
                }
              })
            }
          })

          // const debug = (file, obj) => {
          //   require('fs').writeFileSync(__dirname + '/' + file, JSON.stringify(obj, null, 2))
          // }
          // debug('stats.json', stats)
          // debug('client-manifest.json', manifest)

          const json = JSON.stringify(manifest, null, 2)
          const { RawSource } = compiler.webpack.sources
          compilation.emitAsset(this.options.filename, new RawSource(json))
          return Promise.resolve()
        }
      )
    })
  }
}
