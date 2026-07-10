---
title: 'ThreadsafeFunction'
description: Chame um callback JavaScript a partir de outras threads.
---

# ThreadsafeFunction

[`Threadsafe Function`](https://nodejs.org/api/n-api.html#asynchronous-thread-safe-function-calls) é um conceito complexo no Node.js. Como sabemos, o Node.js é single-threaded, então não é possível acessar [`napi_env`](https://nodejs.org/api/n-api.html#napi_env), [`napi_value`](https://nodejs.org/api/n-api.html#napi_value) e [`napi_ref`](https://nodejs.org/api/n-api.html#napi_ref) em outra thread.

::: tip
[`napi_env`](https://nodejs.org/api/n-api.html#napi_env), [`napi_value`](https://nodejs.org/api/n-api.html#napi_value) e [`napi_ref`](https://nodejs.org/api/n-api.html#napi_ref)
são conceitos de baixo nível do `Node-API`, sobre os quais o macro `#[napi]` do
**NAPI-RS** é construído. O **NAPI-RS** também fornece uma [API de baixo
nível](/docs/concepts/env) para acessar o `Node-API` original.

:::

O `Node-API` fornece APIs complexas de `Threadsafe Function` para chamar funções JavaScript a partir de outras threads. Elas são tão complexas que muitos desenvolvedores não sabem usá-las corretamente. O **NAPI-RS** fornece uma versão limitada das APIs de `Threadsafe Function` para facilitar o uso:

**lib.rs**

```rust {10}
use std::{sync::Arc, thread};

use napi::{
    bindgen_prelude::*,
    threadsafe_function::{ThreadsafeFunction, ThreadsafeFunctionCallMode},
};
use napi_derive::napi;

#[napi]
pub fn call_threadsafe_function(callback: ThreadsafeFunction<u32, ()>) -> Result<()> {
  let tsfn = Arc::new(callback);
  for n in 0..100 {
    let tsfn = tsfn.clone();
    thread::spawn(move || {
      tsfn.call(Ok(n), ThreadsafeFunctionCallMode::Blocking);
    });
  }
  Ok(())
}
```

⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️

**index.d.ts**

```ts
export function callThreadsafeFunction(
  callback: (err: null | Error, result: number) => void,
): void
```

## Tipo de retorno

O tipo de retorno da `ThreadsafeFunction` é o mesmo tipo retornado pelo callback JavaScript. Você pode defini-lo no segundo parâmetro genérico de `ThreadsafeFunction`:

**lib.rs**

```rust {10}
use std::thread;

use napi::threadsafe_function::{ThreadsafeFunction, ThreadsafeFunctionCallMode};
use napi_derive::napi;

#[napi]
pub fn call_threadsafe_function(callback: ThreadsafeFunction<u32, u32>) {
  thread::spawn(move || {
    callback.call_with_return_value(Ok(1), ThreadsafeFunctionCallMode::Blocking, |ret, _| {
      println!("ret: {:?}", ret); // Ok(101)
      Ok(())
    });
  });
}
```

**index.ts**

```ts
import { callThreadsafeFunction } from './index.js'

callThreadsafeFunction((err, result) => {
  return result + 100
})
```

## CallJsBackArgs

Às vezes, os argumentos passados à `ThreadsafeFunction` são diferentes dos argumentos passados ao callback JavaScript. Você pode criar a `ThreadsafeFunction` a partir de `Function` com `CallJsBackArgs` para fazer essa conversão:

**lib.rs**

```rust {17}
use std::thread;

use napi::{
  bindgen_prelude::*,
  threadsafe_function::{ThreadsafeCallContext, ThreadsafeFunctionCallMode},
};
use napi_derive::napi;

struct Data {
  name: String,
}

#[napi]
pub fn call_threadsafe_function(callback: Function<String, ()>) -> Result<()> {
  let tsfn = callback
    .build_threadsafe_function()
    .build_callback(|ctx: ThreadsafeCallContext<Data>| Ok(format!("Hello {}", ctx.value.name)))?;
  thread::spawn(move || {
    tsfn.call(
      Data {
        name: "John".to_string(),
      },
      ThreadsafeFunctionCallMode::NonBlocking,
    );
  });
  Ok(())
}
```

::: warning
Os tipos de argumento e retorno do callback armazenados por uma
ThreadsafeFunction devem ser `'static`, pois o callback pode executar depois
que a função Rust exportada já retornou. Não use valores com escopo, como
`Unknown<'env>`, `Object<'env>` ou `Function<'env, ...>`, como
`CallJsBackArgs`. Converta-os em dados Rust próprios, como `String`, `Buffer`
ou uma struct simples própria, antes de atravessar o limite entre threads. Um
lifetime de escopo explícito aqui produz `E0521`, pois o valor JavaScript
emprestado escaparia do escopo do callback; consulte
[napi-rs#3383](https://github.com/napi-rs/napi-rs/issues/3383).

:::

⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️

**index.ts**

```ts {4}
import { callThreadsafeFunction } from './index.js'

callThreadsafeFunction((data) => {
  console.log(data) // Hello John
})
```

## Status de erro

O status de erro da `ThreadsafeFunction` é o mesmo do callback JavaScript. Você pode definir o status de erro no quarto parâmetro genérico de `ThreadsafeFunction`:

**lib.rs**

```rust {25}
use std::{sync::Arc, thread};

use napi::{
  bindgen_prelude::*,
  threadsafe_function::{ThreadsafeFunction, ThreadsafeFunctionCallMode},
};
use napi_derive::napi;

pub struct CustomErrorStatus(String);

impl AsRef<str> for CustomErrorStatus {
  fn as_ref(&self) -> &str {
    &self.0
  }
}

impl From<Status> for CustomErrorStatus {
  fn from(value: Status) -> Self {
    CustomErrorStatus(value.to_string())
  }
}

#[napi]
pub fn call_threadsafe_function(
  tsfn: Arc<ThreadsafeFunction<u32, u32, u32, CustomErrorStatus>>,
) -> Result<()> {
  for n in 0..100 {
    let tsfn = tsfn.clone();
    thread::spawn(move || {
      tsfn.call(
        Err(Error::new(
          CustomErrorStatus("Custom".to_owned()),
          format!("Custom error: {}", n),
        )),
        ThreadsafeFunctionCallMode::Blocking,
      );
    });
  }
  Ok(())
}
```

## Comportamento de erro de `CalleeHandled`

Há duas estratégias diferentes de tratamento de erros para `Threadsafe Function`. A estratégia pode ser definida no quinto parâmetro genérico de `ThreadsafeFunction`:

**lib.rs**

```rust
let tsfn: ThreadsafeFunction<u32, u32, u32, Status, false> = ...
```

### `CalleeHandled: true` (comportamento padrão)

Um `Err` do código Rust é passado no primeiro argumento do callback JavaScript. Esse comportamento segue as convenções de callback assíncrono do Node.js: https://nodejs.org/en/learn/asynchronous-work/javascript-asynchronous-programming-and-callbacks#handling-errors-in-callbacks. Muitas APIs assíncronas do Node.js foram projetadas dessa forma, como `fs.read`.

Com `CalleeHandled: true`, você deve chamar a `ThreadsafeFunction` com o tipo `Result` para que o `Error` seja tratado e passado ao callback JavaScript:

**lib.rs**

```rust {11,16-22}
use std::{sync::Arc, thread};

use napi::{
  bindgen_prelude::*,
  threadsafe_function::{ThreadsafeFunction, ThreadsafeFunctionCallMode},
};
use napi_derive::napi;

#[napi]
pub fn call_threadsafe_function(
  tsfn: Arc<ThreadsafeFunction<u32, (), u32, Status, true>>,
) -> Result<()> {
  for n in 0..100 {
    let tsfn = tsfn.clone();
    thread::spawn(move || {
      tsfn.call(
        Err(Error::new(
          Status::GenericFailure,
          format!("Error with: {n}"),
        )),
        ThreadsafeFunctionCallMode::Blocking,
      );
    });
  }
  Ok(())
}
```

⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️

**index.ts**

```ts {5}
import { callThreadsafeFunction } from './index.js'

callThreadsafeFunction((err, result) => {
  if (err) {
    console.error(err) // [Error: Error with: 0] { code: 'GenericFailure' }
  }
  console.log(result)
})
```

### `CalleeHandled: false`

Nenhum `Error` é passado de volta ao lado JavaScript. Você pode usar esta estratégia para evitar o wrapper `Ok` no lado Rust se seu código nunca retornar `Err`.

Com esta estratégia, a `ThreadsafeFunction` não precisa ser chamada com `Result<T>`, e o primeiro argumento do callback JavaScript é o valor vindo do Rust, não `Error | null`.

::: warning
Com a estratégia `CalleeHandled: false`, a `ThreadsafeFunction` não consegue
tratar um erro nas threads Rust, portanto você não pode enviar o `Error` de
volta ao lado JavaScript.

O método `call` comum não tem um canal para devolver erros ao Rust. Uma
exceção síncrona no callback JavaScript é encaminhada para
`napi_fatal_exception`, e uma `Promise` retornada não é aguardada
automaticamente. Se o Rust precisar do resultado do callback, defina um tipo
`Return` concreto e use `call_async_catch`, ou use `call_with_return_value` e
trate o `Result` recebido pelo callback de conclusão.

Use esse modo apenas quando os erros nativos já forem tratados antes de
`call` e o callback JavaScript não puder lançar uma exceção.

:::

**lib.rs**

```rust {11}
use std::{sync::Arc, thread};

use napi::{
  bindgen_prelude::*,
  threadsafe_function::{ThreadsafeFunction, ThreadsafeFunctionCallMode},
};
use napi_derive::napi;

#[napi]
pub fn call_threadsafe_function(
  tsfn: Arc<ThreadsafeFunction<u32, (), u32, Status, false>>,
) -> Result<()> {
  for n in 0..100 {
    let tsfn = tsfn.clone();
    thread::spawn(move || {
      tsfn.call(n, ThreadsafeFunctionCallMode::Blocking);
    });
  }
  Ok(())
}
```

⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️ ⬇️

**index.d.ts**

```ts {2}
export declare function callThreadsafeFunction(
  tsfn: (arg: number) => void,
): void
```

## ThreadsafeFunction `Weak`

Por padrão, a `ThreadsafeFunction` mantém vivo o event loop da thread na qual foi criada até que a `ThreadsafeFunction` seja destruída. Consulte [**Decidindo se o processo deve continuar em execução**](https://nodejs.org/api/n-api.html#deciding-whether-to-keep-the-process-running).

Se não quiser manter o processo/event loop do Node.js vivo, defina o parâmetro `Weak` de `ThreadsafeFunction` como `true`:

**lib.rs**

```rust {11}
use std::{sync::Arc, thread};

use napi::{
  bindgen_prelude::*,
  threadsafe_function::{ThreadsafeFunction, ThreadsafeFunctionCallMode},
};
use napi_derive::napi;

#[napi]
pub fn call_threadsafe_function(
  tsfn: Arc<ThreadsafeFunction<u32, (), u32, Status, false, true>>,
) -> Result<()> {
  for n in 0..100 {
    let tsfn = tsfn.clone();
    thread::spawn(move || {
      tsfn.call(n, ThreadsafeFunctionCallMode::Blocking);
    });
  }
  Ok(())
}
```

Se você chamar a função assim:

**index.ts**

```ts
import { callThreadsafeFunction } from './index.js'

// O modo Weak não mantém o event loop vivo por si só.
callThreadsafeFunction((n) => console.log(n))
```

Se nada mais mantiver o event loop vivo, o Node.js pode encerrar antes que alguns ou todos os callbacks enfileirados sejam executados. Outros handles ou trabalhos ativos podem manter o processo vivo por tempo suficiente para entregá-los. O modo Weak não garante a entrega nem suprime callbacks; ele apenas remove esta `ThreadsafeFunction` como motivo para manter o loop vivo.

## `MaxQueueSize`

Você pode definir o parâmetro `MaxQueueSize` de `ThreadsafeFunction` para limitar o número de mensagens na fila.

::: info
`MaxQueueSize` define a capacidade da fila nos dois modos de chamada. Quando a
capacidade é atingida, o modo `Blocking` espera por espaço; o modo `NonBlocking`
retorna imediatamente `Status::QueueFull` quando
a fila está cheia. Consulte [`napi_call_threadsafe_function`](https://nodejs.org/api/n-api.html#napi_call_threadsafe_function) para mais detalhes.

:::

**lib.rs**

```rust {11,16}
use std::{sync::Arc, thread};

use napi::{
  bindgen_prelude::*,
  threadsafe_function::{ThreadsafeFunction, ThreadsafeFunctionCallMode},
};
use napi_derive::napi;

#[napi]
pub fn call_threadsafe_function(
  tsfn: Arc<ThreadsafeFunction<u32, (), u32, Status, false, false, 1>>,
) -> Result<()> {
  thread::spawn(move || {
    for n in 0..100 {
      let tsfn = tsfn.clone();
      let status = tsfn.call(n, ThreadsafeFunctionCallMode::NonBlocking);
      println!("{}", status)
    }
  });
  Ok(())
}
```

Ao chamar essa função e adicionar trabalho pesado ao callback, você verá o status `QueueFull` retornado por `tsfn.call`:

**index.ts**

```ts
import { callThreadsafeFunction } from './index.js'

function fib(n: number): number {
  if (n <= 1) return n
  return fib(n - 1) + fib(n - 2)
}

callThreadsafeFunction(() => {
  fib(40)
})
```

Uma execução ilustrativa pode produzir uma saída como esta:

```
Ok
Ok
QueueFull
QueueFull
QueueFull
QueueFull
QueueFull
QueueFull
QueueFull
QueueFull
...
```

A quantidade e a ordem exatas de `Ok` e `QueueFull` dependem de quando a thread JavaScript esvazia a fila em relação à thread produtora. Uma capacidade de um garante o comportamento de backpressure, não uma sequência fixa de saída.
