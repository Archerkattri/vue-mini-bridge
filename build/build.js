const fs = require('fs')
const path = require('path')
const zlib = require('zlib')
const { rollup } = require('rollup')
const uglify = require('uglify-js')

if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist')
}

let builds = require('./config').getAllBuilds()

// filter builds via command line arg
if (process.argv[2]) {
  const filters = process.argv[2].split(',')
  builds = builds.filter(b => {
    // fix the project name === floder name
    // return filters.some(f => b.output.file.indexOf(f) > -1)
    return filters.some(f => b.output.file.slice(path.resolve(__dirname, '../').length).indexOf(f) > -1)
  })
} else {
  // filter out weex builds by default
  builds = builds.filter(b => {
    return b.output.file.indexOf('weex') === -1
  })
}

build(builds)

function build (builds) {
  let built = 0
  const total = builds.length
  const next = () => {
    buildEntry(builds[built]).then(() => {
      built++
      if (built < total) {
        next()
      }
    }).catch(logError)
  }

  next()
}

function buildEntry (config) {
  const isProd = /min\.js$/.test(config.output.file)
  return rollup(config)
    .then(bundle => bundle.generate(config.output))
    .then(({ output }) => {
      const code = output[0].code
      if (isProd) {
        const minified = uglify.minify(code, {
          output: {
            ascii_only: true
          },
          compress: {
            pure_funcs: ['makeMap']
          }
        })
        if (minified.error) {
          throw minified.error
        }
        return write(config.output.file, (config.output.banner ? config.output.banner + '\n' : '') + minified.code, true)
      } else {
        return write(config.output.file, code)
      }
    })
}

function write (dest, code, zip) {
  return new Promise((resolve, reject) => {
    function report (extra) {
      console.log(blue(path.relative(process.cwd(), dest)) + ' ' + getSize(code) + (extra || ''))
      resolve()
    }

    fs.writeFile(dest, code, err => {
      if (err) return reject(err)
      if (zip) {
        zlib.gzip(code, (err, zipped) => {
          if (err) return reject(err)
          report(' (gzipped: ' + getSize(zipped) + ')')
        })
      } else {
        report()
      }
    })
  })
}

function getSize (code) {
  return (code.length / 1024).toFixed(2) + 'kb'
}

function logError (e) {
  // Surface build failures to the shell: without a non-zero exit code a
  // failed rollup bundle would still report success to CI on modern Node.
  process.exitCode = 1
  console.log(e)
}

function blue (str) {
  return '\x1b[1m\x1b[34m' + str + '\x1b[39m\x1b[22m'
}
