const buble = require('buble')
const flowRemoveTypes = require('flow-remove-types-no-whitespace')

// Local rollup plugins replacing the unmaintained rollup-plugin-buble and
// rollup-plugin-flow-no-whitespace wrappers. Same libraries, same transforms,
// compatible with the modern rollup plugin API.

// Strips Flow type annotations, preserving line/column layout the same way
// the old pipeline did (needed for stable build output).
function flow () {
  return {
    name: 'flow-remove-types',
    transform (code, id) {
      // Skip virtual modules (e.g. commonjs helpers): they are already
      // plain JS and may use syntax newer than our transpilers parse.
      if (!id || id.charCodeAt(0) === 0) return null
      return flowRemoveTypes(code)
    }
  }
}

// Transpiles ES2015+ down to ES5 for the dist bundles. Module statements
// are left to rollup, exactly like the old rollup-plugin-buble wrapper did.
function bubleTransform (options) {
  options = Object.assign(
    { transforms: { modules: false }},
    options
  )
  return {
    name: 'buble',
    transform (code, id) {
      if (!id || id.charCodeAt(0) === 0) return null
      if (!/\.(js|mjs)$/.test(id.split('?')[0])) return null
      const result = buble.transform(code, options)
      return { code: result.code, map: result.map }
    }
  }
}

module.exports = { flow, bubleTransform }
