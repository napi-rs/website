// lib/sponsors-image/wasm.d.ts
// Void's Cloudflare build turns a static `import x from '….wasm'` into a real
// WebAssembly.Module at the edge. This ambient type lets the route files import
// satori/yoga.wasm and @resvg/resvg-wasm/index_bg.wasm without a TS error.
declare module '*.wasm' {
  const module: WebAssembly.Module
  export default module
}
