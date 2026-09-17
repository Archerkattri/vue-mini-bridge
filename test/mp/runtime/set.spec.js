require('@babel/register')

// Minimal stand-in for the bundler's `shared/*` alias (the only bare import
// in the observer module closure) so the dev-mode src can load under plain
// node without webpack or a new dependency.
const Module = require('module')
const path = require('path')
const origResolveFilename = Module._resolveFilename
Module._resolveFilename = function (request, ...args) {
  if (request === 'shared' || request.startsWith('shared/')) {
    request = path.join(__dirname, '../../../src', request)
  }
  return origResolveFilename.call(this, request, ...args)
}

const Vue = require('../../../packages/mpvue')
// Dev-mode source: the shipped mpvue bundle is a production build where all
// Vue warnings are stripped, so the warn path is covered against src instead.
const { set, defineReactive } = require('../../../src/core/observer')

describe('Vue.set prototype pollution guard', function () {
  it('refuses __proto__ keys instead of polluting the prototype', function () {
    const obj = {}
    const val = { polluted: true }
    const result = Vue.set(obj, '__proto__', val)
    expect(result).toBe(val)
    expect(obj.polluted).toBeUndefined()
    expect({}.polluted).toBeUndefined()
    expect(Object.getPrototypeOf(obj)).toBe(Object.prototype)
  })

  it('leaves __proto__ data properties non-reactive', function () {
    const parsed = JSON.parse('{"__proto__":{"polluted":true},"ok":1}')
    const vm = new Vue({
      data () {
        return { nested: parsed }
      }
    })
    expect(vm.nested.ok).toBe(1)
    expect({}.polluted).toBeUndefined()
  })

  it('refuses constructor keys instead of shadowing them reactively', function () {
    const obj = {}
    const val = { polluted: true }
    expect(Vue.set(obj, 'constructor', val)).toBe(val)
    expect(obj.hasOwnProperty('constructor')).toBe(false)
    expect(obj.constructor).toBe(Object)
    expect(defineReactive({}, 'constructor', val)).toBeUndefined()
  })

  it('warns in development when refusing __proto__ writes', function () {
    spyOn(console, 'error')
    const val = { polluted: true }
    expect(set({}, '__proto__', val)).toBe(val)
    expect(defineReactive({}, '__proto__', val)).toBeUndefined()
    expect({}.polluted).toBeUndefined()
    expect(console.error).toHaveBeenCalled()
    expect(console.error.calls.argsFor(0)[0]).toMatch('prototype pollution')
  })
})
