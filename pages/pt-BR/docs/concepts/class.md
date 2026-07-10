---
title: 'Class'
description: Defina e exporte structs de Rust como classes JavaScript com NAPI-RS.
---

# Classe

::: tip
Não há o conceito de classe em Rust. Utilizamos `struct` para representar uma
`Class` JavaScript.

:::

## Escolha a forma JavaScript correta

`#[napi]` em uma struct cria uma classe JavaScript com identidade nativa e métodos. Outros atributos de struct criam formas de valor:

| Declaração Rust                          | Representação JavaScript                               | Use para                                                      |
| ---------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------- |
| `#[napi] struct`                         | Instância de classe apoiada por um valor Rust          | Objetos nativos com estado, métodos, identidade e referências |
| `#[napi(object)] struct`                 | Objeto simples copiado de/para uma struct Rust própria | Registros, opções e formas de configuração                    |
| `#[napi(transparent)] struct Wrapper(T)` | O valor interno `T`                                    | Newtypes Rust que não devem adicionar um wrapper JavaScript   |
| Struct de tupla `#[napi(array)]`         | Array JavaScript / tupla TypeScript                    | Dados posicionais fixos                                       |

Consulte [Conversões de tipos](/docs/concepts/type-conversions) para as regras de direção e propriedade e [Atributos `#[napi]`](/docs/concepts/napi-attributes) para todos os controles de forma.

## `Constructor`

### `constructor` padrão

Se todos os campos em uma struct `Rust` forem `pub`, então você pode usar `#[napi(constructor)]` para fazer com que a `struct` tenha um `constructor` padrão.

**lib.rs**

```rust
#[napi(constructor)]
pub struct AnimalWithDefaultConstructor {
  pub name: String,
  pub kind: u32,
}
```

**index.d.ts**

```ts
export class AnimalWithDefaultConstructor {
  name: string
  kind: number
  constructor(name: string, kind: number)
}
```

Todo campo público faz parte da API JavaScript: o napi-rs gera um getter e, a menos que o campo tenha `#[napi(readonly)]`, um setter. Portanto, seu tipo Rust deve aceitar a direção de conversão JavaScript gerada. Mantenha o estado somente nativo privado, como `count` no exemplo de construtor personalizado abaixo.

### `constructor` personalizado

Se você quiser definir um `constructor` personalizado, pode usar `#[napi(constructor)]` na sua constructor `fn` no bloco `impl` da struct.

**lib.rs**

```rust
#[napi(js_name = "QueryEngine")]
pub struct JsQueryEngine {
  count: u32,
}

#[napi]
impl JsQueryEngine {
  #[napi(constructor)]
  pub fn new() -> Self {
    JsQueryEngine { count: 0 }
  }
}
```

**index.d.ts**

```ts
export class QueryEngine {
  constructor()
}
```

::: warning
**NAPI-RS** atualmente não suporta `private constructor`. Seu construtor
personalizado deve ser `pub` em Rust.

:::

## Factory

Além do `constructor`, você também pode definir métodos de fábrica na `Class` usando `#[napi(factory)]`.

**lib.rs**

```rust
#[napi(js_name = "QueryEngine")]
pub struct JsQueryEngine {
  count: u32,
}

#[napi]
impl JsQueryEngine {
  #[napi(factory)]
  pub fn with_initial_count(count: u32) -> Self {
    JsQueryEngine { count }
  }
}
```

**index.d.ts**

```ts
export class QueryEngine {
  static withInitialCount(count: number): QueryEngine
  constructor()
}
```

::: warning
Se nenhum `#[napi(constructor)]` for definido na `struct`, e você tentar criar
uma instância (`new`) da `Class` em JavaScript, um erro será lançado.

:::

**test.mjs**

```js {3}
import { QueryEngine } from './index.js'

new QueryEngine() // Error: Class contains no `constructor`, cannot create it!
```

## `class method`

Você pode definir um método de classe JavaScript com `#[napi]` em um método de struct em **Rust**.

**lib.rs**

```rust
#[napi(js_name = "QueryEngine")]
pub struct JsQueryEngine {
  count: u32,
}

#[napi]
impl JsQueryEngine {
  #[napi(factory)]
  pub fn with_initial_count(count: u32) -> Self {
    JsQueryEngine { count }
  }

  /// Class method (Método de classe)
  #[napi]
  pub async fn query(&self, query: String) -> napi::Result<String> {
    Ok(format!("{query}: {}", self.count))
  }

  #[napi]
  pub fn status(&self) -> napi::Result<u32> {
    Ok(self.count)
  }
}
```

**index.d.ts**

```ts
export class QueryEngine {
  static withInitialCount(count: number): QueryEngine
  constructor()
  query(query: string): Promise<string>
  status(): number
}
```

::: warning
`async fn` precisa dos recursos `napi4` e `tokio_rt` habilitados.

:::

::: tip
Qualquer `fn` em `Rust` que retorne `Result<T>` será tratado como `T` em JavaScript/TypeScript. Se o `Result<T>` for `Err`, um erro JavaScript será lançado.

:::

## `Getter`

Defina [um `getter` de classe JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/get) usando `#[napi(getter)]`. A `fn` Rust deve ser um método de struct, não uma função associada.

**lib.rs**

```rust
#[napi(js_name = "QueryEngine")]
pub struct JsQueryEngine {
  count: u32,
}

#[napi]
impl JsQueryEngine {
  #[napi(factory)]
  pub fn with_initial_count(count: u32) -> Self {
    JsQueryEngine { count }
  }

  /// Método de classe
  #[napi]
  pub async fn query(&self, query: String) -> napi::Result<String> {
    Ok(format!("{query}: {}", self.count))
  }

  #[napi(getter)]
  pub fn status(&self) -> napi::Result<u32> {
    Ok(self.count)
  }
}
```

**index.d.ts**

```ts {4}
export class QueryEngine {
  static withInitialCount(count: number): QueryEngine
  constructor()
  get status(): number
}
```

## `Setter`

Defina [`setter` de classe JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/set) usando `#[napi(setter)]`. A `fn` Rust deve ser um método de struct, não uma função associada.

**lib.rs**

```rust
#[napi(js_name = "QueryEngine")]
pub struct JsQueryEngine {
  count: u32,
}

#[napi]
impl JsQueryEngine {
  #[napi(factory)]
  pub fn with_initial_count(count: u32) -> Self {
    JsQueryEngine { count }
  }

  /// Método de classe
  #[napi]
  pub async fn query(&self, query: String) -> napi::Result<String> {
    Ok(format!("{query}: {}", self.count))
  }

  #[napi(getter)]
  pub fn status(&self) -> napi::Result<u32> {
    Ok(self.count)
  }

  #[napi(setter)]
  pub fn count(&mut self, count: u32) {
    self.count = count;
  }
}
```

**index.d.ts**

```ts {5}
export class QueryEngine {
  static withInitialCount(count: number): QueryEngine
  constructor()
  get status(): number
  set count(count: number)
}
```

## Class como argumento

`Class` é diferente de [`Object`](./object). O valor Rust é encapsulado por uma instância JavaScript e gerenciado pelo coletor de lixo desse ambiente. Passe a instância de volta ao Rust como `&T` para acesso compartilhado ou `&mut T` para acesso mutável; o valor não é clonado de um objeto simples.

Somente campos públicos da struct se tornam propriedades JavaScript. Eles são graváveis por padrão porque o napi-rs gera os dois acessores; `#[napi(readonly)]` elimina o setter, e `#[napi(skip)]` elimina ambos. Campos privados continuam sendo detalhes da implementação nativa. Um campo gravável precisa de `ToNapiValue` e `FromNapiValue`; um campo readonly precisa apenas de `ToNapiValue`. Consulte a [referência de atributos de campo](/docs/concepts/napi-attributes#fields), inclusive a limitação da forma abreviada `#[napi(constructor)]`.

**lib.rs**

```rust {1,5}
#[napi]
pub fn accept_class(engine: &QueryEngine) {
  // ...
}

#[napi]
pub fn accept_class_mut(engine: &mut QueryEngine) {
  // ...
}
```

**index.d.ts**

```ts
export function acceptClass(engine: QueryEngine): void
export function acceptClassMut(engine: QueryEngine): void
```

Para instâncias de classe aninhadas, arrays de instâncias de classe e `ClassInstance<T>`, consulte a [seção de classes da referência de conversão](/docs/concepts/type-conversions#objects-classes-and-custom-shapes).

## Atributos de propriedade

Os atributos padrão da propriedade são `writable = true`, `enumerable = true` e `configurable = true`. Você pode controlar os atributos da propriedade através do macro `#[napi]`:

**lib.rs**

```rust {20}
use napi::bindgen_prelude::*;
use napi_derive::napi;

// Uma estrutura complexa que não pode ser exposta diretamente ao JavaScript.
#[napi]
pub struct QueryEngine {
  num: i32,
}

#[napi]
impl QueryEngine {
  #[napi(constructor)]
  pub fn new() -> Result<Self> {
    Ok(Self {
      num: 42,
    })
  }

  // writable / enumerable / configurable
  #[napi(writable = false)]
  pub fn get_num(&self) -> i32 {
    self.num
  }
}
```

Neste caso, o método `getNum` de `QueryEngine` não é gravável:

**main.mjs**

```js {4}
import { QueryEngine } from './index.js'

const qe = new QueryEngine()
qe.getNum = function () {} // TypeError: Cannot assign to read only property 'getNum' of object '#<QueryEngine>'
```

## Lógica de Finalização personalizada

O NAPI-RS descartará a struct Rust envolvida no objeto JavaScript quando o objeto JavaScript for "garbage collected". Você também pode especificar uma lógica de finalização personalizada para a struct Rust.

**lib.rs**

```rust
use napi::bindgen_prelude::*;
use napi_derive::napi;

#[napi(custom_finalize)]
pub struct CustomFinalize {
  width: u32,
  height: u32,
  inner: Vec<u8>,
}

#[napi]
impl CustomFinalize {
  #[napi(constructor)]
  pub fn new(mut env: Env, width: u32, height: u32) -> Result<Self> {
    let inner_size = u64::from(width)
      .checked_mul(u64::from(height))
      .and_then(|pixels| pixels.checked_mul(4))
      .and_then(|bytes| usize::try_from(bytes).ok())
      .ok_or_else(|| Error::new(Status::InvalidArg, "image dimensions are too large"))?;
    let external_size = i64::try_from(inner_size)
      .map_err(|_| Error::new(Status::InvalidArg, "image dimensions are too large"))?;

    let mut inner = Vec::new();
    inner.try_reserve_exact(inner_size).map_err(|err| {
      Error::new(
        Status::GenericFailure,
        format!("failed to allocate image buffer: {err}"),
      )
    })?;
    inner.resize(inner_size, 0);
    env.adjust_external_memory(external_size)?;
    Ok(Self {
      width,
      height,
      inner,
    })
  }
}

impl ObjectFinalize for CustomFinalize {
  fn finalize(self, mut env: Env) -> Result<()> {
    let external_size = i64::try_from(self.inner.len())
      .map_err(|_| Error::new(Status::InvalidArg, "image buffer is too large"))?;
    env.adjust_external_memory(-external_size)?;
    Ok(())
  }
}
```

Primeiro, você pode definir o atributo `custom_finalize` no macro `#[napi]`, e o NAPI-RS não gerará o `ObjectFinalize` padrão para a estrutura Rust.

Então, você pode implementar o `ObjectFinalize` você mesmo para a Rust struct.

Neste caso, a estrutura `CustomFinalize` aumenta a memória externa no **constructor** e a diminui em `fn finalize`.

## `instance of`

Há um `fn instance_of` em todas as classes `#[napi]`:

**lib.rs**

```rust {9}
use napi::bindgen_prelude::*;
use napi_derive::napi;

#[napi(constructor)]
pub struct NativeClass {}

#[napi]
pub fn is_native_class_instance(env: &Env, value: Unknown) -> Result<bool> {
  NativeClass::instance_of(env, &value)
}
```

**main.mjs**

```js
import { NativeClass, isNativeClassInstance } from './index.js'

const nc = new NativeClass()
console.log(isNativeClassInstance(nc)) // true
console.log(isNativeClassInstance(1)) // false
```
