// import image and font
require('./test.css')
const font = require('./test.woff2')
const image = require('./test.png')

module.exports = {
  beforeCreate () {
    this.$vnode.ssrContext._registeredComponents.add('__MODULE_ID__')
  },
  render (h) {
    return h('div', `async ${font} ${image}`)
  }
}
