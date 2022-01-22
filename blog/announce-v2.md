import { Diff } from './v2-diff'

# Announcing NAPI-RS v2

> 🦀 NAPI-RS v2 - [Faster 🚀](https://github.com/Brooooooklyn/rust-to-nodejs-overhead-benchmark) , Easier to use, and compatible improvements.
>
> 📅 2021/12/17

We are proudly announcing the release of NAPI-RS `v2`. This is the biggest release of **NAPI-RS** ever.

<Diff />

Work for `v2` started on [Aug 10, 2021](https://github.com/napi-rs/napi-rs/pull/696) and it aims to provide easier to use API's and better compatibility with the Node.js ecosystem.

The core of the `v2` release is the new `macro` API for defining **JavaScript** values in **Rust**. Let's see the differences between `v1` and `v2` by implementing a minimal runnable `sum` function:

#### v2

```rust
use napi_derive::napi;

#[napi]
fn sum(a: u32, b: u32) -> u32 {
  a + b
}
```

#### v1

```rust
use napi::{CallContext, JsNumber, JsObject, Result};
use napi_derive::{module_exports, js_function};

#[module_exports]
fn init(mut exports: JsObject) -> Result<()> {
  exports.create_named_method("sum", sum)?;
  Ok(())
}

#[js_function(1)]
fn sum(ctx: CallContext) -> Result<JsNumber> {
  let a = ctx.get::<JsNumber>(0)?.get_uint32()?;
  let b = ctx.get::<JsNumber>(0)?.get_uint32()?;
  ctx.env.create_uint32(a + b)
}
```

The `v2` API is clearly cleaner and more elegant. The complexity of the value cast between Node.js value and Rust value is hidden by the new `#[napi]` macro. You will not be confused by how to get a value via `Node-API` and how to cast a Rust value into `JsValue` any more.

## What's new in **NAPI-RS** v2

**NAPI-RS** v2 is totally rewrite on top of the `v1` codebase. But most of the `v1` API is still available for compatibility. Which means you can smoothly upgrade to `v2` in most cases.

Besides the small refactor and breaking changes in on the `v1` API, there are also some new exciting features in `v2`.

### TypeScript and JavaScript binding files generation

**NAPI-RS** now will generate TypeScript definition and JavaScript binding files for you. In previous version, you need [`@node-rs/helper`](https://github.com/napi-rs/node-rs/tree/main/packages/helper) to help you load the right native addon. But this package has many problem with the existing JavaScript toolchain. Like [#316](https://github.com/napi-rs/node-rs/issues/316) and [#491](https://github.com/napi-rs/node-rs/issues/491).

In the **NAPI-RS** `v2`, we totally rewrote the JavaScript load logic and there will be no more need to use `@node-rs/helper`. You can now use packages built by **NAPI-RS** with `webpack`, `vercel` and the others JavaScript toolchains.

### Support async fn

With the powerful `#[napi]` macro, you can define async functions in Rust. And the `async fn` will be converted into JavaScript `async function`.

```rust {6} title=lib.rs
use futures::prelude::*;
use napi::bindgen_prelude::*;
use tokio::fs;

#[napi]
async fn read_file_async(path: String) -> Result<Buffer> {
  fs::read(path)
    .map(|r| match r {
      Ok(content) => Ok(content.into()),
      Err(e) => Err(Error::new(
        Status::GenericFailure,
        format!("failed to read file, {}", e),
      )),
    })
    .await
}
```

⬇️⬇️⬇️⬇️⬇️⬇️⬇️⬇️⬇️

```ts title=index.d.ts
export function readFileAsync(path: string): Promise<Buffer>
```

### Await Promise in the Rust

This sounds crazy, but you can do it in **NAPI-RS**!

```rust title=lib.rs
use napi::bindgen_prelude::*;

#[napi]
pub async fn async_plus_100(p: Promise<u32>) -> Result<u32> {
  let v = p.await?;
  Ok(v + 100)
}
```

```js {4} title=test.mjs
import { asyncPlus100 } from './index.js'

const fx = 20
const result = await asyncPlus100(
  new Promise((resolve) => {
    setTimeout(() => resolve(fx), 50)
  }),
)

console.log(result) // 120
```

The JavaScript `Promise` will be converted into `Promise<T>` struct in Rust, and `std::future::Future` trait will be implemented for it. So you can use `await` keyword in Rust on it.

### Define `Class` with `struct`

Like [`PyO3`](https://github.com/PyO3/pyo3/blob/main/examples/maturin-starter/src/lib.rs) and [`node-bindgen`](https://github.com/infinyon/node-bindgen#javascript-class), you can define a class in Rust with `struct` and `#[napi]` macro.

```rust title=lib.rs
// A complex struct which can not be exposed into JavaScript directly.
struct QueryEngine {}

#[napi(js_name = "QueryEngine")]
struct JsQueryEngine {
  engine: QueryEngine,
}

#[napi]
impl JsQueryEngine {
  #[napi(factory)]
  pub fn with_initial_count(count: u32) -> Self {
    JsQueryEngine { engine: QueryEngine::with_initial_count(count) }
  }

  #[napi(constructor)]
  pub fn new() -> Self {
    JsQueryEngine { engine: QueryEngine::new() }
  }

  /// Class method
  #[napi]
  pub async fn query(&self, query: String) -> napi::Result<String> {
    self.engine.query(query).await
  }

  #[napi(getter)]
  pub fn status(&self) -> napi::Result<u32> {
    self.engine.status()
  }

  #[napi(setter)]
  pub fn count(&mut self, count: u32) {
    self.engine.count = count;
  }
}
```

⬇️⬇️⬇️⬇️⬇️⬇️⬇️⬇️⬇️

```ts title=index.d.ts
export class QueryEngine {
  static withInitialCount(count: number): QueryEngine
  constructor()
  query(query: string): Promise<string>
  get status(): number
  set count(count: number)
}
```

See [`class`](../docs/concepts/class) for more details.

### Rust `enum` into JavaScript `Object`

```rust title=lib.rs
#[napi]
enum Kind {
  Duck,
  Dog,
  Cat,
}
```

⬇️⬇️⬇️⬇️⬇️⬇️⬇️⬇️⬇️

```ts title=index.d.ts
export const enum Kind {
  Duck,
  Dog,
  Cat,
}
```

### exports Rust `const`

```rust title=lib.rs
#[napi]
pub const DEFAULT_COST: u32 = 12;
```

```ts title=index.d.ts
export const DEFAULT_COST: number
```

### Abortable `AsyncTask`

```rust title=lib.rs
use napi::{Task, Env, Result, JsNumber, bindgen_prelude::AbortSignal};

struct AsyncFib {
  input: u32,
}

impl Task for AsyncFib {
  type Output = u32;
  type JsValue = JsNumber;

  fn compute(&mut self) -> Result<Self::Output> {
    Ok(fib(self.input))
  }

  fn resolve(&mut self, env: Env, output: u32) -> Result<Self::JsValue> {
    enc.create_uint32(output)
  }
}

#[napi]
fn async_fib(input: u32, signal: Option<AbortSignal>) -> AsyncTask<AsyncFib> {
  AsyncTask::with_optional_signal(AsyncFib { input }, signal)
}
```

⬇️⬇️⬇️⬇️⬇️⬇️⬇️⬇️⬇️

```ts title=index.d.ts
export function asyncFib(input: number, signal?: AbortSignal | null) => Promise<number>
```

⬇️⬇️⬇️⬇️⬇️⬇️⬇️⬇️⬇️

```js {6} title=test.mjs
import { asyncFib } from './index.js'

const controller = new AbortController()

asyncFib(20, controller.signal).catch((e) => {
  console.error(e) // Error: AbortError
})

controller.abort()
```

See [`AsyncTask`](../docs/concepts/async-task) for more details.

### Support export Rust `mod` as JavaScript `Object`

```rust title=lib.rs
#[napi]
mod xxh3 {
  use napi::bindgen_prelude::{BigInt, Buffer};

  #[napi]
  pub const ALIGNMENT: u32 = 16;

  #[napi(js_name = "xxh3_64")]
  pub fn xxh64(input: Buffer) -> u64 {
    let mut h: u64 = 0;
    for i in input.as_ref() {
      h = h.wrapping_add(*i as u64);
    }
    h
  }
}
```

⬇️⬇️⬇️⬇️⬇️⬇️⬇️⬇️

```ts title=index.d.ts
export namespace xxh3 {
  export const ALIGNMENT: number
  export function xxh3_64(input: Buffer): BigInt
  export function xxh128(input: Buffer): BigInt
}
```

## Breaking changes

Besides the new features, `v2` also brings some breaking changes.

### **Rust** version

The minimal version of Rust required to use `napi` is `1.57.0` because of the new `#[napi]` macro requires [60fe8b3](https://github.com/rust-lang/rust/commit/60fe8b3a65be709fe2163b8ab438ef14209055cc).

### `Task` trait

The `fn resolve` and `fn reject` methods of `Task` trait now accepted `&mut self` rather thant `self`. Because we introduced a new `fn finally` method on it.

```diff
struct BufferLength(Ref<JsBufferValue>);

impl Task for BufferLength {
  type Output = usize;
  type JsValue = JsNumber;

  fn compute(&mut self) -> Result<Self::Output> {
    Ok(self.0.len() + 1)
  }

-  fn resolve(self, env: Env, output: Self::Output) -> Result<Self::JsValue> {
-    self.0.unref(env)?;
+  fn resolve(&mut self, env: Env, output: Self::Output) -> Result<Self::JsValue> {
    env.create_uint32(output as u32)
   }

-  fn reject(self, err: Error) -> Result<Self::JsValue> {
-    self.0.unref(env)?;
-    Err(err)
-  }

+  fn finally(&mut self, env: Env) -> Result<()> {
+    self.0.unref(env)?;
+    Ok(())
+  }
}

```

### `Property::new`

`Property::new` now accept single `name: &str`:

```diff
- Property::new(&env, "name)
+ Property::new("name")
```

## Can I upgrade now?

Yes, `v2` beta has been tested in many projects. Including `SWC` `Prisma` and `@parcel/source-map`, and many other projects in the **NAPI-RS** ecosystem.

## What's the next step

**NAPI-RS** has grown to be a vast ecosystem. We are planning to add more platform support to make easier for **Developers** and end **Users** to deploy `Rust`.

The first priority feature in the future is the `WebAssembly` support. We want to allow existing projects with **NAPI-RS** v2 able to compile into `WebAssembly` with no extra effort. (If the crates they are using supported `WebAssembly`). After that, it's easier for developers to share code between Node.js and the Browser.

And we want to investigate the `Deno FFI` support too. See [#12577](https://github.com/denoland/deno/issues/12577#issuecomment-977570758) for the context.

## **Thanks**

[yiliuliuyi](https://github.com/forehalo) for initiating the `v2` alpha version. And most of the `#[napi]` macro was implemented by him.

[Jared Palmer](https://github.com/jaredpalmer) for reviewing the full documentation and the blog.

[`node-bindgen`](https://github.com/infinyon/node-bindgen) [`neon`](https://github.com/neon-bindings/neon) and [`wasm-bindgen`](https://github.com/rustwasm/wasm-bindgen) inspiring many of API designs in the `v2`.

:::info
Special thanks to my wife. Without the weekends she sacrificed, I probably wouldn't even know how to Rust!
:::

### Contributors ✨

Thanks goes to these wonderful people ✨:

<table>
  <tr>
    <td align="center"><a href="https://github.com/oyyd"><img src="https://avatars.githubusercontent.com/u/5847587?v=4?s=80" width="80px;" alt=""/><br /><sub><b>Ouyang Yadong</b></sub></a><br /><a href="https://github.com/napi-rs/napi-rs/commits?author=oyyd" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/adumbidiot"><img src="https://avatars.githubusercontent.com/u/26289915?v=4?s=80" width="80px;" alt=""/><br /><sub><b>Nathaniel Daniel</b></sub></a><br /><a href="https://github.com/napi-rs/napi-rs/commits?author=adumbidiot" title="Code">💻</a></td>
    <td align="center"><a href="https://keybase.io/messense"><img src="https://avatars.githubusercontent.com/u/1556054?v=4?s=80" width="80px;" alt=""/><br /><sub><b>messense</b></sub></a><br /><a href="https://github.com/napi-rs/napi-rs/commits?author=messense" title="Code">💻</a> <a href="#infra-messense" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a></td>
    <td align="center"><a href="https://github.com/c-nixon"><img src="https://avatars.githubusercontent.com/u/5596332?v=4?s=80" width="80px;" alt=""/><br /><sub><b>Chris Nixon</b></sub></a><br /><a href="https://github.com/napi-rs/napi-rs/commits?author=c-nixon" title="Code">💻</a> <a href="#tool-c-nixon" title="Tools">🔧</a></td>
    <td align="center"><a href="https://github.com/danielhenrymantilla"><img src="https://avatars.githubusercontent.com/u/9920355?v=4?s=80" width="80px;" alt=""/><br /><sub><b>Daniel Henry-Mantilla</b></sub></a><br /><a href="https://github.com/napi-rs/napi-rs/commits?author=danielhenrymantilla" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/Mike-Dax"><img src="https://avatars.githubusercontent.com/u/13504878?v=4?s=80" width="80px;" alt=""/><br /><sub><b>Michael</b></sub></a><br /><a href="https://github.com/napi-rs/napi-rs/commits?author=Mike-Dax" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/timfish"><img src="https://avatars.githubusercontent.com/u/1150298?v=4?s=80" width="80px;" alt=""/><br /><sub><b>Tim Fish</b></sub></a><br /><a href="https://github.com/napi-rs/napi-rs/commits?author=timfish" title="Code">💻</a> <a href="https://github.com/napi-rs/napi-rs/commits?author=timfish" title="Documentation">📖</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://www.iconfont.cn/"><img src="https://avatars.githubusercontent.com/u/2784308?v=4?s=80" width="80px;" alt=""/><br /><sub><b>一丝</b></sub></a><br /><a href="https://github.com/napi-rs/napi-rs/commits?author=yisibl" title="Code">💻</a> <a href="#tool-yisibl" title="Tools">🔧</a></td>
    <td align="center"><a href="http://orangecms.org/"><img src="https://avatars.githubusercontent.com/u/4245199?v=4?s=80" width="80px;" alt=""/><br /><sub><b>Daniel Maslowski</b></sub></a><br /><a href="https://github.com/napi-rs/napi-rs/commits?author=orangecms" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/Frando"><img src="https://avatars.githubusercontent.com/u/43627?v=4?s=80" width="80px;" alt=""/><br /><sub><b>Franz Heinzmann</b></sub></a><br /><a href="https://github.com/napi-rs/napi-rs/commits?author=Frando" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/idan-at"><img src="https://avatars.githubusercontent.com/u/11308725?v=4?s=80" width="80px;" alt=""/><br /><sub><b>Idan Attias</b></sub></a><br /><a href="https://github.com/napi-rs/napi-rs/commits?author=idan-at" title="Code">💻</a></td>
    <td align="center"><a href="http://jasperdemoor.me/"><img src="https://avatars.githubusercontent.com/u/2175521?v=4?s=80" width="80px;" alt=""/><br /><sub><b>Jasper De Moor</b></sub></a><br /><a href="https://github.com/napi-rs/napi-rs/commits?author=DeMoorJasper" title="Code">💻</a></td>
    <td align="center"><a href="https://resume.joaomoreno.com/"><img src="https://avatars.githubusercontent.com/u/22350?v=4?s=80" width="80px;" alt=""/><br /><sub><b>João Moreno</b></sub></a><br /><a href="https://github.com/napi-rs/napi-rs/commits?author=joaomoreno" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/pimeys"><img src="https://avatars.githubusercontent.com/u/34967?v=4?s=80" width="80px;" alt=""/><br /><sub><b>Julius de Bruijn</b></sub></a><br /><a href="https://github.com/napi-rs/napi-rs/commits?author=pimeys" title="Code">💻</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://github.com/fanatid/notes"><img src="https://avatars.githubusercontent.com/u/2633065?v=4?s=80" width="80px;" alt=""/><br /><sub><b>Kirill Fomichev</b></sub></a><br /><a href="https://github.com/napi-rs/napi-rs/commits?author=fanatid" title="Code">💻</a></td>
    <td align="center"><a href="https://samholmes.net/"><img src="https://avatars.githubusercontent.com/u/8385528?v=4?s=80" width="80px;" alt=""/><br /><sub><b>Sam Holmes</b></sub></a><br /><a href="https://github.com/napi-rs/napi-rs/commits?author=sam3d" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/h-a-n-a"><img src="https://avatars.githubusercontent.com/u/10465670?v=4?s=80" width="80px;" alt=""/><br /><sub><b>Hana</b></sub></a><br /><a href="https://github.com/napi-rs/napi-rs/commits?author=h-a-n-a" title="Code">💻</a></td>
  </tr>
</table>
