import { validate, isJS } from './util'

const assetName = asset => typeof asset === 'string' ? asset : asset.name

export default class VueSSRServerPlugin {
  constructor (options = {}) {
    this.options = Object.assign({
      filename: 'vue-ssr-server-bundle.json'
    }, options)
  }

  apply (compiler) {
    validate(compiler)

    compiler.hooks.thisCompilation.tap('VueSSRServerPlugin', compilation => {
      compilation.hooks.processAssets.tapPromise(
        {
          name: 'VueSSRServerPlugin',
          stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_SUMMARIZE
        },
        () => {
          const stats = compilation.getStats().toJson()
          const entryName = Object.keys(stats.entrypoints)[0]
          const entryInfo = stats.entrypoints[entryName]

          if (!entryInfo) {
            // #5553
            return Promise.resolve()
          }

          const entryAssets = entryInfo.assets.map(assetName).filter(isJS)

          if (entryAssets.length > 1) {
            throw new Error(
              `Server-side bundle should have one single entry file. ` +
              `Avoid splitting the server bundle into multiple chunks.`
            )
          }

          const entry = entryAssets[0]
          if (!entry || typeof entry !== 'string') {
            throw new Error(
              `Entry "${entryName}" not found. Did you specify the correct entry option?`
            )
          }

          const bundle = {
            entry,
            files: {},
            maps: {}
          }

          // Note: sourcemap assets are not part of stats.assets, so collect
          // the emitted files from the compilation instead.
          compilation.getAssets().forEach(({ name, source }) => {
            if (name.match(/\.js$/)) {
              bundle.files[name] = source.source()
            } else if (name.match(/\.js\.map$/)) {
              bundle.maps[name.replace(/\.map$/, '')] = JSON.parse(source.source())
            }
            // do not emit anything else for server
            compilation.deleteAsset(name)
          })

          const json = JSON.stringify(bundle, null, 2)
          const filename = this.options.filename
          const { RawSource } = compiler.webpack.sources

          compilation.emitAsset(filename, new RawSource(json))
          return Promise.resolve()
        }
      )
    })
  }
}
