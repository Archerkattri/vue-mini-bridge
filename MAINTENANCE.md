# Vue Mini Bridge maintenance research

Collected from the live `Meituan-DianPing/mpvue` repository on 2026-09-15. This project keeps the MIT source history as `upstream` and is developed independently as `vue-mini-bridge`.

## Repository state

- Upstream: <https://github.com/Meituan-Dianping/mpvue>
- 20,246 stars, 2,021 forks, 420 open non-PR issues, and 45 open pull requests at review time.
- Last upstream push: 2022-03-02.
- The repository is a Vue 2.4.1-era runtime/compiler tree with mini-program adapters for WeChat, Baidu, Toutiao, and Alipay.
- The declared toolchain is Node 6, Rollup 0.45, Webpack 2, Babel 6, Karma 1, PhantomJS, Flow 0.48, TypeScript 2.4, and CircleCI.

## Current baseline

- A fresh Yarn install required lockfile repair because the declared Prettier range was missing from `yarn.lock`.
- `npm run build:mpvue` completes on Node 24 after rebuilding generated artifacts.
- The original generated runtime bundle was out of sync with source. Rebuilding exposed and fixed the compiler's missing default platform and the runtime bundle's stale export shape.
- The original lint gate had 29 existing errors. The modernization branch now clears `npm run lint`.
- The runtime now exports the Vue constructor with `Vue.createMP` attached, and the platform lifecycle adapter mounts pages and components at their native ready points without repeating root hooks.
- The compiler declares its Babel, Prettier, and Lodash runtime dependencies explicitly, so mini-program builds no longer emit unresolved-import warnings.
- The mini-program compiler/runtime integration suite now passes all 76 specs (`npm run test:mp`), including lifecycle registration, event forwarding, slots, props, `v-model`, and data diffing. Five regression specs cover lifecycle cascades to child components, slot event forwarding, parent-to-child prop updates, minimal `setData` key paths, and deterministic compiler output.
- `npm run flow` now passes with zero errors after typing the observer metadata used by mini-program data diffing.
- Build outputs are deterministic: the banner year honors `SOURCE_DATE_EPOCH` for reproducible builds, and `build/build.js` now exits non-zero when a rollup bundle fails instead of silently reporting success.
- The legacy Karma 1, PhantomJS, Selenium 2, Nightwatch, chromedriver, and `codecov.io` stack is fully removed from `devDependencies` (17 packages, 248 lockfile entries). The aggregate `npm test` gate is green end to end: lint, flow (0 errors), type tests, ssr (92 specs), weex (67 specs), and mpvue (76 specs).
- `yarn audit --summary` went from 746 to 70 vulnerabilities (high+critical 461 to 38) after the removal plus in-range upgrades. The remainder lives in the Babel 6 / Webpack 2 / old-loader chains and needs the major migrations on the roadmap below.
- The obsolete CircleCI 1.0 config is removed; GitHub Actions runs the aggregate gate and `build/ci.sh` is a local alias for it.
- Stray `console.log` calls in the mini-program data-diff hot path now go through the dev-only `warn()` channel, and dead commented-out debug lines are removed.

## Issue review

The complete live issue set is available at <https://github.com/Meituan-Dianping/mpvue/issues?q=is%3Aissue+is%3Aopen>. The 420 open issues were reviewed by title, age, labels, and likely subsystem.

- 383 were opened in 2018–2019, 30 in 2020, 5 in 2021, 1 in 2024, and 1 in 2025.
- The most repeated demand is correctness in lifecycle registration, event forwarding, slots, component props, `v-model`, data diffing, and `setData` volume.
- The second major cluster is compiler output: sourcemaps, scoped styles, resource paths, template/component generation, filters, `v-for`, and code splitting.
- Platform-specific demand covers map, canvas, video, picker, web-view, worker, native component, and cross-platform event behavior.
- Labels are not a reliable priority signal: 115 open issues are marked `wontfix`, while only 3 are marked `bug`.
- First-pass issue work should require a current reproduction and a regression test. Old questions, unsupported platform requests, and duplicate reports should be closed with a reason after triage.

## Pull-request review

The complete live PR set is available at <https://github.com/Meituan-Dianping/mpvue/pulls?q=is%3Apr+is%3Aopen>. All 45 PRs are stale: 16 opened in 2018, 18 in 2019, 3 in 2020, 6 in 2021, and 2 in 2022.

The useful work falls into these groups:

- Runtime/compiler fixes: #415, #520, #609, #613, #657, #679, #723, #985, #1027, #1028, #1157, #1247, #1274, #1301, #1303, #1456, #1608, #1614, and #1643.
- Security and dependency fixes: #1730–#1744, #1809, #1815, #1823, #1829–#1833, #1837, #1840, and #1842.
- No PR should be merged mechanically. Rebase the intent, add a focused regression test, compare generated output, and run the affected platform suite.

## Upgrade plan

1. Keep the public mini-program runtime/compiler contract stable while making source and generated bundles deterministic.
2. [Done] Replaced Node 6/CircleCI with GitHub Actions on supported LTS Node versions and documented the minimum runtime.
3. [Done] Removed PhantomJS, Selenium 2, Sauce-only paths, `codecov.io`, and deprecated Karma integrations; the aggregate gate now runs the jasmine suites (ssr, weex, mpvue) instead of Karma coverage.
4. Migrate Babel 6 to Babel 7, then consider Babel 8 only after the Babel 7 configuration and compiler output are stable.
5. Upgrade Webpack through a compatibility branch: latest Webpack 4-compatible loaders first, then Webpack 5 with loader API, target, asset, and configuration changes.
6. Replace Flow 0.48 and TypeScript 2.4 checks with a maintained TypeScript-first type surface without changing generated output until behavior is locked down.
7. Evaluate Vue 2.7 and `@vue/compat` as migration aids, not as a drop-in replacement. Vue 2 is EOL and this renderer uses Vue internals, so Vue 3 support needs an explicit compatibility layer.
8. Add regression coverage for lifecycle registration, event forwarding, slots, component props, data diffing, sourcemaps, code splitting, and each supported platform adapter.

## Primary references

- Vue 2 EOL: <https://v2.vuejs.org/eol/>
- Vue 3 migration build: <https://v3-migration.vuejs.org/migration-build>
- Babel 7 migration: <https://babeljs.io/docs/v7-migration>
- Babel 8 migration order: <https://babeljs.io/docs/v8-migration>
- Webpack 5 migration: <https://webpack.js.org/migrate/5/>
- Node.js supported releases: <https://nodejs.org/en/about/previous-releases>
