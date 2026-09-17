// The SSR specs run dozens of webpack compiles; allow headroom so a slow
// compile under load fails loudly instead of tripping the 5s default.
jasmine.DEFAULT_TIMEOUT_INTERVAL = 20000
