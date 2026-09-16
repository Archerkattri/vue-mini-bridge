import Vue from 'core/index'
var updateDataTotal = 0 // Total updated data size.
export function diffLog (updateData) {
  updateData = JSON.stringify(updateData)
  if (!Vue._mpvueTraceTimer) {
    Vue._mpvueTraceTimer = setTimeout(function () {
      clearTimeout(Vue._mpvueTraceTimer)
      updateDataTotal = (updateDataTotal / 1024).toFixed(1)
      console.log('Data updated within 500ms of this operation:' + updateDataTotal + 'kb')
      Vue._mpvueTraceTimer = 0
      updateDataTotal = 0
    }, 500)
  } else if (Vue._mpvueTraceTimer) {
    updateData = updateData.replace(/[^\u0000-\u00ff]/g, 'aa') // Non-ASCII chars count as 2 bytes; replaced with two letters for size estimation.
    updateDataTotal += updateData.length
  }
}
