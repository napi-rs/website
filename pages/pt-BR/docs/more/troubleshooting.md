---
title: 'Solução de problemas'
description: Diagnostique falhas de build, loader, plataforma, TypeScript, APIs assíncronas e WASI no NAPI-RS a partir da camada que falhou.
---

# Solução de problemas

Primeiro identifique a camada que falhou. Um erro do compilador Rust, um erro
do loader gerado e um crash após uma importação bem-sucedida têm responsáveis
diferentes e exigem evidências diferentes.

| Ponto de falha                                             | Comece por                                                             |
| ---------------------------------------------------------- | ---------------------------------------------------------------------- |
| `cargo` ou `napi build` sai com status diferente de zero   | [Falhas de build](#build-failures)                                     |
| `require()` / `import` não consegue carregar o pacote      | [Falhas do loader](#loader-failures)                                   |
| O loader encontra um binário, mas o SO o rejeita           | [Falhas de binário e plataforma](#binary-and-platform-failures)        |
| Os valores em runtime funcionam, mas o `.d.ts` está errado | [Geração de TypeScript](#typescript-generation)                        |
| Promise fica pendente, o processo não sai, worker trava    | [Falhas assíncronas e de ciclo de vida](#async-and-lifecycle-failures) |
| Inicialização de WASI/browser falha                        | [Falhas de WASI](#wasi-failures)                                       |

Reduza o problema a uma função exportada e um script Node simples antes de
adicionar test runner, bundler, framework ou Electron. Se o script simples
funciona, a camada de integração faz parte da reprodução.

## Capture o ambiente

Execute estes comandos no mesmo shell, container ou job de CI que falha:

```sh
node -p "process.version"
node -p "process.execPath"
node -p "process.platform + ' ' + process.arch"
node -p "JSON.stringify(process.versions, null, 2)"
rustc -vV
cargo -V
napi --version
```

No Linux, registre também a libc de runtime:

```sh
node -p "process.report?.getReport?.().header.glibcVersionRuntime || 'musl or unknown'"
ldd --version 2>&1 | head -1
```

Habilite diagnósticos tanto da CLI quanto do Rust:

```sh
DEBUG='napi:*' RUST_BACKTRACE=full napi build --platform --verbose
DEBUG='napi:*' RUST_BACKTRACE=full node ./repro.cjs
```

Guarde o primeiro erro e sua causa/backtrace completos. Uma linha posterior de
“build failed” geralmente é apenas um resumo.

## Falhas de build {#build-failures}

### `No crate found in manifest`

`--cwd` é a base para todos os caminhos relativos. Verifique o que a CLI vai
ler:

```sh
pwd
ls -l Cargo.toml package.json
cargo metadata --manifest-path Cargo.toml --format-version 1 --no-deps
```

Em um workspace dividido, passe todos os caminhos explicitamente. Se o manifest
for um workspace virtual, passe também o nome exato do pacote Cargo:

```sh
napi build \
  --cwd packages/addon \
  --manifest-path ../../Cargo.toml \
  --package my-addon-native \
  --package-json-path package.json \
  --output-dir . \
  --platform
```

Veja [Configuração manual](/docs/introduction/manual-setup) para o significado
de cada opção.

### Cargo passa, mas o NAPI-RS não consegue copiar o artefato

Confirme que o pacote selecionado contém um target `cdylib`:

**Cargo.toml**

```toml
[lib]
crate-type = ["cdylib"]
```

Verifique se `CARGO_BUILD_TARGET_DIR`, `--target-dir`, um profile Cargo
personalizado ou `CARGO_BUILD_TARGET` redirecionaram a saída do Cargo. Use os
mesmos valores de `--target` e `--profile` tanto para a build quanto para a
etapa de cópia. `DEBUG=napi:*` imprime os caminhos exatos de origem e destino
usados pela CLI.

### Uma dependência C/C++ não encontra um compilador ou biblioteca

Instalar o target Rust é apenas uma parte de uma compilação cruzada nativa.
Build scripts de crates como `openssl-sys`, `ring`, `zstd-sys` e semelhantes
também precisam de um compilador C e bibliotecas para o target. Não os aponte
para bibliotecas do host.

Use a [matriz de decisão de compilação cruzada](/docs/cross-build), depois
inspecione a primeira invocação de compilador que falhou. Registre `CC`,
`CC_*` específicos do target, linker, SDK, sysroot e variáveis de
`pkg-config`. Para dependências C/C++ em WASI, configure `WASI_SDK_PATH` como
descrito em [WebAssembly](/docs/concepts/webassembly).

## Falhas do loader {#loader-failures}

O loader gerado registra as falhas dos candidatos nativos em um encadeamento
`cause` do erro. Imprima-o em vez de relatar apenas “Cannot find native
binding”:

**load-repro.cjs**

```js
try {
  require('./index.js')
} catch (error) {
  let current = error
  let depth = 0
  while (current) {
    console.error(`[cause ${depth}]`, current.stack || current)
    current = current.cause
    depth += 1
  }
  process.exitCode = 1
}
```

As causas nativas distinguem arquivo ausente de arquitetura errada, biblioteca
compartilhada ausente ou símbolo Node-API não suportado. Uma falha comum do
fallback WASI não é adicionada a essa cadeia. Para diagnosticar esse caminho,
execute novamente com `NAPI_RS_FORCE_WASI=error`; o erro lançado então encadeia
as falhas dos bindings WASI.

### O pacote opcional de plataforma está ausente

Registre a plataforma detectada e a árvore de dependências instalada:

```sh
node -p "process.platform + ' ' + process.arch"
npm ls your-package
find node_modules -type f \( -name '*.node' -o -name '*.wasm' \)
```

Causas comuns:

- a instalação usou `--no-optional` ou omitiu dependências opcionais;
- um lockfile gerado em outra plataforma não incluiu o target atual;
- um deployment copiou apenas JavaScript de produção e descartou arquivos
  `.node`;
- configurações de arquiteturas suportadas do pnpm/Yarn excluem a CPU/libc do
  deployment;
- o pacote raiz e os pacotes opcionais de plataforma têm versões diferentes.

Defina `NAPI_RS_ENFORCE_VERSION_CHECK=1` para transformar o último caso em um
erro explícito de incompatibilidade de versões. Se o npm omitiu uma dependência
opcional de plataforma por causa do comportamento do lockfile, remova
`node_modules` e o lockfile afetado, e então instale novamente na plataforma de
destino. Antes disso, inspecione ou salve o lockfile antigo se ele for
necessário para um relatório de bug.

### Force uma biblioteca nativa exata

Para separar a seleção do loader do carregamento do binário, aponte o loader
gerado para um caminho absoluto:

```sh
NAPI_RS_NATIVE_LIBRARY_PATH="$PWD/addon.linux-x64-gnu.node" node load-repro.cjs
```

Se isso funcionar, o binário é válido e a camada que falha é a seleção normal
de plataforma/pacote. Se falhar, a nova causa será o erro direto do loader do
sistema operacional. Não distribua essa variável de ambiente como configuração
normal do pacote.

### Erros de parse ou export em CommonJS/ESM

- Um wrapper CommonJS dentro de um pacote com `"type": "module"` precisa usar
  `.cjs`.
- Gere um wrapper ESM real com `napi build --platform --esm` quando os
  consumidores precisarem de exports ESM nomeados estáticos.
- Importar um wrapper CommonJS por um test runner que transpila não é o mesmo
  que testar com Node puro.
- Mantenha pacotes nativos como external em bundles de servidor.

Veja [Integrações e bundlers](/docs/more/integrations) para formatos de pacote
testados e receitas de externalização.

## Falhas de binário e plataforma {#binary-and-platform-failures}

Inspecione o arquivo real selecionado pelo loader:

```sh
file ./addon.*.node
```

Depois inspecione as dependências dinâmicas:

```sh
# Linux
ldd ./addon.linux-x64-gnu.node

# macOS
otool -L ./addon.darwin-arm64.node

# Windows Developer Command Prompt
dumpbin /DEPENDENTS addon.win32-x64-msvc.node
```

Mensagens típicas significam:

| Mensagem                                                                | Causa provável                                                                                                       |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `wrong ELF class`, `Exec format error`, `not a valid Win32 application` | Incompatibilidade de CPU ou sistema operacional                                                                      |
| `GLIBC_x.y not found`                                                   | O binário foi compilado contra uma glibc mais nova do que a do runtime                                               |
| `lib*.so` / `.dylib` / `.dll` not found                                 | Uma dependência nativa não sistêmica não foi distribuída ou seu caminho de busca está errado                         |
| `undefined symbol: napi_*`                                              | O addon habilitou um nível de Node-API mais novo do que o runtime fornece, ou foi vinculado/carregado incorretamente |
| `invalid ELF header` ao carregar no Alpine                              | Um binário glibc foi selecionado para um runtime musl, ou o contrário                                                |

Não renomeie um binário musl para um sufixo `gnu`, nem um binário x64 para um
sufixo arm64. O sufixo é um contrato de seleção, não uma conversão.

Para `GLIBC_x.y not found`, recompile contra uma glibc mais antiga como
documentado em [Compilação cruzada: versões de
glibc](/docs/cross-build#glibc-versions). Mudar para um target musl só é
correto quando o deployment realmente usa musl.

## Geração de TypeScript {#typescript-generation}

Se nenhum arquivo `.d.ts` for emitido, verifique se o pacote Cargo selecionado
depende diretamente de `napi-derive` com a feature `type-def`. As features
padrão já a incluem; desabilitar as features padrão exige adicioná-la de volta
explicitamente:

**Cargo.toml**

```toml
napi-derive = { version = "3", default-features = false, features = ["strict", "type-def"] }
```

Se uma declaração estiver ausente ou desatualizada:

1. Confirme que a exportação é compilada para o target atual e não está oculta
   por `#[cfg(...)]` ou `#[napi(skip_typescript)]`.
2. Confirme que a CLI selecionou o pacote Cargo e o `package.json` pretendidos.
3. Recompile sem watch mode e inspecione a saída de `DEBUG=napi:*`.
4. Remova apenas o cache gerado de definições de tipo em `target/napi-rs` e
   recompile.
5. Execute `tsc --noEmit` contra o arquivo recém-gerado.

Não edite manualmente declarações geradas; a próxima build as sobrescreve. Use
`ts_args_type`, `ts_return_type`, `dtsHeader` ou um wrapper público escrito à
mão quando o mapeamento Rust-para-TypeScript diferir intencionalmente.

## Falhas assíncronas e de ciclo de vida {#async-and-lifecycle-failures}

### Uma Promise nunca se resolve

Determine qual abstração a controla:

- `async fn` com Tokio: verifique se há trabalho bloqueante no runtime
  assíncrono e tasks destacadas que nunca terminam.
- `AsyncTask`: verifique se `compute`, `resolve`, `reject` ou `finally` está
  bloqueado. `AbortSignal` só cancela trabalho que ainda não começou, a menos
  que a task implemente cancelamento cooperativo.
- ThreadsafeFunction: trate `QueueFull` e `Closing`; não bloqueie enquanto a
  thread JavaScript estiver esperando pelo produtor.
- Stream/iterator: faça o cancelamento acordar o produtor e fechar todos os
  remetentes.

Adicione timestamps e IDs de operação em ambos os lados da fronteira. Um log
Rust dizendo “queued” e um log JavaScript dizendo “awaiting” não provam que o
callback de conclusão foi executado.

### O Node não sai

Mova a reprodução para um processo filho com prazo. Depois procure por:

- uma ThreadsafeFunction forte que deveria ser fraca;
- clones de ThreadsafeFunction ou referências JavaScript não liberados;
- tasks Tokio sem owner/caminho de desligamento;
- workers, timers, streams ou sockets deixados abertos pelo JavaScript ou pelo
  Rust.

Teste o caminho real de saída em vez de chamar `process.exit()`, que esconde
handles ativos e limpeza ignorada.

### A terminação do worker trava ou falha

Carregue o addon de forma independente em cada worker isolate. Não compartilhe
globalmente `Env`, construtores de classe nem handles JavaScript entre
isolates. Implemente um protocolo gracioso de stop/cancel/await antes de
`worker.terminate()`.

A terminação abrupta durante trabalho assíncrono nativo ativo continua sendo
uma limitação sensível ao runtime, com um relatório aberto no Bun em
[napi-rs#2938](https://github.com/napi-rs/napi-rs/issues/2938). Reproduza em
Node puro e separadamente no runtime Bun/Electron alvo.

Veja [Assíncrono e concorrência](/docs/more/async-concurrency) e
[Testes e depuração](/docs/more/testing-debugging) para testes de ciclo de
vida.

### Panic nativo ou abort do processo

Execute uma build de depuração com `RUST_BACKTRACE=full` e anexe um depurador
nativo. Um panic nem sempre pode ser recuperado com segurança ao cruzar uma
fronteira FFI. Converta falhas esperadas em `napi::Result`; reserve panics para
invariantes internas violadas e documente se `#[napi(catch_unwind)]` é usado.

Siga [Testes e depuração](/docs/more/testing-debugging) para CodeLLDB, LLDB,
GDB, estresse com workers e testes de vazamento.

## Falhas de WASI {#wasi-failures}

### `SharedArrayBuffer is not defined` ou a criação de memória falha

A página do navegador não está isolada em cross-origin. Sirva o documento
principal e os subrecursos com:

```text
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

Confirme no console do navegador:

```js
console.log(globalThis.crossOriginIsolated, typeof SharedArrayBuffer)
```

Garanta também que scripts, workers, WASM e imagens cross-origin atendam à
política COEP selecionada; um único subrecurso bloqueado pode fazer uma build
correta falhar.

### O pacote opcional WASI não foi instalado

Pacotes WASI usam `cpu: ["wasm32"]` e são ignorados por padrão. Configure as
arquiteturas suportadas do gerenciador de pacotes ou instale com
`--cpu=wasm32` do npm, como mostrado em [WebAssembly: install the WebAssembly
package](/docs/concepts/webassembly#install-the-webassembly-package).

Com um loader gerado por `@napi-rs/cli` 3.7 ou mais recente:

- `NAPI_RS_FORCE_WASI=true` tenta o caminho WASI mesmo quando o nativo carregou.
- `NAPI_RS_FORCE_WASI=error` também lança se nenhum binding WASI puder ser
  encontrado.
- `1`, `0`, `false` e outras strings não forçam WASI.

Use `error` em testes para que um pacote WASI ausente não faça fallback
silencioso para o addon nativo.

### Erros de worker no navegador são invisíveis

Defina `napi.wasm.browser.errorEvent` como `true`. O worker gerado encaminha um
erro para a janela como `napi-rs-worker-error`:

```js
window.addEventListener('napi-rs-worker-error', (event) => {
  console.error(event.detail)
})
```

### Funciona no Node, mas não no Bun ou Deno

Não assuma que a implementação WASI do Node existe com a mesma API em outros
lugares. A execução WASI em Bun e Deno tem um relatório aberto de
incompatibilidade ([napi-rs#2965](https://github.com/napi-rs/napi-rs/issues/2965)).
Marque o runtime como não suportado ou forneça um loader separado e testado até
que essa lacuna de produto seja resolvida.

## Relate um problema acionável

Inclua:

- código-fonte Rust mínimo, `Cargo.toml`, `build.rs`, `package.json` e
  reprodução em JavaScript;
- comandos completos e o primeiro erro com seu encadeamento `cause`;
- versões de Node/runtime, CLI, Rust, host, target, CPU e libc;
- se Node puro funciona antes de adicionar test runner ou bundler;
- saída de `file` e do comando de inspeção de dependências da plataforma;
- se o artefato é debug/release, nativo/WASI, local/pacote opcional;
- para bugs de ciclo de vida, um teste de estresse com limite e a sequência
  exata de desligamento.

::: info
Remova credenciais, caminhos privados absolutos e dados proprietários de
entrada, mas não remova a plataforma, o target triple nem a mensagem original
do loader do sistema operacional. Esses detalhes muitas vezes identificam a
camada que falhou imediatamente.

:::
