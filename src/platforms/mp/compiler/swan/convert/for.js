import astMap from '../config/astMap'

export default function (ast) {
  const { iterator1, for: forText, alias, attrsMap } = ast

  // 缩写：<view s-for="p,index in persons">
  // 全写：<view s-for="persons" s-for-index="index" s-for-item="p">

  if (forText) {
    attrsMap[astMap['v-for']] = `${alias},${iterator1} in ${forText}`
    delete attrsMap['v-for']
  }

  return ast
}
