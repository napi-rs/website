---
title: 'Build'
description: napi build command in @napi-rs/cli.
---

# Build

## Flags list

| Flag                | Tipo/Valor padrão                                                                                    | Descrição                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--platform`        | `Boolean`/`false`                                                                                    | Adiciona platform triple ao arquivo `.node`. <span class="chalk-green">[name].linux-x64-gnu.node</span> por exemplo.                                                                                                                                                                                                                                                                                                                                                                                                    |
| `--release`         | `Boolean`/`false`                                                                                    | Bypass para <span class="chalk-green">cargo build --release</span>                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `--config` ou `-c`  | `String`/`package.json`                                                                              | Caminho da configuração do NAPI, apenas o formato JSON é aceito. O padrão é <span class="chalk-green">package.json</span>                                                                                                                                                                                                                                                                                                                                                                                               |
| `--cargo-name`      | `String`/O campo `[package].name` no <span class="chalk-rust">Cargo.toml</span> sob o comando `cwd`. | `@napi-rs/cli` irá copiar o arquivo `./target/release/lib_[CARGO_NAME].[dll/dylib/so]` para `[NAPI_NAME].[TRIPLE?].node` por padrão. O `[CARGO_NAME]` no caminho de origem é lido do <span class="chalk-rust">Cargo.toml</span> no `cwd` por padrão. Se você estiver compilando algum outro crate que não seja o cwd atual usando a flag `cargo build -p`, você deve substituir o `CARGO_NAME` com `--cargo-name`.                                                                                                      |
| `--target`          | `String`/`undefined`                                                                                 | Bypass para <span class="chalk-green">cargo build --target</span>, use esta flag para compilar cruzado.<br /><span class="chalk-warning">⚠️ Se nenhum `--target` for especificado, `@napi-rs/cli` invocará `rustup` para determinar o target atual para o qual você está compilando. Certifique-se de ter `rustup` instalado em seu `PATH` se esta flag for omitida.</span>                                                                                                                                             |
| `--features`        | `String`/`undefined`                                                                                 | Bypass para <span class="chalk-green">cargo build --features</span>                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `--bin`             | `String`/`undefined`                                                                                 | Bypass para <span class="chalk-green">cargo build --bin</span>                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `--const-enum`      | `Boolean`/`true`                                                                                     | Gerar `const enum` no arquivo `.d.ts` ou não.                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `--dts`             | `String`/`index.d.ts`                                                                                | O nome do arquivo e o caminho do arquivo `.d.ts` gerado, em relação ao comando cwd. <br />Se você não quer que o **NAPI-RS** gere o arquivo `.d.ts` para você, você pode desabilitar o recurso `type-def` no crate `napi-derive`. <br />ex: `napi-derive = { version = "2", default-features = false }`<br /><span class="chalk-warning">⚠️ Se o recurso `type-def` estiver desabilitado, o **NAPI-RS** também não gerará o arquivo de binding JavaScript para você devido à falta de **_informações de tipo_**</span>. |
| `-p`                | `String`/`undefined`                                                                                 | Bypass para <span class="chalk-green">cargo build -p</span>                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `--cargo-flags`     | `String`/`''`                                                                                        | All the others flag bypass to <span class="chalk-green">cargo build</span> command.                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `--js`              | `String`/`index.js`                                                                                  | O nome do arquivo e o caminho do arquivo de binding JavaScript, relativos ao diretório de comando `cwd`, Passe <span class="chalk-warning">false</span> para desativá-lo. Apenas tem efeito se <span class="chalk-green">--platform</span> for especificado **e** o recurso `type-def` em `napi-derive` estiver habilitado.                                                                                                                                                                                             |
| `--js-package-name` | `String`/`name` campo no <span class="chalk-green">package.json</span> sob o comando cwd.            | O nome dos pacotes no arquivo de binding js gerado, Apenas afeta se <span class="chalk-green">--js</span> for afetado. [#Observação](#note-for---js-package-name)<br /><span class="chalk-warning">⚠️ Esta flag substituirá o campo `package.name` na configuração do napi</span><br />Você pode omiti-lo se tiver especificado a configuração `package.name` do [**napi config**](./napi-config)                                                                                                                       |
| `--cargo-cwd`       | `String`/`process.cwd()`                                                                             | O cwd do `Cargo.toml`. Especifique essa flag se você não deseja passar <span class="chalk-green">--cargo-name</span>                                                                                                                                                                                                                                                                                                                                                                                                    |
| `--pipe`            | `String`/`undefined`                                                                                 | Encaminhe os arquivos <span class="chalk-green">.js/.d.ts</span> gerados para este comando, ex: <span class="chalk-green">`prettier -w`</span>                                                                                                                                                                                                                                                                                                                                                                          |
| `--zig`             | `Boolean`/`false`                                                                                    | `@napi-rs/cli` usará [zig](https://andrewkelley.me/post/zig-cc-powerful-drop-in-replacement-gcc-clang.html) como `cc` / `cxx` e `linker` para compilar seu programa.                                                                                                                                                                                                                                                                                                                                                    |
| `--zig-abi-suffix`  | `String`/`''`                                                                                        | O sufixo da versão da ABI `zig --target`. Ex: `--target x86_64-unknown-linux-gnu` <span class="chalk-green">--zig-abi-suffix=2.17</span>                                                                                                                                                                                                                                                                                                                                                                                |
| `--zig-link-only`   | `Boolean/false`                                                                                      | `@napi-rs/cli` configurará as variáveis de ambiente `CC` e `CXX` para usar `zig cc`/`zig c++` para compilar cruzadamente as dependências C/C++ nos crates. Mas se você já configurou a cadeia de ferramentas de compilação cruzada C/C++, talvez queira usar apenas `zig` linker de compilação cruzada. Passe esta flag para `@napi-rs/cli` e então não será configurado as variáveis de ambiente `CC` e `CXX` para suas compilações.                                                                                   |

## Observações para `--js-package-name`

Na seção de [aprofundamento](../introduction/getting-started#deep-dive), recomendamos que você publique seu pacote sob um [`escopo npm`](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/). Mas se você estiver migrando um pacote existente que não está sob um [`escopo npm`](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/) ou simplesmente não deseja que seu pacote esteja sob um [`escopo npm`](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/) , você pode acionar a [_deteção de spam do npm_](https://stackoverflow.com/questions/48668389/npm-publish-failed-with-package-name-triggered-spam-detection/54135900#54135900) ao publicar os pacotes de plataforma nativa. Como `snappy-darwin-x64` `snappy-darwin-arm64` etc...

Nesse caso, você pode publicar seus pacotes de plataforma sob um [`escopo npm`](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/) para evitar a [_deteção de spam do npm_](https://stackoverflow.com/questions/48668389/npm-publish-failed-with-package-name-triggered-spam-detection/54135900#54135900). E seus usuários não precisam se preocupar com os pacotes nativos da plataforma em `optionalDependencies`. Como [`snappy`](https://github.com/Brooooooklyn/snappy/), os usuários só precisam instalá-lo via `yarn add snappy`. Mas os pacotes nativos da plataforma estão sob o escopo `@napi-rs`:

```json
{
  "name": "snappy",
  "version": "7.0.0",
  "optionalDependencies": {
    "@napi-rs/snappy-win32-x64-msvc": "7.0.0",
    "@napi-rs/snappy-darwin-x64": "7.0.0",
    "@napi-rs/snappy-linux-x64-gnu": "7.0.0",
    "@napi-rs/snappy-linux-x64-musl": "7.0.0",
    "@napi-rs/snappy-linux-arm64-gnu": "7.0.0",
    "@napi-rs/snappy-win32-ia32-msvc": "7.0.0",
    "@napi-rs/snappy-linux-arm-gnueabihf": "7.0.0",
    "@napi-rs/snappy-darwin-arm64": "7.0.0",
    "@napi-rs/snappy-android-arm64": "7.0.0",
    "@napi-rs/snappy-android-arm-eabi": "7.0.0",
    "@napi-rs/snappy-freebsd-x64": "7.0.0",
    "@napi-rs/snappy-linux-arm64-musl": "7.0.0",
    "@napi-rs/snappy-win32-arm64-msvc": "7.0.0"
  }
}
```

Para este caso, `@napi-rs/cli` fornece o `--js-package-name` para substituir a lógica de carregamento de pacotes gerados. Por exemplo, no `snappy`, temos um <span class="chalk-green">package.json</span> assim:

```json
{
  "name": "snappy",
  "version": "7.0.0",
  "napi": {
    "name": "snappy"
  }
}
```

Sem a flag `--js-package-name`, `@napi-rs/cli` vai gerar a binding JavaScript para carregar pacotes nativos da plataforma para você:

**index.js**

```js {10,22}
switch (platform) {
  case 'darwin':
    switch (arch) {
      case 'x64':
        localFileExisted = existsSync(join(__dirname, 'snappy.darwin-x64.node'))
        try {
          if (localFileExisted) {
            nativeBinding = require('./snappy.darwin-x64.node')
          } else {
            nativeBinding = require('snappy-darwin-x64')
          }
        } catch (e) {
          loadError = e
        }
        break
      case 'arm64':
        localFileExisted = existsSync(join(__dirname, 'snappy.darwin-arm64.node'))
        try {
          if (localFileExisted) {
            nativeBinding = require('./snappy.darwin-arm64.node')
          } else {
            nativeBinding = require('snappy-darwin-arm64')
          }
        } catch (e) {
          loadError = e
        }
        break
      default:
        throw new Error(`Unsupported architecture on macOS: ${arch}`)
    }
    break
    ...
}
```

Isso não é o que queremos. Então, construa com `--js-package-name` para substituir o `package name` no arquivo de binding JavaScript gerado: `napi build --release --platform --js-package-name @napi-rs/snappy`. Em seguida, o arquivo JavaScript gerado se tornará:

**index.js**

```js {10,22}
switch (platform) {
  case 'darwin':
    switch (arch) {
      case 'x64':
        localFileExisted = existsSync(join(__dirname, 'snappy.darwin-x64.node'))
        try {
          if (localFileExisted) {
            nativeBinding = require('./snappy.darwin-x64.node')
          } else {
            nativeBinding = require('@napi-rs/snappy-darwin-x64')
          }
        } catch (e) {
          loadError = e
        }
        break
      case 'arm64':
        localFileExisted = existsSync(join(__dirname, 'snappy.darwin-arm64.node'))
        try {
          if (localFileExisted) {
            nativeBinding = require('./snappy.darwin-arm64.node')
          } else {
            nativeBinding = require('@napi-rs/snappy-darwin-arm64')
          }
        } catch (e) {
          loadError = e
        }
        break
      default:
        throw new Error(`Unsupported architecture on macOS: ${arch}`)
    }
    break
    ...
}
```
