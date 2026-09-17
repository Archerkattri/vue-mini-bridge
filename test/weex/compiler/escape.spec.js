import { genHandlers } from '../../../src/compiler/codegen/events'

describe('genHandlers code-string escaping', () => {
  it('escapes script-breakout characters in key modifier names', () => {
    const code = genHandlers({
      keyup: { value: 'onKeyup', modifiers: { '</script>': true }}
    }, false, () => {})
    expect(code).not.toContain('</script>')
    expect(code).toContain('\\u003C\\u002Fscript\\u003E')
  })

  it('leaves ordinary modifier names untouched', () => {
    const code = genHandlers({
      keyup: { value: 'onKeyup', modifiers: { enter: true }}
    }, false, () => {})
    expect(code).toContain('_k($event.keyCode,"enter",13)')
  })
})
