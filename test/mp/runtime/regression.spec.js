const { createInstance } = require('../helpers/index')
const { compile, compileToMPML } = require('../../../packages/mpvue-template-compiler')

// Focused regression coverage for the maintained mini-program contract:
// lifecycle cascades, slot event forwarding, prop updates, minimal setData
// payloads, and deterministic compiler output.
describe('regression', function () {
  it('cascades hide/unload lifecycle to child components', function () {
    const calls = []
    const warpOptions = {
      onHide () {
        calls.push('warp:hide')
      },
      onUnload () {
        calls.push('warp:unload')
      },
      render () {
        var _vm = this
        var _h = _vm.$createElement
        var _c = _vm._self._c || _h
        return _c('div', {
          staticClass: 'container'
        }, [_vm._v('warp component')], 1)
      }
    }
    const options = {
      components: {
        warp: warpOptions
      },
      onHide () {
        calls.push('root:hide')
      },
      onUnload () {
        calls.push('root:unload')
      },
      render () {
        var _vm = this
        var _h = _vm.$createElement
        var _c = _vm._self._c || _h
        return _c('div', {
          staticClass: 'container'
        }, [_c('warp')], 1)
      }
    }
    const app = createInstance(options)
    app.$mount()

    // onHide detaches the page handle, so keep a reference for the unload step
    const page = app.$mp.page
    page._callHook('onHide')
    expect(app.$mp.status).toEqual('hide')
    expect(calls).toEqual(['root:hide', 'warp:hide'])

    page._callHook('onUnload')
    expect(app.$mp.status).toEqual('unload')
    expect(calls).toEqual(['root:hide', 'warp:hide', 'root:unload', 'warp:unload'])
    expect(app.$mp.page).toEqual(null)
  })

  it('forwards events from slot content', function () {
    const seen = []
    const warpOptions = {
      render () {
        var _vm = this
        var _h = _vm.$createElement
        var _c = _vm._self._c || _h
        return _c('div', {
          staticClass: 'container'
        }, [_vm._t('default')], 2)
      }
    }
    const options = {
      components: {
        warp: warpOptions
      },
      methods: {
        onSlotClick (ev) {
          seen.push(ev.target.id)
        }
      },
      // <div class="container">
      //   <warp><p @click="onSlotClick">slot content</p></warp>
      // </div>
      render () {
        var _vm = this
        var _h = _vm.$createElement
        var _c = _vm._self._c || _h
        return _c('div', {
          staticClass: 'container'
        }, [_c('warp', [_c('p', {
          attrs: {
            'eventid': '0'
          },
          on: {
            'click': function ($event) {
              _vm.onSlotClick($event)
            }
          }
        }, [_vm._v('slot content')])])], 1)
      }
    }
    const app = createInstance(options)
    app.$mount()

    const dataset = { comkey: '0', eventid: '0' }
    const detail = { x: 1, y: 2 }
    const ev = {
      type: 'tap',
      timeStamp: 100,
      target: { id: 'slotTarget', dataset: dataset },
      currentTarget: { id: 'slotTarget', dataset: dataset },
      detail: detail,
      touches: []
    }
    app.$mp.page._callHook('handleProxy', ev)
    expect(seen).toEqual(['slotTarget'])
  })

  it('propagates parent data changes to child props', function (done) {
    const cardOptions = {
      props: ['info'],
      render () {
        var _vm = this
        var _h = _vm.$createElement
        var _c = _vm._self._c || _h
        return _c('div', {
          staticClass: 'container'
        }, [_vm._v(_vm._s(_vm.info))])
      }
    }
    const options = {
      components: {
        card: cardOptions
      },
      data () {
        return {
          msg: 233
        }
      },
      render () {
        var _vm = this
        var _h = _vm.$createElement
        var _c = _vm._self._c || _h
        return _c('div', {
          staticClass: 'container'
        }, [_c('card', {
          attrs: {
            'info': _vm.msg,
            'mpcomid': '0'
          }
        })], 1)
      }
    }
    const app = createInstance(options)
    app.$mount()

    setTimeout(function () {
      expect(app.$mp.page.data['$root']['0_0'].info).toEqual(233)
      app.msg = 999
      setTimeout(function () {
        expect(app.$mp.page.data['$root']['0'].msg).toEqual(999)
        expect(app.$mp.page.data['$root']['0_0'].info).toEqual(999)
        done()
      }, 300)
    }, 300)
  })

  it('sends only changed key paths on update', function (done) {
    const options = {
      data () {
        return {
          msg: 233
        }
      },
      render () {
        var _vm = this
        var _h = _vm.$createElement
        var _c = _vm._self._c || _h
        return _c('div', {
          staticClass: 'container'
        }, [_c('p', [_vm._v(_vm._s(_vm.msg))])], 1)
      }
    }
    const app = createInstance(options)
    app.$mount()

    setTimeout(function () {
      const calls = []
      const page = app.$mp.page
      const origSetData = page.setData.bind(page)
      page.setData = function (obj) {
        calls.push(obj)
        return origSetData(obj)
      }
      app.msg = 666
      setTimeout(function () {
        expect(calls.length).toBeGreaterThan(0)
        calls.forEach(function (call) {
          Object.keys(call).forEach(function (key) {
            expect(key.indexOf('$root.0.') === 0).toEqual(true)
          })
        })
        expect(Object.assign.apply(null, [{}].concat(calls))).toEqual({
          '$root.0.msg': 666
        })
        expect(page.data['$root']['0'].msg).toEqual(666)
        done()
      }, 300)
    }, 300)
  })

  it('compiles the same template deterministically', function () {
    const template = '<div><p v-for="item in list" @click="clickHandle">{{item}}</p></div>'
    const first = compileToMPML(compile(template, {}), { name: 'a' })
    const second = compileToMPML(compile(template, {}), { name: 'a' })
    expect(second.code).toEqual(first.code)
    expect(Object.keys(second.slots)).toEqual(Object.keys(first.slots))
    expect(second.compiled.errors).toEqual(first.compiled.errors)
  })
})
