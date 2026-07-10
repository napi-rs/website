---
title: 'Build'
description: Comando napi build do @napi-rs/cli, suas flags de compilação cruzada e os comandos e variáveis de ambiente exatos que ele executa.
---

# Build

Compila o projeto NAPI-RS

## Uso

```sh
# CLI
napi build [--options]
```

```typescript
// Programaticamente
import { NapiCli } from '@napi-rs/cli'

new NapiCli().build({
  // opções
})
```

## Opções

| Opções            | Opções da CLI         | tipo     | obrigatório | padrão | descrição                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ----------------- | --------------------- | -------- | ----------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|                   | --help,-h             |          |             |        | obter ajuda                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| target            | --target,-t           | string   | false       |        | Compila para o target triple informado, repassado para <span class="chalk-green">cargo build --target</span>                                                                                                                                                                                                                                                                                                                                                                                             |
| cwd               | --cwd                 | string   | false       |        | O diretório de trabalho em que o comando napi será executado; todas as outras opções de caminho são relativas a ele                                                                                                                                                                                                                                                                                                                                                                                      |
| manifestPath      | --manifest-path       | string   | false       |        | Caminho para <span class="chalk-rust">Cargo.toml</span>                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| configPath        | --config-path,-c      | string   | false       |        | Caminho para o arquivo JSON de configuração do <span class="chalk-green">napi</span>                                                                                                                                                                                                                                                                                                                                                                                                                     |
| packageJsonPath   | --package-json-path   | string   | false       |        | Caminho para <span class="chalk-green">package.json</span>                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| targetDir         | --target-dir          | string   | false       |        | Diretório para todos os artefatos gerados do crate; veja <span class="chalk-green">cargo build --target-dir</span>                                                                                                                                                                                                                                                                                                                                                                                       |
| outputDir         | --output-dir,-o       | string   | false       |        | Caminho para onde todos os arquivos gerados serão gravados. O padrão é a pasta do crate                                                                                                                                                                                                                                                                                                                                                                                                                  |
| platform          | --platform            | boolean  | false       |        | Adiciona o triple da plataforma ao arquivo de binding Node.js gerado, por exemplo: <span class="chalk-green">[name].linux-x64-gnu.node</span>                                                                                                                                                                                                                                                                                                                                                            |
| jsPackageName     | --js-package-name     | string   | false       |        | Nome do pacote no arquivo de binding JS gerado. Só funciona com a flag <span class="chalk-green">--platform</span>                                                                                                                                                                                                                                                                                                                                                                                       |
| constEnum         | --const-enum          | boolean  | false       | true   | Gera declarações TypeScript <span class="chalk-green">`const enum`</span>. Use <span class="chalk-green">--no-const-enum</span> para emitir formas regulares/apenas de tipo.                                                                                                                                                                                                                                                                                                                             |
| runtimeStringEnum | --runtime-string-enum | boolean  | false       | false  | Com <span class="chalk-green">--no-const-enum</span>, emite <span class="chalk-rust">#[napi(string_enum)]</span> como enums de runtime em vez de uniões de strings apenas de tipo. Não tem efeito enquanto const enums estiverem habilitados.                                                                                                                                                                                                                                                            |
| jsBinding         | --js                  | string   | false       |        | Caminho e nome do arquivo de binding JS gerado. Só funciona com a flag <span class="chalk-green">--platform</span>. Relativo a <span class="chalk-green">--output-dir</span>.                                                                                                                                                                                                                                                                                                                            |
| noJsBinding       | --no-js               | boolean  | false       |        | Define se deve desabilitar a geração do arquivo de binding JS. Só funciona com a flag <span class="chalk-green">--platform</span>.                                                                                                                                                                                                                                                                                                                                                                       |
| dts               | --dts                 | string   | false       |        | Caminho e nome do arquivo de definição de tipos gerado. Relativo a <span class="chalk-green">--output-dir</span>                                                                                                                                                                                                                                                                                                                                                                                         |
| dtsHeader         | --dts-header          | string   | false       |        | Cabeçalho personalizado para o arquivo de definição de tipos gerado. Só funciona quando a feature <span class="chalk-green">typedef</span> estiver habilitada.                                                                                                                                                                                                                                                                                                                                           |
| noDtsHeader       | --no-dts-header       | boolean  | false       |        | Define se deve desabilitar o cabeçalho padrão do arquivo de definição de tipos gerado. Só funciona quando a feature <span class="chalk-green">typedef</span> estiver habilitada.                                                                                                                                                                                                                                                                                                                         |
| dtsCache          | --dts-cache           | boolean  | false       | true   | Define se deve habilitar o cache de dts; o padrão é true                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| esm               | --esm                 | boolean  | false       |        | Define se deve emitir um arquivo de binding JS em formato ESM em vez de CJS. Só funciona com a flag <span class="chalk-green">--platform</span>.                                                                                                                                                                                                                                                                                                                                                         |
| pipe              | --pipe                | string   | false       |        | Encaminha cada arquivo de saída gerado para o comando informado, por exemplo <span class="chalk-green">napi build --pipe "npx prettier --write"</span>                                                                                                                                                                                                                                                                                                                                                   |
| strip             | --strip,-s            | boolean  | false       |        | Define se deve aplicar strip à biblioteca para alcançar o menor tamanho possível                                                                                                                                                                                                                                                                                                                                                                                                                         |
| release           | --release,-r          | boolean  | false       |        | Compila em modo release                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| verbose           | --verbose,-v          | boolean  | false       |        | Registra verbosamente o trace do comando de build                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| bin               | --bin                 | string   | false       |        | Compila apenas o binário especificado                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| package           | --package,-p          | string   | false       |        | Compila a biblioteca especificada ou a que está em `cwd`                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| profile           | --profile             | string   | false       |        | Compila os artefatos com o profile especificado                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| crossCompile      | --cross-compile,-x    | boolean  | false       |        | [experimental] faz compilação cruzada trocando o subcomando do cargo: targets Windows MSVC a partir de um host não Windows usam <span class="chalk-green">cargo-xwin</span>; targets Windows GNU são rejeitados. Todo target não Windows usa <span class="chalk-green">cargo-zigbuild</span> (requer <span class="chalk-green">zig</span> no PATH). O subcomando é instalado automaticamente no primeiro uso. Não combina com as outras flags de cross nem com <span class="chalk-green">--watch</span>. |
| useCross          | --use-cross           | boolean  | false       |        | [experimental] <span class="chalk-warning">legada, não recomendada</span>: compila dentro de um contêiner Docker/Podman via <span class="chalk-green">cross</span> (cross-rs); prefira <span class="chalk-green">--use-napi-cross</span> ou <span class="chalk-green">--cross-compile</span>. Requer <span class="chalk-green">cross</span> instalado manualmente e um engine de contêiner em execução. Não combina com as outras flags de cross nem com <span class="chalk-green">--watch</span>.       |
| useNapiCross      | --use-napi-cross      | boolean  | false       |        | [experimental] baixa uma toolchain gcc cruzada do npm (<span class="chalk-green">@napi-rs/cross-toolchain</span>) e define variáveis de ambiente de linker/CC. Apenas targets Linux glibc: x64, arm64, armv7, ppc64le, s390x (glibc 2.17), em host Linux x64/arm64. Host/target incompatível e falhas de configuração são erros. Não combina com as outras flags de cross.                                                                                                                               |
| watch             | --watch,-w            | boolean  | false       |        | Observa as mudanças do crate e compila continuamente com o crate <span class="chalk-green">cargo-watch</span>                                                                                                                                                                                                                                                                                                                                                                                            |
| features          | --features,-F         | string[] | false       |        | Lista de features a ativar, separadas por espaço                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| allFeatures       | --all-features        | boolean  | false       |        | Ativa todas as features disponíveis                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| noDefaultFeatures | --no-default-features | boolean  | false       |        | Não ativa a feature <span class="chalk-green">default</span>                                                                                                                                                                                                                                                                                                                                                                                                                                             |

## Flags de compilação cruzada

`napi build` tem três flags de compilação cruzada: `--use-napi-cross`,
`--cross-compile` (`-x`) e `--use-cross`. As três são experimentais: o
comportamento pode mudar entre releases minor.

As flags recomendadas são `--use-napi-cross` para targets Linux glibc em um
host Linux x64/arm64, e `--cross-compile` (`-x`) para targets Windows MSVC a
partir de um host não Windows e para targets musl. `-x` também é o fallback
para targets glibc, macOS e FreeBSD quando a configuração preferida não está
disponível no seu host. Targets Android, WASI e OpenHarmony não precisam de
nenhuma flag de cross: a CLI configura suas toolchains a partir de variáveis de
ambiente da plataforma. `--use-cross` é legada e não recomendada, e as builds
baseadas em imagens Docker estão obsoletas. Esta página é uma referência do
que cada flag faz. Para escolher a flag certa para o seu host e target, veja
[Cross build](../cross-build). Para detalhes de Alpine/musl, veja o
[FAQ](../more/faq#build-for-linux-alpine).

Cada flag muda exatamente uma coisa na build:

| Flag                     | O que ela muda                                                | Comando resultante                                                         |
| ------------------------ | ------------------------------------------------------------- | -------------------------------------------------------------------------- |
| _(nenhuma)_              | nada                                                          | `cargo build --target <triple>`                                            |
| `--use-cross`            | apenas o **binário**                                          | `cross build --target <triple>`                                            |
| `--cross-compile` / `-x` | apenas o **subcomando** (mais dois efeitos colaterais de env) | `cargo zigbuild --target <triple>` ou `cargo xwin build --target <triple>` |
| `--use-napi-cross`       | apenas **variáveis de ambiente** (linker, CC, sysroot)        | continua sendo `cargo build --target <triple>`                             |

### Escolha exatamente uma

::: warning
Essas flags não se combinam. Escolha exatamente uma. A CLI rejeita qualquer
par antes de ler metadata do Cargo, baixar toolchains ou instalar subcomandos.

:::

| Combinação                                                                 | Resultado                                                |
| -------------------------------------------------------------------------- | -------------------------------------------------------- |
| Quaisquer duas entre `--use-cross`, `--use-napi-cross` e `--cross-compile` | Erro fatal antes de efeitos colaterais da build.         |
| `--watch` + `--cross-compile`                                              | Erro fatal; cargo-watch só aceita o fluxo Cargo simples. |
| `--watch` + `--use-cross`                                                  | Erro fatal; cargo-watch só aceita o fluxo Cargo simples. |

### Pré-requisitos

| Flag                                      | Instalado para você                                                                                                                                                               | Você precisa fornecer                                                                                                                                                                                                                                         |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `-x`, target não Windows (cargo-zigbuild) | <span class="chalk-green">cargo-zigbuild</span> via `cargo install` no primeiro uso (o que pode ser lento).                                                                       | `zig` no `PATH`. A CLI nunca instala nem verifica `zig`; `cargo-zigbuild` falha se ele estiver ausente.                                                                                                                                                       |
| `-x`, target Windows (cargo-xwin)         | <span class="chalk-green">cargo-xwin</span> via `cargo install`, no primeiro uso. Ele baixa por conta própria a Microsoft CRT e o Windows SDK (a licença da Microsoft se aplica). | `clang` (por exemplo, `apt install clang` / `brew install llvm`) e `zig` **não** é usado neste caminho. Para dependências que compilam assembly, também as ferramentas LLVM (`rustup component add llvm-tools`). A CLI não verifica nenhum desses requisitos. |
| `--use-cross`                             | Nada.                                                                                                                                                                             | O binário `cross` (um binário ausente falha com `spawn cross ENOENT`), além de um Docker >= 20.10 ou Podman >= 3.4 em execução.                                                                                                                               |
| `--use-napi-cross`                        | A toolchain gcc, baixada automaticamente do npm (<span class="chalk-green">@napi-rs/cross-toolchain</span>) e armazenada em cache em `~/.napi-rs/cross-toolchain`.                | `npm` no `PATH` e um host Linux x64 ou arm64. A CLI valida host e target antes de efeitos colaterais; falhas de download, extração ou configuração interrompem a build.                                                                                       |

### Exemplos

Um comando pronto para copiar e colar por flag:

```sh
# Targets Linux glibc, a partir de um host Linux x64/arm64
napi build --release --target aarch64-unknown-linux-gnu --use-napi-cross

# Windows MSVC a partir de um host macOS/Linux, musl ou os casos de fallback com zigbuild
napi build --release --target x86_64-unknown-linux-musl --cross-compile

# Build legada em contêiner (não recomendada)
napi build --release --target x86_64-unknown-linux-gnu --use-cross
```

## O que `napi build` executa

`napi build` é um wrapper em torno de um comando executado e de um conjunto de
variáveis de ambiente. Esta seção detalha os dois.

### O comando

| Modo                                                            | Comando executado                                                                |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Sem flag de cross                                               | `cargo build --target <triple>`                                                  |
| `--use-napi-cross`                                              | `cargo build --target <triple>` (apenas o env muda)                              |
| `--use-cross`                                                   | `cross build --target <triple>` (mesmos argumentos, mesmo env calculado no host) |
| `--cross-compile`, target é Windows MSVC e o host não é Windows | `cargo xwin build --target <triple>` (`XWIN_ARCH=x86` é definido para `i686`)    |
| `--cross-compile`, qualquer outro target                        | `cargo zigbuild --target <triple>`                                               |
| `--cross-compile`, target é Windows e o host é Windows          | emite um aviso e depois usa `cargo build --target <triple>`                      |

`--cross-compile` escolhe `cargo-xwin` pela **plataforma** do target, mas só
aceita targets Windows MSVC em um host não Windows. Targets Windows GNU e
gnullvm são rejeitados antes de efeitos colaterais porque cargo-xwin não fornece
suas toolchains. Compile-os sem `-x`, usando mingw-w64 ou llvm-mingw,
respectivamente; veja a observação sobre windows-gnu em [Recipes per
target](../cross-build#recipes-per-target). Todo target não Windows passa por
`cargo-zigbuild`: a CLI não mantém uma lista dos targets aceitos pelo zigbuild e
o usa mesmo quando o target coincide com o host.

Se a variável de ambiente `CARGO` estiver definida, a CLI executará esse
binário no lugar em todos os modos. Com `--use-cross` ou `--cross-compile`, ela
avisa que o override substitui o binário exigido pelo mecanismo selecionado.

### RUSTFLAGS

- Qualquer target `*musl*`: a CLI acrescenta `-C target-feature=-crt-static` a `RUSTFLAGS`.
- `--strip`: a CLI acrescenta `-C link-arg=-s`.

Ambos são aplicados por meio da variável de ambiente `RUSTFLAGS` exportada. O
Cargo dá precedência à variável de ambiente sobre `rustflags` em
`.cargo/config.toml`, então, depois que a CLI a exporta, os `rustflags` do seu
`.cargo/config.toml` são ignorados. Se você precisar de flags extras,
adicione-as à variável de ambiente `RUSTFLAGS`, não ao `.cargo/config.toml`.

### Compilador C

Quando `TARGET_CC` e `CC` estão definidos ao mesmo tempo, `TARGET_CC`
prevalece (desde `@napi-rs/cli` 3.0.0-alpha.92).

### Linkers padrão para targets menos comuns

Sem `--cross-compile`, estes targets recebem `CARGO_TARGET_<T>_LINKER`
apontando para um gcc cruzado que **você mesmo precisa instalar**. A CLI define
a variável de ambiente sem verificá-la: se o binário estiver ausente, a build
falha na etapa de link. Sua própria variável de ambiente
`CARGO_TARGET_<T>_LINKER` sempre prevalece. Com `--cross-compile`, esta tabela
é ignorada: o link é delegado ao zig ou ao xwin.

| Target                          | Linker definido pela CLI       |
| ------------------------------- | ------------------------------ |
| `aarch64-unknown-linux-musl`    | `aarch64-linux-musl-gcc`       |
| `loongarch64-unknown-linux-gnu` | `loongarch64-linux-gnu-gcc-13` |
| `riscv64gc-unknown-linux-gnu`   | `riscv64-linux-gnu-gcc`        |
| `powerpc64le-unknown-linux-gnu` | `powerpc64le-linux-gnu-gcc`    |
| `s390x-unknown-linux-gnu`       | `s390x-linux-gnu-gcc`          |

### Android, WASI e OpenHarmony

Esses targets recebem o env da toolchain da CLI sempre que a plataforma do
target corresponde, com ou sem qualquer flag de cross, mas cada plataforma tem
suas próprias condições:

- **Android**: em um host que não seja Android, o env de linker/CC/AR é construído a partir de `ANDROID_NDK_LATEST_HOME`. Se a variável estiver ausente, a CLI para antes de executar o Cargo, sem exportar caminhos de ferramentas inválidos. Toda a configuração, inclusive a exigência da variável, é ignorada quando o próprio host é Android.
- **WASI**: `EMNAPI_LINK_DIR` é sempre definido para o `emnapi` embutido (a CLI falha se as versões de `emnapi`, `@emnapi/core` e `@emnapi/runtime` divergirem). O env de linker/CC do wasi-sdk só é definido quando `WASI_SDK_PATH` está definido **e** o diretório existe; caso contrário, o link faz fallback para o padrão do cargo, o `rust-lld` que acompanha o rustup.
- **OpenHarmony**: o env é construído a partir de `$OHOS_SDK_PATH/native`, ou de `OHOS_SDK_NATIVE` quando `OHOS_SDK_PATH` não está definido. Se nenhum dos dois estiver definido, a CLI avisa e não define nada.

## Passando flags para o Cargo

Flags depois de `--` serão repassadas ao comando `cargo build`. Por exemplo:

```sh
napi build -- --locked
```

Isso passará a flag `--locked` para `cargo build`, resultando em
`cargo build --locked`.

## Compilar um executável Cargo

`--bin <name>` seleciona um target binário do Cargo, inclusive em um pacote que
também contenha um `cdylib`. A CLI repassa `--bin <name>` ao Cargo e copia o
executável resultante para `--output-dir` usando seu nome normal (`.exe` no
Windows):

**Cargo.toml**

```toml
[[bin]]
name = "my-tool"
path = "src/main.rs"
```

```sh
napi build --release --bin my-tool --output-dir dist
./dist/my-tool
```

Esse modo não produz um addon `.node`, loader JavaScript nem declarações
TypeScript; a geração de bindings após a build só é executada para um `cdylib`.

Sem `--bin`, o `cdylib` do pacote continua sendo o target preferido do addon.
Em um workspace, combine `--package <cargo-package>` e `--bin <name>` quando o
binário não estiver no pacote selecionado por `--manifest-path`.

## Observação sobre `--js-package-name` {#note-for---js-package-name}

Na seção [Deep dive](../introduction/getting-started#deep-dive), recomendamos
que você publique seu pacote sob um
[`npm scope`](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/).
Mas, se você estiver migrando um pacote existente que não está sob um
[`npm scope`](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/)
ou simplesmente não quiser que seu pacote fique sob um
[`npm scope`](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/),
você pode acionar a
[_npm spam detection_](https://stackoverflow.com/questions/48668389/npm-publish-failed-with-package-name-triggered-spam-detection/54135900#54135900)
ao publicar os pacotes nativos de plataforma, como `snappy-darwin-x64`,
`snappy-darwin-arm64` etc.

Nesse caso, você pode publicar seus pacotes de plataforma sob um
[`npm scope`](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/)
para evitar a
[_npm spam detection_](https://stackoverflow.com/questions/48668389/npm-publish-failed-with-package-name-triggered-spam-detection/54135900#54135900).
E seus usuários não precisam se preocupar com os pacotes nativos de plataforma
em `optionalDependencies`. Em [`snappy`](https://github.com/Brooooooklyn/snappy/),
por exemplo, os usuários só precisam instalá-lo com `yarn add snappy`. Mas os
pacotes nativos de plataforma ficam sob o escopo `@napi-rs`:

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

Para esse caso, `@napi-rs/cli` fornece `--js-package-name` para sobrescrever a
lógica de carregamento dos pacotes gerados. Por exemplo, em `snappy` temos um
<span class="chalk-green">package.json</span> assim:

```json
{
  "name": "snappy",
  "version": "7.0.0",
  "napi": {
    "binaryName": "snappy"
  }
}
```

Sem a flag `--js-package-name`, `@napi-rs/cli` gerará um binding JavaScript
para carregar os pacotes nativos de plataforma para você:

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

Isso não é o que queremos. Então faça a build com `--js-package-name` para
sobrescrever o `package name` no arquivo de binding JavaScript gerado:
`napi build --release --platform --js-package-name @napi-rs/snappy`. Então, o
arquivo JavaScript gerado passará a ser:

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
