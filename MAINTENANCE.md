# Vue Mini Bridge maintenance research

Collected from the live `Meituan-DianPing/mpvue` repository on 2026-09-15. This project keeps the MIT source history as `upstream` and is developed independently as `vue-mini-bridge`.

## Repository state

- Upstream: <https://github.com/Meituan-Dianping/mpvue>
- 20,246 stars, 2,021 forks, 420 open non-PR issues, and 45 open pull requests at review time.
- Last upstream push: 2022-03-02.
- The repository is a Vue 2.4.1-era runtime/compiler tree with mini-program adapters for WeChat, Baidu, Toutiao, and Alipay.
- The inherited toolchain was Node 6, Rollup 0.45, Webpack 2, Babel 6, Karma 1, PhantomJS, Flow 0.48, TypeScript 2.4, and CircleCI.
- The current toolchain is Node 22+, Rollup 4, Webpack 5, Babel 7, ESLint 9, Jasmine 7, Flow 0.48, TypeScript 6, Prettier 2, and GitHub Actions. The lockfile pins these dependencies for reproducible installs. CI tests Node 22, 24, and 26; Node 26 is the Current release, and the package engine floor remains Node 22.

## Current baseline

- A fresh Yarn install required lockfile repair because the declared Prettier range was missing from `yarn.lock`.
- `npm run build:mpvue` completes on Node 24 after rebuilding generated artifacts.
- The original generated runtime bundle was out of sync with source. Rebuilding exposed and fixed the compiler's missing default platform and the runtime bundle's stale export shape.
- The original lint gate had 29 existing errors. The modernization branch now clears `npm run lint`.
- The runtime now exports the Vue constructor with `Vue.createMP` attached, and the platform lifecycle adapter mounts pages and components at their native ready points without repeating root hooks.
- The compiler declares its Babel, Prettier, and Lodash runtime dependencies explicitly, so mini-program builds no longer emit unresolved-import warnings.
- The mini-program compiler/runtime integration suite passes all 84 specs (`npm run test:mpvue`), including lifecycle registration, event forwarding, slots, props, `v-model`, and data diffing. Regression coverage includes lifecycle cascades, slot event forwarding, parent-to-child prop updates, minimal `setData` key paths, deterministic compiler output, and prototype-pollution keys.
- `npm run flow` passes with Flow 0.48 and zero errors. A trial upgrade to Flow 0.335 produced 752 errors across the 198 checked files and was reverted; keep the legacy checker until a staged type-system migration is reviewed separately.
- `npm run test:types` passes with TypeScript 6.0.3. The declaration tests and compiler options were updated for the current compiler.
- Jasmine was upgraded to 7.0.0 with jasmine-core 7.0.2. Duplicate spec titles were renamed, and SSR suites load Babel through a local helper so Jasmine works on Windows.
- The full `npm test` gate passes: lint, Flow, TypeScript declarations, SSR (92 specs), Weex (73 specs), and mini-program (84 specs).
- Prettier remains at 2.8.8 because the compiler adapters call its formatting API synchronously. Prettier 3 makes that API asynchronous; defer that migration until the compiler interface and generated output can be migrated and tested together.
- Build outputs are deterministic: the banner year honors `SOURCE_DATE_EPOCH` for reproducible builds, and `build/build.js` now exits non-zero when a rollup bundle fails instead of silently reporting success.
- The legacy Karma 1, PhantomJS, Selenium 2, Nightwatch, chromedriver, and `codecov.io` stack is removed from `devDependencies`.
- `yarn audit --summary` reported 0 vulnerabilities across 564 audited packages on 2026-10-11. The audit covers the installed dependency graph represented by the lockfile; it is not a claim that platform IDEs or applications using the packages have no security issues.
- Security updates include removing obsolete direct dependencies, upgrading `serialize-javascript` and fixing the Handlebars resolution, migrating Rollup, Webpack, Babel, and ESLint, and pinning patched transitives via `resolutions` (dot-prop, shelljs, trim-newlines, yargs-parser). Keep these overrides only while the corresponding dependency paths require them.
- The obsolete CircleCI 1.0 config is removed; GitHub Actions runs the aggregate gate and `build/ci.sh` is a local alias for it.
- Stray `console.log` calls in the mini-program data-diff hot path now go through the dev-only `warn()` channel, and dead commented-out debug lines are removed.
- Touched runtime files use English comments (translated on touch per maintenance policy); the weex capture-phase notice uses `warn()` with a corrected message.

## Issue review

The complete live issue set is available at <https://github.com/Meituan-Dianping/mpvue/issues?q=is%3Aissue+is%3Aopen>. The 420 open issues were reviewed by title, age, labels, and likely subsystem.

- 383 were opened in 2018–2019, 30 in 2020, 5 in 2021, 1 in 2024, and 1 in 2025.
- The most repeated demand is correctness in lifecycle registration, event forwarding, slots, component props, `v-model`, data diffing, and `setData` volume.
- The second major cluster is compiler output: sourcemaps, scoped styles, resource paths, template/component generation, filters, `v-for`, and code splitting.
- Platform-specific demand covers map, canvas, video, picker, web-view, worker, native component, and cross-platform event behavior.
- Labels are not a reliable priority signal: 115 open issues are marked `wontfix`, while only 3 are marked `bug`.
- First-pass issue work should require a current reproduction and a regression test. Old questions, unsupported platform requests, and duplicate reports should be closed with a reason after triage.
- Upstream issue #1822's sourcemap failure depends on the Quickstart's `productionSourceMap` build and `webpack-mpvue-asset-plugin`, neither of which is present in this repository; that exact failure does not reproduce on the current branch.
- Upstream issue #1828 reports a computed getter running without a visible DOM update, but its minimal example never references `fullName` in the template, so there is no rendered value to update. The report does not establish a framework defect; add the computed property to the template before treating it as a regression.
- Upstream issue #1821's report omits a runnable parent/child setup. A maintained-branch regression now compiles a child component with the reported `v-for`, `:key`, and click handler; dispatch reaches `showDetail(index)` with the correct item index. The issue was not reproduced.
- Upstream issue #1672 reports a nested object value of `0` becoming an empty string in mpvue 1.4.6. The maintained runtime now has an end-to-end regression test for changing a nested numeric property to zero; the emitted `setData` value and page state both remain numeric zero.
- Upstream issue #1812's `$delete` failure reproduced for a nested reactive property: the diff walker skipped deletion markers because the deleted key was no longer enumerable. It now emits an empty string for that path, since mini-program `setData` ignores `undefined`; the runtime regression verifies that the stale value is cleared. The complete workspace test command passes locally.

## Pull-request review

The complete live PR set is available at <https://github.com/Meituan-Dianping/mpvue/pulls?q=is%3Apr+is%3Aopen>. All 45 PRs are stale: 16 opened in 2018, 18 in 2019, 3 in 2020, 6 in 2021, and 2 in 2022.

The useful work falls into these groups:

- Runtime/compiler fixes: #415, #520, #609, #613, #657, #679, #723, #985, #1027, #1028, #1157, #1247, #1274, #1301, #1303, #1456, #1608, #1614, and #1643.
- Security and dependency fixes: #1730–#1744, #1809, #1815, #1823, #1829–#1833, #1837, #1840, and #1842.
- No PR should be merged mechanically. Rebase the intent, add a focused regression test, compare generated output, and run the affected platform suite.

## Upgrade plan

1. Keep the public mini-program runtime/compiler contract stable while making source and generated bundles deterministic.
2. [Done] Replaced Node 6/CircleCI with GitHub Actions on Node 22, 24, and 26; the package minimum remains Node 22.
3. [Done] Removed PhantomJS, Selenium 2, Sauce-only paths, `codecov.io`, and deprecated Karma integrations; the aggregate gate now runs the jasmine suites (ssr, weex, mpvue) instead of Karma coverage.
4. [Done] Migrated Babel 6 to Babel 7 (root config, spec transpilation, mini-program compiler runtime code, and webpack loader); generated bundles diffed against pre-migration output.
5. [Done] Upgraded Webpack 2 straight to Webpack 5 (plus Rollup 0.45 to 4 and ESLint 3 to 9): SSR webpack plugins ported to the processAssets/hooks APIs, file-loader replaced with asset modules, CommonsChunkPlugin replaced with runtimeChunk, and the lint ruleset converted to flat config.
6. Replace Flow 0.48 with a maintained type-checking approach only after the existing code has a staged migration plan. Flow 0.335 is not a drop-in update for this codebase. Keep the tested TypeScript declaration surface on TypeScript 6 until the TypeScript 7 migration is verified.
7. Evaluate Vue 2.7 and `@vue/compat` as migration aids, not as a drop-in replacement. Vue 2 is EOL and this renderer uses Vue internals, so Vue 3 support needs an explicit compatibility layer.
8. Add regression coverage for lifecycle registration, event forwarding, slots, component props, data diffing, sourcemaps, code splitting, and each supported platform adapter.
9. Migrate the remaining 0.x devDependencies by hand (Bublé, Flow, shelljs, weex-js-runtime, weex-vdom-tester): their majors and minors can change behavior, so the dependency bot should carry patch updates only until each migration has focused coverage.

## Primary references

- Vue 2 EOL: <https://v2.vuejs.org/eol/>
- Vue 3 migration build: <https://v3-migration.vuejs.org/migration-build>
- Babel 7 migration: <https://babeljs.io/docs/v7-migration>
- Babel 8 migration order: <https://babeljs.io/docs/v8-migration>
- Webpack 5 migration: <https://webpack.js.org/migrate/5/>
- Node.js supported releases: <https://nodejs.org/en/about/previous-releases>
