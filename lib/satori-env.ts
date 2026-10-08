// satori >= 0.36's emscripten glue reads the CommonJS `__dirname` global at module
// load whenever it detects a Node-like runtime (vitest, workerd with nodejs_compat).
// It does not exist in ESM, so define a harmless value BEFORE satori is evaluated by
// importing this module first. Yoga is initialised from an explicit wasm module, so
// the value is never used to load files.
const g = globalThis as { __dirname?: string }
g.__dirname ??= '/'
