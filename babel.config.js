// Babel 7 root config (replaces .babelrc).
// Webpack's babel-loader keeps ES modules intact so webpack itself handles
// code splitting; every other consumer (specs via @babel/register, lint)
// gets CommonJS output. Already-built dist/ and packages/ output is skipped.
module.exports = function (api) {
  const isWebpack = api.caller(function (caller) {
    return !!(caller && caller.name === 'babel-loader')
  })
  return {
    presets: [
      [
        require.resolve('@babel/preset-env'),
        isWebpack ? { modules: false } : {}
      ],
      require.resolve('@babel/preset-flow')
    ],
    // Syntax-only: lets the linter parse the JSX in test/unit specs.
    plugins: [require.resolve('@babel/plugin-syntax-jsx')],
    ignore: [/[\\/]dist[\\/]/, /[\\/]packages[\\/]/]
  }
}
