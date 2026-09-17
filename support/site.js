/* Playground + directive explorer. Renders the precompiled fixtures in
 * support/playground-data.json, which scripts/build-site-data.cjs generates
 * from the real template compiler. No compilation happens in the browser. */
(function () {
  'use strict'

  var PLATFORM_NAMES = { wx: 'WeChat', swan: 'Baidu', tt: 'ByteDance', my: 'Alipay' }
  var state = { example: 0, platform: 'wx', directive: 0 }
  var data = null

  function el (id) {
    return document.getElementById(id)
  }

  function setCode (id, text) {
    var node = el(id)
    node.textContent = ''
    var code = document.createElement('code')
    code.textContent = text
    node.appendChild(code)
  }

  function buildTabs (containerId, items, activeIndex, onPick) {
    var container = el(containerId)
    container.textContent = ''
    items.forEach(function (item, index) {
      var button = document.createElement('button')
      button.type = 'button'
      button.setAttribute('role', 'tab')
      button.setAttribute('aria-selected', index === activeIndex ? 'true' : 'false')
      button.textContent = item
      button.addEventListener('click', function () {
        onPick(index)
      })
      container.appendChild(button)
    })
  }

  function renderPlayground () {
    var example = data.examples[state.example]
    buildTabs('example-tabs', data.examples.map(function (item) { return item.title }), state.example, function (index) {
      state.example = index
      renderPlayground()
    })
    var labels = data.platforms.map(function (platform) {
      return (PLATFORM_NAMES[platform] || platform) + ' · ' + platform
    })
    buildTabs('platform-tabs', labels, data.platforms.indexOf(state.platform), function (index) {
      state.platform = data.platforms[index]
      renderPlayground()
    })
    setCode('pg-input', example.template)
    setCode('pg-output', example.output[state.platform])
    el('pg-output-label').textContent = state.platform
    el('pg-note').textContent = 'Compiled at build time with vue-mini-bridge-template-compiler ' +
      data.versions.compiler + ' (bridge ' + data.versions.bridge + ') via compile() + compileToMPML().'
  }

  function renderDirectives () {
    var directive = data.directives[state.directive]
    buildTabs('directive-tabs', data.directives.map(function (item) { return item.label }), state.directive, function (index) {
      state.directive = index
      renderDirectives()
    })
    setCode('dx-input', directive.template)
    var outputs = el('dx-outputs')
    outputs.textContent = ''
    data.platforms.forEach(function (platform) {
      var block = document.createElement('div')
      block.className = 'code-block'
      var head = document.createElement('div')
      head.className = 'code-head'
      var name = document.createElement('span')
      name.textContent = (PLATFORM_NAMES[platform] || platform)
      var tag = document.createElement('span')
      tag.textContent = platform
      head.appendChild(name)
      head.appendChild(tag)
      var pre = document.createElement('pre')
      pre.style.whiteSpace = 'pre-wrap'
      pre.style.wordBreak = 'break-word'
      var code = document.createElement('code')
      code.textContent = directive.output[platform]
      pre.appendChild(code)
      block.appendChild(head)
      block.appendChild(pre)
      outputs.appendChild(block)
    })
  }

  function renderVersions () {
    var nodes = document.querySelectorAll('.version')
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].textContent = data.versions.bridge
    }
  }

  function showError () {
    setCode('pg-input', 'Could not load support/playground-data.json. Serve the site over HTTP.')
    setCode('pg-output', '')
    setCode('dx-input', 'Could not load support/playground-data.json. Serve the site over HTTP.')
  }

  fetch('support/playground-data.json', { cache: 'no-store' })
    .then(function (response) {
      if (!response.ok) throw new Error('HTTP ' + response.status)
      return response.json()
    })
    .then(function (json) {
      data = json
      renderVersions()
      renderPlayground()
      renderDirectives()
    })
    .catch(showError)
})()
