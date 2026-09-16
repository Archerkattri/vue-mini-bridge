# Contributing

Bug reports and pull requests are welcome. This fork keeps the mini-program
runtime/compiler contract stable while modernizing the toolchain, so changes
should preserve component behavior and generated markup unless the break is
explicitly reviewed.

## Development

Requirements: Node.js 22 or newer and Yarn 1.x (via Corepack).

```sh
yarn install
npm test
```

`npm test` runs lint, flow, type tests, and the ssr, weex, and mpvue suites.
Run `npm run test:mp` for the fastest runtime/compiler feedback loop.

## Pull requests

- Submit to `master` with a clear description of the behavior change.
- Add or update regression coverage for runtime, compiler, or adapter changes.
- Follow the [commit convention](COMMIT_CONVENTION.md) (`git-cz` is configured).
- Rebuild generated bundles (`npm run build:mpvue`) when `src/` changes affect them.
