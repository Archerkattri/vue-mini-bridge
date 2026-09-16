var vueVersion
try {
  vueVersion = require('vue-mini-bridge/package.json').version
} catch (e) {
  try {
    vueVersion = require('../mpvue/package.json').version
  } catch (e) {
    vueVersion = null
  }
}

var packageName = require('./package.json').name
var packageVersion = require('./package.json').version
if (vueVersion && vueVersion !== packageVersion) {
  throw new Error(
    '\n\nVue packages version mismatch:\n\n' +
    '- vue@' + vueVersion + '\n' +
    '- ' + packageName + '@' + packageVersion + '\n\n' +
    'This may cause things to work incorrectly. Make sure to use the same version for both.\n' +
    'If you are using mpvue-loader, re-installing them should bump ' + packageName + ' to the latest.\n'
  )
}

module.exports = require('./build')
