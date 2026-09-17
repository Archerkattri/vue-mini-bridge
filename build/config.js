const path = require('path')
const alias = require('@rollup/plugin-alias')
const cjs = require('@rollup/plugin-commonjs')
const replace = require('@rollup/plugin-replace')
const node = require('@rollup/plugin-node-resolve')
const { flow, bubleTransform } = require('./rollup-plugins')
const version = process.env.VERSION || require('../package.json').version
const weexVersion = process.env.WEEX_VERSION || require('../packages/weex-vue-framework/package.json').version
const mpVueVersion = process.env.MP_VUE_VERSION || require('../packages/mpvue/package.json').version

// Deterministic banner year: SOURCE_DATE_EPOCH pins the year for reproducible
// builds (https://reproducible-builds.org/specs/source-date-epoch/).
const bannerYear = process.env.SOURCE_DATE_EPOCH
  ? new Date(parseInt(process.env.SOURCE_DATE_EPOCH, 10) * 1000).getUTCFullYear()
  : new Date().getFullYear()

const banner =
  '/*!\n' +
  ' * Vue.js v' + version + '\n' +
  ' * (c) 2014-' + bannerYear + ' Evan You\n' +
  ' * Released under the MIT License.\n' +
  ' */'

const { mpBanner, mpLifecycleHooks } = require('../src/platforms/mp/join-code-in-build')

const weexFactoryPlugin = {
  name: 'weex-factory',
  intro () {
    return 'module.exports = function weexFactory (exports, renderer) {'
  },
  outro () {
    return '}'
  }
}

const aliases = require('./alias')
const resolve = p => {
  const base = p.split('/')[0]
  if (aliases[base]) {
    return path.resolve(aliases[base], p.slice(base.length + 1))
  } else {
    return path.resolve(__dirname, '../', p)
  }
}

const builds = {
  // Runtime only (CommonJS). Used by bundlers e.g. Webpack & Browserify
  'web-runtime-cjs': {
    entry: resolve('web/entry-runtime.js'),
    dest: resolve('dist/vue.runtime.common.js'),
    format: 'cjs',
    banner
  },
  // Runtime+compiler CommonJS build (CommonJS)
  'web-full-cjs': {
    entry: resolve('web/entry-runtime-with-compiler.js'),
    dest: resolve('dist/vue.common.js'),
    format: 'cjs',
    alias: { he: './entity-decoder' },
    banner
  },
  // Runtime only (ES Modules). Used by bundlers that support ES Modules,
  // e.g. Rollup & Webpack 2
  'web-runtime-esm': {
    entry: resolve('web/entry-runtime.js'),
    dest: resolve('dist/vue.runtime.esm.js'),
    format: 'es',
    banner
  },
  // Runtime+compiler CommonJS build (ES Modules)
  'web-full-esm': {
    entry: resolve('web/entry-runtime-with-compiler.js'),
    dest: resolve('dist/vue.esm.js'),
    format: 'es',
    alias: { he: './entity-decoder' },
    banner
  },
  // runtime-only build (Browser)
  'web-runtime-dev': {
    entry: resolve('web/entry-runtime.js'),
    dest: resolve('dist/vue.runtime.js'),
    format: 'umd',
    env: 'development',
    banner
  },
  // runtime-only production build (Browser)
  'web-runtime-prod': {
    entry: resolve('web/entry-runtime.js'),
    dest: resolve('dist/vue.runtime.min.js'),
    format: 'umd',
    env: 'production',
    banner
  },
  // Runtime+compiler development build (Browser)
  'web-full-dev': {
    entry: resolve('web/entry-runtime-with-compiler.js'),
    dest: resolve('dist/vue.js'),
    format: 'umd',
    env: 'development',
    alias: { he: './entity-decoder' },
    banner
  },
  // Runtime+compiler production build  (Browser)
  'web-full-prod': {
    entry: resolve('web/entry-runtime-with-compiler.js'),
    dest: resolve('dist/vue.min.js'),
    format: 'umd',
    env: 'production',
    alias: { he: './entity-decoder' },
    banner
  },
  // Web compiler (CommonJS).
  'web-compiler': {
    entry: resolve('web/entry-compiler.js'),
    dest: resolve('packages/vue-template-compiler/build.js'),
    format: 'cjs',
    external: Object.keys(require('../packages/vue-template-compiler/package.json').dependencies)
  },
  // Web server renderer (CommonJS).
  'web-server-renderer': {
    entry: resolve('web/entry-server-renderer.js'),
    dest: resolve('packages/vue-server-renderer/build.js'),
    format: 'cjs',
    external: Object.keys(require('../packages/vue-server-renderer/package.json').dependencies)
  },
  'web-server-basic-renderer': {
    entry: resolve('web/entry-server-basic-renderer.js'),
    dest: resolve('packages/vue-server-renderer/basic.js'),
    format: 'umd',
    env: 'development',
    moduleName: 'renderVueComponentToString',
    plugins: [node(), cjs()]
  },
  'web-server-renderer-webpack-server-plugin': {
    entry: resolve('server/webpack-plugin/server.js'),
    dest: resolve('packages/vue-server-renderer/server-plugin.js'),
    format: 'cjs',
    external: Object.keys(require('../packages/vue-server-renderer/package.json').dependencies)
  },
  'web-server-renderer-webpack-client-plugin': {
    entry: resolve('server/webpack-plugin/client.js'),
    dest: resolve('packages/vue-server-renderer/client-plugin.js'),
    format: 'cjs',
    external: Object.keys(require('../packages/vue-server-renderer/package.json').dependencies)
  },
  // Weex runtime factory
  'weex-factory': {
    weex: true,
    entry: resolve('weex/entry-runtime-factory.js'),
    dest: resolve('packages/weex-vue-framework/factory.js'),
    format: 'cjs',
    plugins: [weexFactoryPlugin]
  },
  // Weex runtime framework (CommonJS).
  'weex-framework': {
    weex: true,
    entry: resolve('weex/entry-framework.js'),
    dest: resolve('packages/weex-vue-framework/index.js'),
    format: 'cjs'
  },
  // Weex compiler (CommonJS). Used by Weex's Webpack loader.
  'weex-compiler': {
    weex: true,
    entry: resolve('weex/entry-compiler.js'),
    dest: resolve('packages/weex-template-compiler/build.js'),
    format: 'cjs',
    external: Object.keys(require('../packages/weex-template-compiler/package.json').dependencies)
  },
  // Runtime only (ES Modules). Used by bundlers that support ES Modules,
  // e.g. Rollup & Webpack 2
  'mpvue': {
    mp: true,
    entry: resolve('mp/entry-runtime.js'),
    dest: resolve('packages/mpvue/index.js'),
    format: 'umd',
    exports: 'default',
    env: 'production',
    banner: mpBanner
  },
  // MP compiler (CommonJS). Used by mpvue's Webpack loader.
  'mpvue-template-compiler': {
    mp: true,
    entry: resolve('mp/entry-compiler.js'),
    dest: resolve('packages/mpvue-template-compiler/build.js'),
    format: 'cjs',
    external: Object.keys(require('../packages/mpvue-template-compiler/package.json').dependencies)
  }
}

// The modern replace plugin defaults to word-boundary delimiters and warns
// about assignment guards; the old pipeline replaced bare substrings, so
// replicate that exactly.
function replaceValues (values) {
  return replace({
    values,
    delimiters: ['', ''],
    preventAssignment: false
  })
}

function genConfig (opts) {
  const aliasMap = Object.assign({}, aliases, opts.alias)
  const config = {
    input: opts.entry,
    external: opts.external,
    plugins: [
      replaceValues({
        __WEEX__: !!opts.weex,
        __MPVUE__: !!opts.mp,
        __WEEX_VERSION__: weexVersion,
        __MPVUE_VERSION__: mpVueVersion,
        __VERSION__: version
      }),
      flow(),
      bubleTransform(),
      alias({
        entries: Object.keys(aliasMap).map(find => ({
          find,
          replacement: aliasMap[find]
        }))
      })
    ].concat(opts.plugins || []),
    output: {
      file: opts.dest,
      format: opts.format,
      exports: opts.exports,
      banner: opts.banner,
      name: opts.moduleName || 'Vue'
    }
  }

  if (opts.env) {
    config.plugins.push(replaceValues({
      'process.env.NODE_ENV': JSON.stringify(opts.env)
    }))
  }

  // hack fix MP LIFECYCLE_HOOKS
  if (opts.mp) {
    config.plugins.push(replaceValues({
      "'deactivated'": `'deactivated', ${mpLifecycleHooks}`
    }))
    config.plugins.push(replaceValues({
      'inBrowser && window.navigator.userAgent.toLowerCase': `['mpvue-runtime'].join`
    }))
  }

  return config
}

if (process.env.TARGET) {
  module.exports = genConfig(builds[process.env.TARGET])
} else {
  exports.getBuild = name => genConfig(builds[name])
  exports.getAllBuilds = () => Object.keys(builds).map(name => genConfig(builds[name]))
}
