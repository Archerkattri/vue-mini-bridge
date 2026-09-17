import path from 'path'
import webpack from 'webpack'
import { createFsFromVolume, Volume } from 'memfs'

export function compileWithWebpack (file, extraConfig, cb) {
  extraConfig = Object.assign({}, extraConfig)
  // Per-compile optimization tweaks (e.g. the client manifest chunk) merge
  // with these shared defaults instead of replacing them.
  extraConfig.optimization = Object.assign(
    {
      // Match historical chunk naming: async chunks come out as 0.js, 1.js.
      chunkIds: 'natural'
    },
    extraConfig.optimization
  )
  const config = Object.assign({
    mode: 'development',
    entry: path.resolve(__dirname, 'fixtures', file),
    module: {
      rules: [
        {
          test: /\.js$/,
          loader: 'babel-loader'
        },
        {
          test: /async-.*\.js$/,
          loader: require.resolve('./async-loader')
        },
        {
          test: /\.(png|woff2|css)$/,
          type: 'asset/resource',
          generator: {
            filename: '[name][ext]'
          }
        }
      ]
    }
  }, extraConfig)

  const compiler = webpack(config)
  const fs = createFsFromVolume(new Volume())
  compiler.outputFileSystem = fs

  compiler.run((err, stats) => {
    expect(err).toBeFalsy()
    expect(stats.hasErrors()).toBe(false)
    cb(fs)
  })
}
