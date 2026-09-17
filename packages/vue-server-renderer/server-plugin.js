'use strict';

/*  */

var isJS = function (file) { return /\.js(\?[^.]+)?$/.test(file); };

var ref = require('chalk');
var red = ref.red;
var yellow = ref.yellow;

var prefix = "[vue-server-renderer-webpack-plugin]";
var warn = exports.warn = function (msg) { return console.error(red((prefix + " " + msg + "\n"))); };
var tip = exports.tip = function (msg) { return console.log(yellow((prefix + " " + msg + "\n"))); };

var validate = function (compiler) {
  if (compiler.options.target !== 'node') {
    warn('webpack config `target` should be "node".');
  }

  var output = compiler.options.output || {};
  var libraryType = (output.library && output.library.type) || output.libraryTarget;
  if (libraryType !== 'commonjs2') {
    warn('webpack config `output.library.type` should be "commonjs2".');
  }

  if (!compiler.options.externals) {
    tip(
      'It is recommended to externalize dependencies in the server build for ' +
      'better build performance.'
    );
  }
};

var assetName = function (asset) { return typeof asset === 'string' ? asset : asset.name; };

var VueSSRServerPlugin = function VueSSRServerPlugin (options) {
  if ( options === void 0 ) options = {};

  this.options = Object.assign({
    filename: 'vue-ssr-server-bundle.json'
  }, options);
};

VueSSRServerPlugin.prototype.apply = function apply (compiler) {
    var this$1$1 = this;

  validate(compiler);

  compiler.hooks.thisCompilation.tap('VueSSRServerPlugin', function (compilation) {
    compilation.hooks.processAssets.tapPromise(
      {
        name: 'VueSSRServerPlugin',
        stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_SUMMARIZE
      },
      function () {
        var stats = compilation.getStats().toJson();
        var entryName = Object.keys(stats.entrypoints)[0];
        var entryInfo = stats.entrypoints[entryName];

        if (!entryInfo) {
          // #5553
          return Promise.resolve()
        }

        var entryAssets = entryInfo.assets.map(assetName).filter(isJS);

        if (entryAssets.length > 1) {
          throw new Error(
            "Server-side bundle should have one single entry file. " +
            "Avoid splitting the server bundle into multiple chunks."
          )
        }

        var entry = entryAssets[0];
        if (!entry || typeof entry !== 'string') {
          throw new Error(
            ("Entry \"" + entryName + "\" not found. Did you specify the correct entry option?")
          )
        }

        var bundle = {
          entry: entry,
          files: {},
          maps: {}
        };

        // Note: sourcemap assets are not part of stats.assets, so collect
        // the emitted files from the compilation instead.
        compilation.getAssets().forEach(function (ref) {
            var name = ref.name;
            var source = ref.source;

          if (name.match(/\.js$/)) {
            bundle.files[name] = source.source();
          } else if (name.match(/\.js\.map$/)) {
            bundle.maps[name.replace(/\.map$/, '')] = JSON.parse(source.source());
          }
          // do not emit anything else for server
          compilation.deleteAsset(name);
        });

        var json = JSON.stringify(bundle, null, 2);
        var filename = this$1$1.options.filename;
        var ref = compiler.webpack.sources;
          var RawSource = ref.RawSource;

        compilation.emitAsset(filename, new RawSource(json));
        return Promise.resolve()
      }
    );
  });
};

module.exports = VueSSRServerPlugin;
