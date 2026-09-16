# Vue Mini Bridge

Vue Mini Bridge is an independently maintained Vue-compatible runtime and template compiler for mini-program targets.

It continues the useful parts of the original mpvue platform work while rebuilding the toolchain, translating the documentation, and adding regression coverage for current developer environments.

## Status

The project is under active modernization. The runtime/compiler behavior is intentionally kept close to the upstream contract while the build and test infrastructure are being replaced. Do not treat an unreleased branch as a drop-in production upgrade yet.

Supported target adapters currently present in the source tree:

- WeChat (`wx`)
- Baidu (`swan`)
- Toutiao (`tt`)
- Alipay (`my`)

## Packages

The independent package names are:

- `vue-mini-bridge` — the mini-program runtime
- `vue-mini-bridge-template-compiler` — the template compiler used by a compatible loader

Both packages are generated from the source tree during a release build. Make changes under `src/`, then run the build before publishing.

## Development

Requirements: Node.js 22 or newer and Corepack-enabled Yarn 1.x while the dependency graph is being migrated.

```sh
corepack yarn install
npm run lint
npm run build:mpvue
```

The maintenance record, live upstream issue/PR review, and upgrade sequence are in [`MAINTENANCE.md`](MAINTENANCE.md).

## Relationship to upstream

This repository preserves the original MIT license and attribution. The historical source is available as the `upstream` Git remote. Vue Mini Bridge is not affiliated with Meituan, Vue, or any mini-program platform vendor.

## License

MIT. See [`LICENSE`](LICENSE).
