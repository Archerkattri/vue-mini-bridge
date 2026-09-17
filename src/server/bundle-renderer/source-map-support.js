/* @flow */

const SourceMapConsumer = require('source-map').SourceMapConsumer

// Matches both `at fn (bundle.js:1:2)` and bare `at bundle.js:1:2` frames;
// the latter is what newer webpack output produces for module top levels.
const filenameRE = /[\s(]([^)\s]+\.js):(\d+):(\d+)\)?$/

export function createSourceMapConsumers (rawMaps: Object) {
  const maps = {}
  Object.keys(rawMaps).forEach(file => {
    maps[file] = new SourceMapConsumer(rawMaps[file])
  })
  return maps
}

export function rewriteErrorTrace (e: any, mapConsumers: {
  [key: string]: SourceMapConsumer
}) {
  if (e && typeof e.stack === 'string') {
    e.stack = e.stack.split('\n').map(line => {
      return rewriteTraceLine(line, mapConsumers)
    }).join('\n')
  }
}

function rewriteTraceLine (trace: string, mapConsumers: {
  [key: string]: SourceMapConsumer
}) {
  const m = trace.match(filenameRE)
  const map = m && mapConsumers[m[1]]
  if (m != null && map) {
    const originalPosition = map.originalPositionFor({
      line: Number(m[2]),
      column: Number(m[3])
    })
    if (originalPosition.source != null) {
      const { source, line, column } = originalPosition
      // Normalize both webpack 5 (`webpack://namespace/./path`) and
      // webpack 2 (`webpack:///path`) source URL formats.
      const file = source
        .replace(/^webpack:\/\/.*\/\.\//, '')
        .replace(/^webpack:\/\/\//, '')
      const mappedPosition = `(${file}:${String(line)}:${String(column)})`
      return trace.replace(filenameRE, mappedPosition)
    } else {
      return trace
    }
  } else {
    return trace
  }
}
