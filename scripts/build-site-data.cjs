'use strict'

/* Builds support/playground-data.json from the real template compiler.
 * The site renders these fixtures verbatim; test/mp/site-data.spec.js
 * recompiles and fails if the committed JSON drifts from compiler output. */

const fs = require('fs')
const path = require('path')

const repoRoot = path.resolve(__dirname, '..')
const compiler = require('../packages/mpvue-template-compiler')
const bridgePkg = require('../package.json')
const compilerPkg = require('../packages/mpvue-template-compiler/package.json')

const PLATFORMS = ['wx', 'swan', 'tt', 'my']

const EXAMPLES = [
  {
    id: 'counter',
    title: 'Counter',
    template: '<view class="counter"><text>{{count}}</text><button @click="add">Add one</button></view>'
  },
  {
    id: 'list',
    title: 'List + empty state',
    template: '<view><view v-for="item in items" :key="item.id"><text>{{item.name}}</text></view><view v-if="empty">No items yet</view></view>'
  },
  {
    id: 'form',
    title: 'Form + link',
    template: '<view><input v-model="query" placeholder="Search"/><a href="/pages/detail">Detail</a></view>'
  }
]

const DIRECTIVES = [
  { id: 'v-if', label: 'v-if', template: '<view><text v-if="ok">Visible</text></view>' },
  { id: 'v-for', label: 'v-for + :key', template: '<view><view v-for="item in items" :key="item.id">{{item.name}}</view></view>' },
  { id: 'click', label: '@click', template: '<view><button @click="go">Go</button></view>' },
  { id: 'v-model', label: 'v-model', template: '<view><input v-model="query"/></view>' },
  { id: 'href', label: '<a href>', template: '<view><a href="/pages/detail">Detail</a></view>' }
]

function compileFor (template, platform) {
  const compiled = compiler.compile(template, {})
  const output = compiler.compileToMPML(compiled, { name: 'demo' }, { platform })
  const errors = [].concat(output.compiled.errors || [], output.compiled.mpErrors || [])
  if (errors.length) {
    throw new Error(`compile failed for ${platform}: ${JSON.stringify(errors)}`)
  }
  return output.code
}

function generate () {
  const compileOne = (template) => {
    const out = {}
    for (const platform of PLATFORMS) {
      out[platform] = compileFor(template, platform)
    }
    return out
  }
  return {
    versions: {
      bridge: bridgePkg.version,
      compiler: compilerPkg.version
    },
    platforms: PLATFORMS,
    examples: EXAMPLES.map((example) => ({
      id: example.id,
      title: example.title,
      template: example.template,
      output: compileOne(example.template)
    })),
    directives: DIRECTIVES.map((directive) => ({
      id: directive.id,
      label: directive.label,
      template: directive.template,
      output: compileOne(directive.template)
    }))
  }
}

function outputPath () {
  return path.join(repoRoot, 'support', 'playground-data.json')
}

if (require.main === module) {
  const data = generate()
  fs.mkdirSync(path.dirname(outputPath()), { recursive: true })
  fs.writeFileSync(outputPath(), JSON.stringify(data, null, 2) + '\n')
  console.log(`wrote ${path.relative(repoRoot, outputPath())} (bridge ${data.versions.bridge}, compiler ${data.versions.compiler})`)
}

module.exports = { generate, outputPath, PLATFORMS }
