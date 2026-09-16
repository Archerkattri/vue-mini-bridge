const matchOperatorsRe = /[|\\{}()[\]^$+*?.]/g
function strToRegExp (str) {
  return new RegExp(str.replace(matchOperatorsRe, '\\$&'))
}

// runtime
// fix mp env
const runtime = require('./mp.runtime')
const { App, Page, getApp, Component } = runtime
global.App = App
global.Page = Page
global.getApp = getApp
global.Component = Component

const Vue = require('../../../packages/mpvue')

function createInstance (options) {
  const instance = new Vue(options)
  const mpType = options.mpType || 'page'

  Vue.createMP({
    mpType,
    init () {
      return instance
    }
  })

  const nativeInstance = mpType === 'app'
    ? getApp()
      : mpType === 'component'
        ? runtime.getComponent()
        : runtime.getPage()

  const mount = instance.$mount
  let started = false
  let starting = false
  instance.$mount = function (el, hydrating) {
    if (starting) {
      return mount.call(this, el, hydrating)
    }
    if (!started) {
      started = true
      starting = true
      nativeInstance._initLifecycle()
      starting = false
    }
    return this
  }

  return instance
}

module.exports = {
  strToRegExp,
  createInstance
}
