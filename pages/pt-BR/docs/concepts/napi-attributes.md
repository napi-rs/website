---
title: 'Atributos #[napi]'
description: Referência baseada no código-fonte para todos os atributos públicos do napi-derive.
---

# Atributos `#[napi]`

O macro `#[napi]` exporta itens Rust e controla o comportamento deles em tempo de execução no JavaScript e as declarações TypeScript geradas. Esta página abrange todas as opções públicas aceitas pelo `napi-derive` v3, incluindo as duas opções específicas de contexto analisadas em parâmetros e variantes de enum.

**lib.rs**

```rust
use napi::bindgen_prelude::*;
use napi_derive::napi;

#[napi(js_name = "addOne", strict)]
pub fn add_one(value: u32) -> u32 {
  value + 1
}
```

::: info
A conversão em tempo de execução e a geração de TypeScript são independentes.
As opções que começam com `ts_`, além de `skip_typescript`, alteram apenas a
declaração emitida pelo recurso padrão `type-def` do `napi-derive`. Elas não
adicionam validação nem conversão em tempo de execução.

:::

## Alvos compatíveis

Nas tabelas abaixo:

- **Função** significa uma função livre exportada.
- **Método** inclui métodos de instância, métodos estáticos, fábricas, construtores, getters e setters quando a opção fizer sentido.
- **Classe** significa uma struct exportada com identidade de classe. Uma struct `object`, `array` ou `transparent` é uma forma de valor.
- **Campo** significa um campo de struct ou de uma variante de enum estruturado.

Com o recurso padrão `napi-derive/strict`, uma opção aceita pelo analisador, mas não utilizada naquele tipo de item, causa um erro de compilação. Prefira as combinações documentadas aqui em vez de depender do comportamento com `strict` desabilitado.

## Nomes e exportações

| Opção                | Alvo válido                                                           | Efeito em tempo de execução                                                                                                                                                                 | Efeito no TypeScript                                                                       | Recurso / estado |
| -------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ---------------- |
| `js_name = "name"`   | Função, método, struct, enum, constante, alias de tipo, campo, módulo | Substitui o nome padrão em camelCase de uma função/membro ou em PascalCase de um tipo. Em um `mod`, nomeia o objeto de namespace. Um alias de tipo não tem exportação em tempo de execução. | Usa o mesmo nome exportado; em um alias de tipo, apenas renomeia a declaração.             | Compatível       |
| `namespace = "name"` | Função, struct, impl, enum, constante, alias de tipo                  | Registra o item em `exports.name`. Aplique o mesmo namespace a uma classe e aos blocos `impl` dela. Um alias de tipo não tem registro em tempo de execução.                                 | Coloca a declaração no mesmo namespace gerado; em um alias de tipo, esse é o único efeito. | Compatível       |
| `module_exports`     | Somente função livre                                                  | Executa a função durante a inicialização do módulo com o objeto `exports` do módulo.                                                                                                        | Nenhuma declaração de função é emitida.                                                    | Compatível       |
| `no_export`          | Somente função livre                                                  | Gera o wrapper de callback do Node-API sem registrar a função em `exports`. Isso é útil ao passar o `*_c_callback` gerado para uma API de baixo nível.                                      | Nenhuma declaração é emitida.                                                              | Compatível       |

Um módulo Rust inline pode ser convertido em um namespace JavaScript. Somente os filhos que também têm `#[napi]` são exportados, e módulos napi aninhados não são compatíveis.

**lib.rs**

```rust
#[napi(js_name = "math")]
mod arithmetic {
  #[napi]
  pub fn add(a: u32, b: u32) -> u32 {
    a + b
  }
}
```

**index.d.ts**

```ts
export namespace math {
  export function add(a: number, b: number): number
}
```

### `module_exports`

O callback deve ser uma função livre não genérica. Ele só pode aceitar `Env`, `Object` ou referências a eles e só pode retornar `()` ou `Result<()>`. Não pode ser combinado com `constructor`, `factory`, `getter`, `setter`, `js_name`, `strict`, `return_if_invalid` nem `no_export`.

**lib.rs**

```rust
#[napi(module_exports)]
pub fn initialize(mut exports: Object) -> Result<()> {
  exports.set("build", "release")?;
  Ok(())
}
```

Para uma inicialização que não precise do objeto exports, consulte [Inicialização de módulo](/pt-BR/docs/concepts/module-init).

## Funções e métodos

| Opção                       | Alvo válido                                                                       | Efeito em tempo de execução                                                                                                                | Efeito no TypeScript                                               | Recurso / estado                                              |
| --------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------- |
| `constructor`               | Método que retorna `Self`/`Result<Self>`; forma abreviada em uma struct de classe | Expõe um construtor JavaScript. Construtores não podem ser assíncronos. Em uma struct, campos públicos se tornam argumentos do construtor. | Emite `constructor(...)`.                                          | Compatível                                                    |
| `factory`                   | Método associado que retorna `Self`/`Result<Self>`                                | Expõe uma fábrica estática que constrói a classe. Pode ser assíncrona.                                                                     | Emite um método estático que retorna a classe ou `Promise<Class>`. | Compatível                                                    |
| `getter` ou `getter = name` | Método                                                                            | Define um getter de propriedade JavaScript. Sem um nome, `get_value` se torna `value`.                                                     | Emite um acessor `get`.                                            | Compatível                                                    |
| `setter` ou `setter = name` | Método                                                                            | Define um setter de propriedade JavaScript. Sem um nome, `set_value` se torna `value`.                                                     | Emite um acessor `set`.                                            | Compatível                                                    |
| `strict`                    | Função ou método                                                                  | Chama `ValidateNapiValue` para cada argumento JavaScript antes da conversão e lança uma exceção em caso de incompatibilidade.              | Nenhum.                                                            | Compatível                                                    |
| `return_if_invalid`         | Função ou método                                                                  | Faz a validação, mas retorna `undefined` em vez de lançar uma exceção para um argumento inválido.                                          | Nenhum.                                                            | Compatível                                                    |
| `catch_unwind`              | Função ou método                                                                  | Captura um panic Rust em desenrolamento no limite do callback gerado e converte sua carga em um `Error` JavaScript.                        | Nenhum.                                                            | Requer uma estratégia de panic com desenrolamento; compatível |
| `async_runtime`             | Função ou método síncrono                                                         | Entra no runtime Tokio do napi-rs durante a execução da função quando esse runtime está habilitado. Sem ele, o wrapper não faz nada.       | Nenhum.                                                            | Útil com `napi/tokio_rt`; compatível                          |
| `enumerable = false`        | Método                                                                            | Limpa o sinalizador enumerable do descritor. Omitir o valor equivale a `true`.                                                             | Nenhum.                                                            | Compatível                                                    |
| `writable = false`          | Método                                                                            | Limpa o sinalizador writable do descritor. Omitir o valor equivale a `true`.                                                               | Nenhum.                                                            | Compatível                                                    |
| `configurable = false`      | Método                                                                            | Limpa o sinalizador configurable do descritor. Omitir o valor equivale a `true`.                                                           | Nenhum.                                                            | Compatível                                                    |

`strict` e `return_if_invalid` são mutuamente exclusivos. Eles validam a implementação de `ValidateNapiValue` do tipo Rust; não fazem validação arbitrária de schema. Os elementos de um `Vec<T>` aninhado são convertidos um a um, e a conversão ainda pode falhar depois da verificação inicial do array.

A validação executa no callback JavaScript gerado antes que uma future Rust
assíncrona seja criada. Em um export assíncrono, `strict` pode portanto lançar
uma exceção sincronamente, enquanto `return_if_invalid` retorna `undefined`
síncrono para uma entrada inválida, em vez de uma Promise. Esses atributos não
alteram o tipo de retorno assíncrono gerado; documente esse caminho excepcional.

::: warning
`catch_unwind` não é um limite de segurança do processo. Ele não pode capturar
um panic que aborta o processo, e o Rust não garante que todo panic possa ser
desenrolado. Use `Result` para falhas esperadas. Consulte [Tratamento de erros](/pt-BR/docs/concepts/error-handling).

:::

## Classes e formas de valor

| Opção                                   | Alvo válido                               | Efeito em tempo de execução                                                                                                                                                                                                                                         | Efeito no TypeScript                                      | Recurso / estado                             |
| --------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | -------------------------------------------- | ------------------------------ |
| `object`                                | Struct                                    | Converte um objeto JavaScript de/para um valor Rust próprio. Todos os campos devem ser públicos. Não tem identidade de classe JavaScript.                                                                                                                           | Emite uma interface.                                      | Compatível                                   |
| `array`                                 | Struct de tupla                           | Converte a struct de tupla de/para um array JavaScript.                                                                                                                                                                                                             | Emite um tipo de tupla.                                   | Compatível                                   |
| `transparent`                           | Struct de tupla com um único campo        | Delega a conversão ao campo interno em vez de criar um objeto wrapper.                                                                                                                                                                                              | Emite um alias do tipo TypeScript interno.                | Compatível                                   |
| `object_from_js = false`                | Struct object, array ou transparent; enum | Omite `FromNapiValue`; o tipo não pode ser aceito do JavaScript pela conversão gerada.                                                                                                                                                                              | Nenhum.                                                   | Compatível                                   |
| `object_to_js = false`                  | Struct object, array ou transparent; enum | Omite `ToNapiValue`; o tipo não pode ser retornado ao JavaScript pela conversão gerada.                                                                                                                                                                             | Nenhum.                                                   | Compatível                                   |
| `use_nullable` ou `use_nullable = true` | Classe, object, array, enum estruturado   | Para campos de object e enum estruturado, emite `None` como `null` em vez de omiti-lo e exige a propriedade na entrada. Para arrays, escreve/exige o índice da tupla em vez de deixar/aceitar uma lacuna. A conversão de acessores e construtor de classe não muda. | Emite uma propriedade ou elemento de tupla obrigatório `T | null`. Em uma classe, esse é o único efeito. | Compatível; o padrão é `false` |
| `custom_finalize`                       | Struct de classe                          | Impede que o napi-derive gere a implementação vazia padrão de `ObjectFinalize`, portanto a classe deve implementá-la.                                                                                                                                               | Nenhum.                                                   | Compatível                                   |
| `iterator`                              | Struct de classe                          | Faz cada instância implementar o protocolo de iterador síncrono.                                                                                                                                                                                                    | Estende `Iterator<Yield, Return, Next>`.                  | **Experimental**                             |
| `async_iterator`                        | Struct de classe                          | Faz cada instância implementar o protocolo de iterador assíncrono.                                                                                                                                                                                                  | Adiciona `[Symbol.asyncIterator](): AsyncGenerator<...>`. | `napi/tokio_rt`; **experimental**            |

Os controles de direção são controles de compilação: desabilitar uma direção remove a implementação do trait de conversão correspondente. Isso é útil para formas somente de entrada que contêm callbacks ou formas somente de saída que contêm dados que não podem ser lidos do JavaScript.

**lib.rs**

```rust
#[napi(object, object_to_js = false)]
pub struct Request {
  pub path: String,
  pub on_chunk: ThreadsafeFunction<Buffer>,
}

#[napi(transparent)]
pub struct UserId(pub String);

#[napi(array)]
pub struct Point(pub f64, pub f64);
```

Para um campo de object ou enum estruturado, o modo padrão aceita uma propriedade ausente como `None` e omite `None` na saída. Um valor presente é convertido como o `T` interno, portanto `null` e `undefined` não são aceitos universalmente. Com `use_nullable = true`, a propriedade é obrigatória, a conversão de `Option<T>` aceita `null` como `None`, e a saída usa `null`; uma propriedade ausente ou `undefined` ainda é rejeitada. Arrays aplicam a mesma distinção a um índice de tupla ausente ou obrigatório contendo `null`. Em uma classe, acessores e argumentos do construtor abreviado já usam a conversão normal de `Option<T>`, e getters retornam `null` para `None`; `use_nullable` muda apenas a forma TypeScript gerada.

### Campos {#fields}

| Opção                                    | Alvo válido                         | Efeito em tempo de execução                                                                                                                                               | Efeito no TypeScript                    | Recurso / estado                                            |
| ---------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ----------------------------------------------------------- |
| `js_name = "name"`                       | Campo de struct ou enum estruturado | Usa outro nome de propriedade JavaScript.                                                                                                                                 | Usa a propriedade renomeada.            | Compatível                                                  |
| `skip`                                   | Campo de classe ou forma de valor   | Em uma classe, omite os acessores de propriedade gerados. A conversão da forma de valor ainda lê e escreve o campo.                                                       | Omite o campo.                          | Compatível; veja a limitação do construtor abreviado abaixo |
| `readonly`                               | Campo de classe ou forma de valor   | Em uma classe, gera um getter, mas nenhum setter. Não muda a conversão da forma de valor.                                                                                 | Adiciona `readonly`.                    | Compatível                                                  |
| `writable`, `enumerable`, `configurable` | Campo exposto                       | Controla os sinalizadores do descritor de propriedades de classe. Saídas object e enum estruturado sempre usam propriedades de dados writable, enumerable e configurable. | Nenhum.                                 | Compatível                                                  |
| `ts_type = "..."`                        | Campo exposto                       | Nenhum.                                                                                                                                                                   | Substitui o tipo de campo inferido.     | `napi-derive/type-def`                                      |
| `skip_typescript`                        | Campo exposto                       | O campo continua presente em tempo de execução.                                                                                                                           | Omite somente esse campo da declaração. | `napi-derive/type-def`                                      |

Em uma classe normal, `skip` remove o acessor JavaScript gerado, enquanto `skip_typescript` mantém o acessor em tempo de execução e oculta apenas sua declaração. Em um object, array ou enum estruturado, `skip` e `readonly` afetam a declaração gerada, mas a conversão em tempo de execução ainda processa o campo. Evite `skip` com a forma abreviada de struct `#[napi(constructor)]`: o construtor gerado ainda consome todos os campos, embora o campo omitido não apareça na assinatura TypeScript.

## Enums {#enums}

| Opção                            | Alvo válido                  | Efeito em tempo de execução                                          | Efeito no TypeScript                           | Recurso / estado |
| -------------------------------- | ---------------------------- | -------------------------------------------------------------------- | ---------------------------------------------- | ---------------- | ---------- |
| `string_enum`                    | Enum sem campos              | Converte variantes em strings em vez de valores inteiros.            | Emite membros de enum com valores string.      | Compatível       |
| `string_enum = "case"`           | Enum sem campos              | Converte os nomes das variantes usando o case escolhido.             | Usa os valores string convertidos.             | Compatível       |
| `value = "literal"`              | Variante de um `string_enum` | Substitui a string JavaScript de uma variante.                       | Usa o valor literal.                           | Compatível       |
| `discriminant = "key"`           | Enum estruturado             | Altera a propriedade discriminadora do padrão `type`.                | Usa a mesma propriedade na união discriminada. | Compatível       |
| `discriminant_case = "case"`     | Enum estruturado             | Altera como os nomes das variantes são codificados no discriminador. | Usa os mesmos valores codificados.             | Compatível       |
| `use_nullable`                   | Enum estruturado             | Aplica o comportamento de campos nullable aos campos das variantes.  | Controla campos opcionais versus `T            | null`.           | Compatível |
| `object_from_js`, `object_to_js` | Qualquer enum                | Habilita ou desabilita a conversão gerada em uma direção.            | Nenhum.                                        | Compatível       |

Os nomes de case aceitos são `lowercase`, `UPPERCASE`, `PascalCase`, `camelCase`, `snake_case`, `UPPER_SNAKE`, `kebab-case` e `UPPER-KEBAB-CASE`.

**lib.rs**

```rust
#[napi(string_enum = "kebab-case")]
pub enum Mode {
  ReadOnly,
  #[napi(value = "read-write")]
  Writable,
}

#[napi(discriminant = "kind", discriminant_case = "camelCase")]
pub enum Event {
  Ready,
  FileChanged { path: String },
  Progress(u32, u32),
}
```

`string_enum` aceita somente variantes sem campos e não pode ser combinado com discriminantes Rust explícitos. Um enum que contém qualquer variante com dados é um enum estruturado; cada variante se torna um objeto com o discriminador e seus campos. Um campo cujo nome JavaScript seja igual ao discriminador é rejeitado.

## Substituições de TypeScript

| Opção                      | Alvo válido                                           | Efeito na declaração                                                                                                                                       | Restrições importantes                                                                                                                                                                                                   |
| -------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ts_arg_type = "..."`      | Um parâmetro de função                                | Substitui o tipo inferido desse parâmetro.                                                                                                                 | Atributo de parâmetro específico de contexto. Mutuamente exclusivo com `ts_args_type` no nível da função.                                                                                                                |
| `ts_args_type = "..."`     | Função ou método                                      | Substitui a lista completa de parâmetros separados por vírgulas.                                                                                           | Mutuamente exclusivo com todo `ts_arg_type` no nível do parâmetro.                                                                                                                                                       |
| `ts_return_type = "..."`   | Função ou método                                      | Substitui o tipo de retorno inferido.                                                                                                                      | Para uma função assíncrona, inclua o tipo completo desejado, normalmente `Promise<T>`.                                                                                                                                   |
| `ts_generic_types = "..."` | Função ou método                                      | Adiciona o texto entre `<...>` antes dos argumentos.                                                                                                       | A string deve ser uma sintaxe válida de parâmetros genéricos do TypeScript.                                                                                                                                              |
| `ts_type = "..."`          | Função/método ou campo                                | Em uma função, substitui todo o sufixo da assinatura depois do nome exportado; em um campo, substitui seu tipo.                                            | `ts_type` no nível da função não pode ser combinado com `ts_args_type` nem `ts_return_type`. Ele também substitui a seção genérica; inclua os genéricos dentro de `ts_type` em vez de combiná-lo com `ts_generic_types`. |
| `skip_typescript`          | Função, método, campo, enum, constante, alias de tipo | Omite a declaração e mantém a exportação em tempo de execução. Um alias de tipo não tem exportação em tempo de execução, portanto desaparece por completo. | Não é válido em uma struct inteira nem em um bloco `impl`.                                                                                                                                                               |

**lib.rs**

```rust
#[napi(
  ts_generic_types = "T",
  ts_args_type = "value: T",
  ts_return_type = "T"
)]
pub fn identity<'env>(value: Unknown<'env>) -> Unknown<'env> {
  value
}

#[napi(ts_type = "(operation: 'add' | 'subtract', a: number, b: number): number")]
pub fn calculate(operation: String, a: i32, b: i32) -> i32 {
  match operation.as_str() {
    "add" => a + b,
    "subtract" => a - b,
    _ => 0,
  }
}
```

Essas strings são inseridas na declaração gerada; o napi-rs não as analisa como TypeScript nem verifica se descrevem o comportamento em tempo de execução. Mantenha as conversões em tempo de execução como fonte autoritativa e teste o arquivo `.d.ts` gerado.

## Iteradores

`iterator` e `async_iterator` são mutuamente exclusivos. Uma classe geradora não pode expor campos públicos chamados `next`, `return` ou `throw`, pois o napi-rs instala esses métodos de protocolo. Consulte [Iteradores e iteradores assíncronos](/pt-BR/docs/concepts/iterators) para ver os traits obrigatórios e as restrições de ciclo de vida.

## Índice de opções

O analisador geral aceita estas opções:

`catch_unwind`, `async_runtime`, `module_exports`, `js_name`, `constructor`, `factory`, `getter`, `setter`, `readonly`, `enumerable`, `writable`, `configurable`, `skip`, `strict`, `return_if_invalid`, `object`, `object_from_js`, `object_to_js`, `custom_finalize`, `namespace`, `iterator`, `async_iterator`, `ts_args_type`, `ts_return_type`, `ts_type`, `ts_generic_types`, `string_enum`, `use_nullable`, `discriminant`, `discriminant_case`, `transparent`, `array`, `no_export` e `skip_typescript`.

Os analisadores específicos de contexto também aceitam `ts_arg_type` em um parâmetro de função e `value` em uma variante de string enum.
