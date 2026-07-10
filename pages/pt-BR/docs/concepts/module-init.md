---
title: 'Inicialização do módulo'
description: Execute configuração personalizada quando seu módulo nativo NAPI-RS for carregado.
---

# Inicialização do módulo

O NAPI-RS fornece duas APIs para inicialização de módulo:
`#[napi_derive::module_init]` e `#[napi(module_exports)]`. Embora elas possam
parecer semelhantes, servem a propósitos diferentes e executam em momentos
diferentes.

## Linha do tempo de execução

Entender quando cada API executa é fundamental para usá-las corretamente:

```
┌─────────────────────────────────────────────────────────────────┐
│                 Node.js carrega o arquivo .node                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. #[napi_derive::module_init] executa                        │
│     (via ctor - executa no carregamento da biblioteca)         │
│     Executa uma vez para este carregamento da biblioteca       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. napi_register_module_v1 é chamado pelo Node.js             │
│     - Registra todos os exports #[napi] (funções, classes etc.)│
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. #[napi(module_exports)] executa                            │
│     Recebe o objeto exports e pode personalizá-lo              │
│     Executa UMA VEZ por thread/contexto do Node.js             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. O módulo está pronto para uso em JavaScript                │
└─────────────────────────────────────────────────────────────────┘
```

## `#[napi_derive::module_init]`

Esse macro marca uma função para executar quando o módulo nativo é carregado.
Internamente, ele usa o crate [`ctor`](https://crates.io/crates/ctor) para
executar antes que o Node-API registre os exports JavaScript.

### Momento

- Executa em **tempo de carregamento da biblioteca dinâmica** (antes de
  `napi_register_module_v1`)
- Executa uma vez por carregamento da biblioteca nativa, não uma vez por
  ambiente Node-API; workers no mesmo processo normalmente compartilham a
  biblioteca já carregada
- Não tem acesso ao ambiente do Node.js nem ao objeto exports

### Assinatura

```rust
#[napi_derive::module_init]
fn init() {
  // código de inicialização
}
```

A função não pode ter parâmetros nem valor de retorno.

### Quando usar

Use `#[napi_derive::module_init]` para:

- **Configurar runtimes assíncronos** (por exemplo, tokio)
- **Inicializar estado global** que deve ser compartilhado entre todas as
  threads
- **Configuração única** que precisa acontecer antes que qualquer export seja
  registrado
- **Configurar logging ou tracing**

### Exemplo: runtime Tokio personalizado

**lib.rs**

```rust
use napi::bindgen_prelude::create_custom_tokio_runtime;

#[napi_derive::module_init]
fn init() {
  let runtime = napi::tokio::runtime::Builder::new_multi_thread()
    .enable_all()
    .thread_name("my-native-module")
    .build();
  match runtime {
    Ok(rt) => create_custom_tokio_runtime(rt),
    Err(err) => eprintln!("failed to create custom Tokio runtime: {err}"),
  }
}
```

::: warning
O runtime Tokio multithread configurado no exemplo acima depende do target.
Coloque apenas essa configuração de runtime sob compilação condicional ou
escolha uma configuração compatível com seu target WebAssembly. O macro
`module_init` em si oferece suporte a builds WebAssembly.

:::

## `#[napi(module_exports)]`

Esse macro marca uma função que recebe o objeto `exports` do módulo, permitindo
que você o personalize antes que o módulo seja retornado ao JavaScript.

### Momento

- Executa **depois** que todos os exports `#[napi]` são registrados
- Executa **durante** `napi_register_module_v1` (registro de módulo do Node.js)
- Executa **uma vez por contexto do Node.js** (thread principal + cada worker
  thread)

### Assinatura

A função pode retornar `()` ou `Result<()>`. Cada parâmetro, se houver, deve
ser `Env`, `Object` ou uma referência a um desses tipos. `Object` recebe o
objeto exports do módulo, enquanto `Env` recebe o ambiente Node-API atual. As
assinaturas usuais são:

```rust
// Apenas com o objeto exports
#[napi(module_exports)]
pub fn init(mut exports: Object) -> Result<()> {
  // personaliza exports
  Ok(())
}

// Com exports e Env
#[napi(module_exports)]
pub fn init(mut exports: Object, env: Env) -> Result<()> {
  // personaliza exports com acesso ao Env
  Ok(())
}
```

### Quando usar

Use `#[napi(module_exports)]` para:

- **Adicionar propriedades personalizadas** ao objeto exports
- **Criar symbols** que devem ser exportados
- **Registrar exports programaticamente** (não via `#[napi]`)
- **Inicialização por thread** que precisa do ambiente do Node.js

### Exemplo: adicionando um symbol

**lib.rs**

```rust
use napi::bindgen_prelude::*;

#[napi(module_exports)]
pub fn init(mut exports: Object) -> Result<()> {
  // Adiciona um symbol único a exports
  let symbol = Symbol::new("MY_MODULE_SYMBOL");
  exports.set_named_property("MY_SYMBOL", symbol)?;

  // Adiciona uma string de versão
  exports.set_named_property("VERSION", "1.0.0")?;

  Ok(())
}
```

**index.js**

```js
const native = require('./index.node')

console.log(native.MY_SYMBOL) // Symbol(MY_MODULE_SYMBOL)
console.log(native.VERSION) // "1.0.0"
```

## Principais diferenças

| Aspecto                    | `#[napi_derive::module_init]`            | `#[napi(module_exports)]`    |
| -------------------------- | ---------------------------------------- | ---------------------------- |
| **Momento de execução**    | No carregamento do arquivo `.node`       | Durante o registro do módulo |
| **Executa por**            | Carregamento da biblioteca/módulo nativo | Ambiente/contexto Node-API   |
| **Recebe exports**         | Não                                      | Sim                          |
| **Pode modificar exports** | Não                                      | Sim                          |
| **Acesso a Env**           | Não                                      | Sim (opcional)               |
| **Suporte a WebAssembly**  | Sim (via nosso binding JS)               | Sim                          |

## Usando as duas juntas

Essas APIs são complementares e podem ser usadas juntas:

**lib.rs**

```rust
use napi::bindgen_prelude::*;

// Executa uma vez no carregamento do módulo - configura o runtime tokio
#[cfg(not(target_family = "wasm"))]
#[napi_derive::module_init]
fn setup_runtime() {
  let runtime = napi::tokio::runtime::Builder::new_multi_thread()
    .enable_all()
    .build();
  match runtime {
    Ok(rt) => create_custom_tokio_runtime(rt),
    Err(err) => eprintln!("failed to create custom Tokio runtime: {err}"),
  }
}

// Executa por thread - personaliza exports
#[napi(module_exports)]
pub fn customize_exports(mut exports: Object) -> Result<()> {
  exports.set_named_property("THREAD_SAFE_SYMBOL", Symbol::new("THREAD_SAFE"))?;
  Ok(())
}

// Export normal via #[napi]
#[napi]
pub async fn do_async_work() -> String {
  // Isso usa o runtime tokio configurado em module_init
  napi::tokio::time::sleep(std::time::Duration::from_millis(100)).await;
  "done".to_string()
}
```

Os exemplos de runtime personalizado exigem o feature `async` (ou `tokio_rt`)
de `napi`. O exemplo com sleep também exige `tokio_time`:

**Cargo.toml**

```toml
[dependencies]
napi = { version = "3", features = ["async", "tokio_time"] }
napi-derive = "3"
```

## Comportamento em worker threads

Ao usar worker threads no Node.js, o comportamento difere entre as duas APIs:

**main.js**

```js
const { Worker } = require('worker_threads')

// A thread principal carrega o módulo
const native = require('./index.node')
// -> module_init executa (primeira vez)
// -> module_exports executa (thread principal)

// Uma worker thread carrega o mesmo módulo
new Worker(
  `
  const native = require('./index.node')
  // -> module_init NÃO executa de novo (já executou)
  // -> module_exports EXECUTA de novo (novo contexto de thread)
`,
  { eval: true },
)
```

Isso significa:

- Recursos globais (como o runtime tokio) são inicializados uma vez e
  compartilhados
- Estado por thread pode ser configurado em `module_exports` para cada contexto

::: info
O `#[napi_derive::module_init]` executa via o crate `ctor`, que usa mecanismos
específicos de cada plataforma (`.init_array` no Unix, funções construtoras
especiais no Windows) para executar em tempo de carregamento da biblioteca
dinâmica.

:::
