import { Diff } from '../../components/v2-diff'

# NAPI-RS v2 发布

> 🦀 NAPI-RS v2 - [更快 🚀](https://github.com/Brooooooklyn/rust-to-nodejs-overhead-benchmark) , 更易用，与 Node.js 生态更好兼容.
>
> 📅 2021/12/17

很高兴能在此宣布 **NAPI-RS** `v2` 的发布。 这是 **NAPI-RS** 有史以来最大的一次更新。在这次更新以后，**NAPI-RS** 从一个轻量级 `Rust` 库，变成了一个强大的框架。

`v2` 的开发从 [2021/08/10](https://github.com/napi-rs/napi-rs/pull/696) 开始. `v2` 旨在提供更易用的 API 和与 `Node.js` 生态更好的兼容性.

`v2` 版本的核心是新的 `Rust 宏` API, 通过新的 `#[napi]` 宏，你可以更轻松的在 `Rust` 中定义 `JavaScript` 值。让我们看一下 `v1` 和 `v2` 版本同样定一个最小可运行的 `sum` 函数使两数相加的例子:

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

可以看到 `v2` 提供的 API 明显更加简洁优雅。从 `Node.js` 到 `Rust` 值的相互转换过程被新提供的 `#[napi]` 宏隐藏了起来。你再也不用为如何通过底层的 `Node-API` 从 `Node.js` 将某个 `JsValue` 转换到 `Rust` 值，或者如何反过来转换而感到困惑。

## **NAPI-RS** v2 有哪些新特性

**NAPI-RS** `v2` 是基于 `v1` 完全重写而来的。但大部分 `v1` 提供的 API 都在新版本保留，以便基于 `v1` 的库可以兼容性升级。所以大部分基于 `v1` 开发的库在大部分情况下可以非常顺畅的直接将版本号升级到 `v2`。

### 自动生成 TypeScript 和 JavaScript 绑定文件

**NAPI-RS** 现在会自动为你的项目生成 JavaScript 和 TypeScript 绑定文件。在上一个版本，你需要使用 [`@node-rs/helper`](https://github.com/napi-rs/node-rs/tree/main/packages/helper) 这个库帮你加载正确的 native addon 文件/包。但是这个库对于 `Node.js` 生态的一些工具不太友好，因为它的加载逻辑过于动态。比如 [#316](https://github.com/napi-rs/node-rs/issues/316) 和 [#491](https://github.com/napi-rs/node-rs/issues/491)。

**NAPI-RS** `v2` 完全重新设计了基于 `optionalDependencies` 分发二进制包的 native addon 加载逻辑。现在我们不需要 `@node-rs/helper` 了，在生成的 JavaScript 绑定文件中它会自动帮你找到正确的 native addon 的位置并且加载。所以现在你可以非常顺畅的在 `webpack` `vercel` 等工具和平台中使用 **NAPI-RS** 构建的包了。

### 支持 Rust async fn

使用功能强大的 `#[napi]` 宏， 你可以在 `Rust` 里定义 `async fn`. 然后这个 `async fn` 会被转换成 `JavaScript` 的 `async function`。

```rust {6} filename="lib.rs"
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

```ts filename="index.d.ts"
export function readFileAsync(path: string): Promise<Buffer>
```

### 在 Rust 中 await Promise

这个功能看起来很疯狂，但是在 **NAPI-RS** 里你可以这样做！

```rust title=lib.rs
use napi::bindgen_prelude::*;

#[napi]
pub async fn async_plus_100(p: Promise<u32>) -> Result<u32> {
  let v = p.await?;
  Ok(v + 100)
}
```

```js {4} filename="test.mjs"
import { asyncPlus100 } from './index.js'

const fx = 20
const result = await asyncPlus100(
  new Promise((resolve) => {
    setTimeout(() => resolve(fx), 50)
  }),
)

console.log(result) // 120
```

JavaScript `Promise` 会被转化成 Rust 里的 `Promise<T>` struct, 并且会实现 `std::future::Future` trait. 所以你可以直接在上面使用 Rust 的 `await` 关键字.

### 使用 `struct` 定义 `Class`

与 [`PyO3`](https://github.com/PyO3/pyo3/blob/main/examples/maturin-starter/src/lib.rs) 和 [`node-bindgen`](https://github.com/infinyon/node-bindgen#javascript-class) 类似, 你可以使用 Rust `struct` 和 `#[napi]` 宏定义一个 JavaScript Class。

```rust filename="lib.rs"
// 一个无法直接暴露给 JavaScript 的复杂结构.
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

```ts filename="index.d.ts"
export class QueryEngine {
  static withInitialCount(count: number): QueryEngine
  constructor()
  query(query: string): Promise<string>
  get status(): number
  set count(count: number)
}
```

移步 [`class`](../docs/concepts/class) 来查阅更多细节.

### Rust `enum` 到 JavaScript `Object`

```rust title=lib.rs
#[napi]
enum Kind {
  Duck,
  Dog,
  Cat,
}
```

⬇️⬇️⬇️⬇️⬇️⬇️⬇️⬇️⬇️

```ts filename="index.d.ts"
export const enum Kind {
  Duck,
  Dog,
  Cat,
}
```

### 导出 Rust `const`

```rust filename="lib.rs"
#[napi]
pub const DEFAULT_COST: u32 = 12;
```

```ts filename="index.d.ts"
export const DEFAULT_COST: number
```

### 可中断的 `AsyncTask`

```rust filename="lib.rs"
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

```ts filename="index.d.ts"
export function asyncFib(input: number, signal?: AbortSignal | null) => Promise<number>
```

⬇️⬇️⬇️⬇️⬇️⬇️⬇️⬇️⬇️

```js {6} filename="test.mjs"
import { asyncFib } from './index.js'

const controller = new AbortController()

asyncFib(20, controller.signal).catch((e) => {
  console.error(e) // Error: AbortError
})

controller.abort()
```

移步 [`AsyncTask`](../docs/concepts/async-task) 查看更多细节.

### 支持 export Rust `mod` 到 JavaScript `Object`

```rust filename="lib.rs"
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

```ts filename="index.d.ts"
export namespace xxh3 {
  export const ALIGNMENT: number
  export function xxh3_64(input: Buffer): BigInt
  export function xxh128(input: Buffer): BigInt
}
```

## Breaking changes

除了新功能以外, `v2` 也带来了一些不兼容更新.

### 最小支持的 **Rust** 版本

使用 `napi` 现在至少需要 Rust `1.57.0`， 因为新的 `#[napi]` 宏需要 `Rust` 的这个功能: [60fe8b3](https://github.com/rust-lang/rust/commit/60fe8b3a65be709fe2163b8ab438ef14209055cc).

### `Task` trait

`Task` trait 中的 `fn resolve` 和 `fn reject` 方法现在接受 `&mut self` 而不是 `self`。因为我们引入了一个新的 `fn finally` 方法，会在它们之后调用。

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

`Property::new` 现在只接受单个 `name: &str` 参数:

```diff
- Property::new(&env, "name)
+ Property::new("name")
```

## 现在可以升级了吗？

是的！`v2` beta 版本已经在很多项目中通过测试了。包括 `SWC` `Prisma` `@parcel/source-map` 和 **NAPI-RS** 生态中的许多其它项目。

## 下一步计划

**NAPI-RS** 生态最近一年扩张的非常快。 我们计划在新的 `#[napi]` 宏的基础上支持更多的平台来让 `Rust` 代码更容易编译部署到不同平台，能让更多不同平台的开发者和用户享受到 `Rust` 带来的各种强大功能。

在未来 `WebAssembly` 支持是最高优先级。 我们希望能让基于 **NAPI-RS** v2 开发的项目能无痛编译到 `WebAssembly`。 (在它使用到的 crate 都支持 `WebAssembly` 的前提下)。有了这个功能， 开发者可以更方便的在 Node.js 和浏览器之间共享代码。

我们也希望能开始调研如何支持 `Deno FFI`。 可以到这个 Issue [#12577](https://github.com/denoland/deno/issues/12577#issuecomment-977570758) 了解更多上下文。

## **致谢**

感谢 [yiliuliuyi](https://github.com/forehalo) 发起 `v2` 版本，他完成了大部分 `#[napi]` 宏的功能。

感谢 [Jared Palmer](https://github.com/jaredpalmer) 审阅了所有文档和博客。

`v2` 的 API 设计和实现部分借鉴于 [`node-bindgen`](https://github.com/infinyon/node-bindgen) [`neon`](https://github.com/neon-bindings/neon) 和 [`wasm-bindgen`](https://github.com/rustwasm/wasm-bindgen).

import Callout from 'nextra-theme-docs/callout'

<Callout>
特别感谢我的妻子。如果没有她牺牲掉的那些周末，我现在连 `Rust` 都不会写。
</Callout>

### 贡献者 ✨

感谢这些了不起的开发者的贡献 ✨:

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
