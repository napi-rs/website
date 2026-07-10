---
title: 'Um pacote simples'
description: Crie, compile, teste e prepare um pacote napi-rs v3.
---

# Um pacote simples

Este tutorial cria um addon napi-rs v3, chama-o a partir do Node.js e prepara o
projeto para CI. Primeiro, conclua os [pré-requisitos](./getting-started#prerequisites).

## Crie o projeto

Escolha um nome de pacote que você controle. Um escopo é fortemente
recomendado porque o workflow de release cria um pacote npm por target.

O comando abaixo usa o template Yarn e fornece os padrões não interativos para
tudo o mais:

```sh
npx @napi-rs/cli new cool \
  --name @your-scope/cool \
  --no-interactive
```

Para usar o template pnpm em vez disso:

```sh
pnpm dlx @napi-rs/cli new cool \
  --name @your-scope/cool \
  --package-manager pnpm \
  --no-interactive
```

Substitua `@your-scope` antes de executar o comando. Se quiser escolher
interativamente o nível de Node-API, os targets, a licença e o workflow de CI,
omita `--no-interactive`.

::: info
`napi new` é compatível com os templates mantidos de Yarn e pnpm. Ele não
gera um template genérico que possa ser trocado depois para um gerenciador de
pacotes arbitrário.

:::

## Entenda o projeto gerado

Entre no projeto e instale as dependências:

```sh
cd cool
yarn install
```

Use `pnpm install` para o template pnpm. Os primeiros arquivos com que você vai
trabalhar são:

```text
.
├── .github/workflows/CI.yml
├── Cargo.toml
├── build.rs
├── package.json
├── src/lib.rs
└── __test__/index.spec.ts
```

- `src/lib.rs` é o código-fonte do addon Rust.
- `Cargo.toml` declara um `cdylib` e os crates napi-rs v3.
- `build.rs` chama a configuração de build do napi-rs e deve permanecer na raiz
  do crate.
- `package.json` contém os scripts da CLI e a configuração de empacotamento
  `napi`.
- `.github/workflows/CI.yml` compila e testa as linhas de target mantidas do
  template.

`npm/` ainda não existe. Depois das builds de plataforma, o job de publicação
cria seus diretórios de pacote por plataforma com `napi create-npm-dirs`.

O código-fonte Rust gerado exporta uma pequena função:

**src/lib.rs**

```rust
#![deny(clippy::all)]

use napi_derive::napi;

#[napi]
pub fn plus_100(input: u32) -> u32 {
  input + 100
}
```

O macro expõe a função Rust como a função JavaScript `plus100` e grava a
declaração TypeScript correspondente durante a build.

## Compile o addon

Execute a build de release do template para sua plataforma atual:

```sh
yarn build
```

Para pnpm, execute `pnpm build`. O script invoca `napi build --platform
--release` e produz arquivos como:

```text
cool.darwin-arm64.node
index.js
index.d.ts
```

O sufixo exato de `.node` acompanha seu sistema operacional, arquitetura e ABI
atuais. Uma build Linux glibc, por exemplo, usa `linux-x64-gnu`. Use
`yarn build:debug` quando quiser uma build de depuração.

A declaração gerada contém:

**index.d.ts**

```ts
export declare function plus100(input: number): number
```

Chame a função nativa a partir do Node.js:

```sh
node -e "const { plus100 } = require('./index.js'); console.log(plus100(42))"
```

A saída é:

```text
142
```

## Altere e teste a API Rust

Adicione outra função exportada a `src/lib.rs`:

**src/lib.rs**

```rust
#[napi]
pub fn multiply(left: i32, right: i32) -> i32 {
  left * right
}
```

Recompile e então verifique tanto a exportação em runtime quanto os tipos
gerados:

```sh
yarn build
node -e "const { multiply } = require('./index.js'); console.log(multiply(6, 7))"
```

Adicione uma asserção AVA correspondente em `__test__/index.spec.ts`:

\***\*test**/index.spec.ts\*\*

```ts
import test from 'ava'

import { multiply } from '../index'

test('multiply in native code', (t) => {
  t.is(multiply(6, 7), 42)
})
```

Execute os testes:

```sh
yarn test
```

## Prepare o repositório

Antes de enviar o workflow gerado, atualize `package.json`:

- Defina `name` como um pacote e escopo que você possa publicar.
- Defina `repository` como o repositório final no GitHub. O npm provenance
  verifica esses metadados, então não deixe a URL do repositório do template.
- Revise `license`, `description`, `keywords`, `homepage` e `bugs`.
- Revise `napi.targets`. Ele controla a criação e a publicação dos pacotes, mas
  cada target ainda precisa de um job de build real na CI.

Se o nome ou o nome do binário mudar depois, use a CLI para que Cargo,
configuração do pacote, CI e nomes de binding gerados permaneçam alinhados:

```sh
yarn napi rename \
  --name @your-scope/cool \
  --binary-name cool \
  --repository https://github.com/your-name/cool.git
```

Então crie e envie o repositório:

```sh
git init
git add .
git commit -m "Create napi-rs package"
git branch -M main
git remote add origin git@github.com:your-name/cool.git
git push -u origin main
```

## Prepare o npm e o GitHub Actions

O workflow gerado publica via npm e cria uma release no GitHub. Para a
configuração baseada em token:

1. Crie o escopo npm e o nível de acesso do pacote que pretende usar.
2. Crie um token de automação do npm que possa publicar o pacote raiz e todos
   os pacotes por plataforma.
3. Adicione-o como secret `NPM_TOKEN` do Actions.
4. Mantenha a permissão `contents: write` do workflow para releases no GitHub e
   a permissão `id-token: write` para npm provenance.
5. Faça o caminho normal da CI passar com sucesso antes de tentar uma release.

::: warning
A publicação não é atômica. `napi pre-publish` atualiza metadados dos
pacotes, publica pacotes de plataforma e pode criar ou atualizar uma release
no GitHub antes de o npm publicar o pacote raiz. Não o use como comando de
teste com credenciais reais.

:::

Leia [Publicar pacotes nativos](/pt-BR/docs/deep-dive/release) para o procedimento
completo de pré-checagem, release e recuperação. Os efeitos colaterais exatos e
as flags estão documentados em [`napi pre-publish`](/pt-BR/docs/cli/pre-publish).

## Para onde ir agora

- [Values](/pt-BR/docs/concepts/values) para conversões de Rust para JavaScript.
- [Funções assíncronas](/pt-BR/docs/concepts/async-fn) para exportações assíncronas.
- [Suporte e compatibilidade](/pt-BR/docs/more/support-compatibility) antes de
  ampliar a matriz de targets.
- [Compilação cruzada](/pt-BR/docs/cross-build) para builds fora do host.
