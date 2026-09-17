import Vue from 'core/index'
import { diffLog } from './runtime-trace'
import { def, warn } from 'core/util/index'

const KEY_SEP = '_'

function getDeepData (keyList, viewData) {
  if (keyList.length > 1) {
    const _key = keyList.splice(0, 1)
    const _viewData = viewData[_key]
    if (_viewData) {
      return getDeepData(keyList, _viewData)
    } else {
      return null
    }
  } else {
    if (viewData[keyList[0]]) {
      return viewData[keyList[0]]
    } else {
      return null
    }
  }
}

function deepDiff (oldData, newData, data, key) {
  if (oldData === newData) {
    return
  }
  // If either the old or new value is null, queue the new value for update.
  if (oldData === null || newData === null) {
    data[key] = newData
    return
  }
  if (Object.prototype.toString.call(oldData) !== Object.prototype.toString.call(newData)) {
    data[key] = newData
    return
  }
  // Diff when both the old and new values are arrays.
  if (Array.isArray(newData) && Array.isArray(oldData)) {
    if (newData.length === oldData.length) {
      for (let i = 0, len = newData.length; i < len; i++) {
        // Recurse into nested arrays and objects.
        deepDiff(oldData[i], newData[i], data, key + '[' + i + ']')
      }
    } else {
      // Differing lengths are written out directly via setData.
      data[key] = newData
    }
    return
  }
  // Diff when both the old and new values are objects.
  if (typeof oldData === 'object' && typeof newData === 'object') {
    var newKeys = Object.keys(newData)
    var oldKeys = Object.keys(oldData)
    var uniqueKeys = new Set([...newKeys, ...oldKeys])
    uniqueKeys.forEach(itemKey => {
      if (oldData[itemKey] &&
        newData[itemKey] &&
        typeof newData[itemKey] === 'object' &&
        Object.prototype.toString.call(oldData) === Object.prototype.toString.call(newData)
      ) {
        deepDiff(oldData[itemKey], newData[itemKey], data, key + '.' + itemKey)
        return
      }
      if (oldData[itemKey] !== newData[itemKey]) {
        data[key + '.' + itemKey] = newData[itemKey]
      }
    })
    return
  }
  if (oldData !== newData) {
    data[key] = newData
  }
}

function compareAndSetDeepData (key, newData, vm, data) {
  // Compare reference-type data.
  try {
    const keyList = key.split('.')
    // Old mini-program runtimes lack page.__viewData__, so diff against the data bound by mpvue.
    const oldData = getDeepData(keyList, vm.$root.$mp.page.data)
    if (!oldData) {
      data[key] = newData
      return
    }
    deepDiff(oldData, newData, data, key)
  } catch (e) {
    warn('Failed to diff key "' + key + '": ' + (e && e.message), vm)
  }
}

function cleanKeyPath (vm) {
  if (vm.__mpKeyPath) {
    Object.keys(vm.__mpKeyPath).forEach((_key) => {
      delete vm.__mpKeyPath[_key]['__keyPath']
    })
  }
}

function minifyDeepData (rootKey, originKey, vmData, data, _mpValueSet, vm) {
  try {
    if (vmData instanceof Array) {
      // Array.
      compareAndSetDeepData(rootKey + '.' + originKey, vmData, vm, data)
    } else {
      // Object
      let __keyPathOnThis = {} // Collect this level's keyPath entries.
      if (vmData.__keyPath && !vmData.__newReference) {
        // An update list exists, so update from the list.
        __keyPathOnThis = vmData.__keyPath
        Object.keys(vmData).forEach((_key) => {
          if (vmData[_key] instanceof Object) {
            // Reference type: recurse.
            if (_key === '__keyPath') {
              return
            }
            minifyDeepData(rootKey + '.' + originKey, _key, vmData[_key], data, null, vm)
          } else {
            // Add listed entries to the update payload.
            if (__keyPathOnThis[_key] === true) {
              if (originKey) {
                data[rootKey + '.' + originKey + '.' + _key] = vmData[_key]
              } else {
                data[rootKey + '.' + _key] = vmData[_key]
              }
            }
          }
        })
        // Root and child may share one reference; clean up after the dependency tree is fully walked.
        vm['__mpKeyPath'] = vm['__mpKeyPath'] || {}
        vm['__mpKeyPath'][vmData.__ob__.dep.id] = vmData
      } else {
        // No update list.
        compareAndSetDeepData(rootKey + '.' + originKey, vmData, vm, data)
      }
      // Flag whole-object (this.obj = {}) replacements to fix under-updating, see #1305.
      def(vmData, '__newReference', false, false)
    }
  } catch (e) {
    warn('Failed to minify data at "' + rootKey + '.' + originKey + '": ' + (e && e.message), vm)
  }
}

function getRootKey (vm, rootKey) {
  if (!vm.$parent.$attrs) {
    rootKey = '$root.0' + KEY_SEP + rootKey
    return rootKey
  } else {
    rootKey = vm.$parent.$attrs.mpcomid + KEY_SEP + rootKey
    return getRootKey(vm.$parent, rootKey)
  }
}

export function diffData (vm, data) {
  const vmData = vm._data || {}
  const vmProps = vm._props || {}
  let rootKey = ''
  if (!vm.$attrs) {
    rootKey = '$root.0'
  } else {
    rootKey = getRootKey(vm, vm.$attrs.mpcomid)
  }
  Vue.nextTick(() => {
    cleanKeyPath(vm)
  })

  // Value-type variables skip optimization and update directly.
  const __keyPathOnThis = vmData.__keyPath || vm.__keyPath || {}
  delete vm.__keyPath
  delete vmData.__keyPath
  delete vmProps.__keyPath
  if (vm._mpValueSet === 'done') {
    // Minimization runs from the second assignment on.
    Object.keys(vmData).forEach((vmDataItemKey) => {
      if (vmData[vmDataItemKey] instanceof Object) {
        // Reference type.
        minifyDeepData(rootKey, vmDataItemKey, vmData[vmDataItemKey], data, vm._mpValueSet, vm)
      } else if (vmData[vmDataItemKey] !== undefined) {
        // Value props on _data are assigned only when flagged for update.
        if (__keyPathOnThis[vmDataItemKey] === true) {
          data[rootKey + '.' + vmDataItemKey] = vmData[vmDataItemKey]
        }
      }
    })

    Object.keys(vmProps).forEach((vmPropsItemKey) => {
      if (vmProps[vmPropsItemKey] instanceof Object) {
        // Reference type.
        minifyDeepData(rootKey, vmPropsItemKey, vmProps[vmPropsItemKey], data, vm._mpValueSet, vm)
      } else if (vmProps[vmPropsItemKey] !== undefined) {
        data[rootKey + '.' + vmPropsItemKey] = vmProps[vmPropsItemKey]
      }
      // Value props on _props are assigned only when flagged for update.
    })

    // After data and props, append _mpProps and _computedWatchers.
    const vmMpProps = vm._mpProps || {}
    const vmComputedWatchers = vm._computedWatchers || {}
    Object.keys(vmMpProps).forEach((mpItemKey) => {
      data[rootKey + '.' + mpItemKey] = vm[mpItemKey]
    })
    Object.keys(vmComputedWatchers).forEach((computedItemKey) => {
      data[rootKey + '.' + computedItemKey] = vm[computedItemKey]
    })
    // Drop the $root.0 placeholder on update or it would overwrite correct data.
    delete data[rootKey]
  }
  if (vm._mpValueSet === undefined) {
    // After the first successful set, mark done; later updates to this node without a keyPath list are skipped.
    vm._mpValueSet = 'done'
  }
  if (Vue.config._mpTrace) {
    diffLog(data)
  }
}
