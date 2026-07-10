---
title: 'Integrações e bundlers'
description: Carregue addons NAPI-RS a partir de CommonJS, ESM, bundlers, frameworks, Electron e implantações serverless.
---

# Integrações e bundlers

Um arquivo `.node` é uma biblioteca compartilhada carregada pelo runtime
JavaScript. Ele não é JavaScript e não deve ser transformado, concatenado em um
bundle nem enviado para um navegador. A maioria dos problemas de integração
desaparece quando o loader gerado é mantido intacto e executado pelo Node em
runtime.

## Entenda o loader gerado

Com `napi build --platform`, o NAPI-RS gera um loader JavaScript que:

1. Detecta `process.platform`, `process.arch` e a libc do Linux.
2. Tenta um arquivo local como `addon.linux-x64-gnu.node`.
3. Tenta o pacote opcional publicado separadamente correspondente, como
   `@scope/addon-linux-x64-gnu`.
4. Faz fallback para o binding WASI configurado quando o carregamento nativo
   falha.
5. Lança um erro cujo encadeamento `cause` contém as falhas dos candidatos
   nativos. Falhas comuns do fallback WASI não são adicionadas a essa cadeia;
   use `NAPI_RS_FORCE_WASI=error` para diagnosticar WASI especificamente.

O loader também reconhece dois controles de diagnóstico:

- `NAPI_RS_NATIVE_LIBRARY_PATH=/absolute/addon.node` **substitui** a seleção
  normal de plataforma e pacote nativos por uma biblioteca explícita. Se esse
  carregamento falhar, o loader registra o erro e pode seguir para um fallback
  WASI configurado, mas não tenta os candidatos nativos normais.
- `NAPI_RS_ENFORCE_VERSION_CHECK=1` rejeita um pacote de plataforma publicado
  separadamente cuja versão difira da do pacote raiz.

Mantenha o loader fora do bundle da aplicação sempre que possível. Ele precisa
ser capaz de fazer sua detecção em runtime e resolver dependências opcionais a
partir de uma árvore real de `node_modules`.

## Escolha CommonJS ou ESM deliberadamente

A biblioteca nativa em si não tem formato de módulo. Apenas o loader JavaScript
gerado é CommonJS ou ESM.

### Pacote CommonJS

```sh
napi build --platform --js index.cjs
```

**package.json**

```json
{
  "main": "./index.cjs",
  "types": "./index.d.ts"
}
```

```js
const { add } = require('@scope/addon')
```

Use a extensão `.cjs` se o pacote tiver `"type": "module"`; caso contrário, o
Node fará parse de um loader CommonJS como ESM.

### Pacote ESM

```sh
napi build --platform --esm --js index.js
```

**package.json**

```json
{
  "type": "module",
  "main": "./index.js",
  "types": "./index.d.ts"
}
```

```js
import { add } from '@scope/addon'
```

O loader ESM gerado usa `createRequire` internamente porque o Node ainda carrega
bibliotecas `.node` por meio de `require`. `--esm` altera o wrapper exportado
para exportações ESM nomeadas estáticas reais; ele não converte o binário
nativo.

### Exports duais CommonJS e ESM

Gere ambos os loaders a partir do mesmo artefato nativo:

**package.json**

```json
{
  "type": "module",
  "main": "./index.cjs",
  "module": "./index.js",
  "types": "./index.d.ts",
  "exports": {
    ".": {
      "types": "./index.d.ts",
      "import": "./index.js",
      "require": "./index.cjs"
    }
  },
  "scripts": {
    "build": "napi build --platform --js index.cjs && napi build --platform --esm --js index.js"
  }
}
```

Teste `import()` e `require()` em CI. Runners de teste que transpilem ESM podem
exercitar um caminho diferente do Node puro, e é por isso que um erro só de
Jest em ESM não prova que a biblioteca nativa falhou ao carregar.

## Estratégia recomendada para bundlers: externalizar

A build de aplicação mais robusta deixa o pacote raiz do addon como external. A
implantação então contém:

- o loader gerado;
- os metadados do pacote raiz;
- o pacote opcional de plataforma correspondente e seu arquivo `.node`.

Este é o modelo de empacotamento recomendado para a solicitação aberta sobre
bundlers ([napi-rs#1948](https://github.com/napi-rs/napi-rs/issues/1948)). Ele
evita nomes de asset com hash, `__dirname` realocado e bundlers seguindo
ansiosamente cada branch específica de plataforma em `require`.

::: warning
Marcar uma dependência como external significa que o runtime implantado ainda
precisa conseguir resolvê-la. Copie as dependências de produção, instale-as
na imagem de implantação ou forneça-as por uma camada serverless.
Externalização sozinha não empacota o addon.

:::

### esbuild

**build.mjs**

```js
import * as esbuild from 'esbuild'

await esbuild.build({
  entryPoints: ['src/server.js'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outdir: 'dist',
  external: ['@scope/addon', '@scope/addon-*'],
})
```

Copie/instale `@scope/addon` e sua dependência opcional correspondente ao lado
do bundle. Não use um loader `file`/`copy` a menos que você tenha escolhido
deliberadamente um pacote inline de binário único por plataforma e verificado
os caminhos relativos finais.

### webpack

**webpack.config.cjs**

```js
module.exports = {
  target: 'node',
  externals: {
    '@scope/addon': 'commonjs @scope/addon',
  },
}
```

Se o nome importado for calculado ou encapsulado, use uma função/plugin de
externals que mantenha o pacote inteiro do addon como external. `node-loader`
pode copiar um import direto de `.node`, mas por si só ele não preserva o fluxo
de controle do loader gerado para plataforma e pacote opcional.

### Um binário inline de plataforma única

Às vezes uma aplicação interna distribui apenas um target conhecido e mantém o
arquivo `.node` no pacote raiz, em vez de pacotes opcionais separados. Nesse
caso:

1. Mantenha o wrapper gerado como um arquivo external.
2. Copie o arquivo `.node` sem hash de conteúdo.
3. Preserve o caminho relativo esperado pelo wrapper.
4. Faça a build falhar se mais de um target puder chegar à implantação.
5. Teste a partir do arquivo/imagem final, não da árvore-fonte.

Esta é uma otimização específica de implantação, não um pacote npm portátil.

## Vite SSR e Astro

Addons nativos são dependências apenas do lado do servidor. Mantenha-os fora da
otimização de dependências do Vite e do SSR bundling:

**vite.config.ts**

```ts
import { defineConfig } from 'vite'

export default defineConfig({
  optimizeDeps: {
    exclude: ['@scope/addon'],
  },
  ssr: {
    external: ['@scope/addon'],
  },
})
```

Importe o addon apenas de módulos de servidor. Um componente empacotado para o
navegador não consegue carregar uma biblioteca nativa `.node`.

Astro usa Vite, então a mesma externalização se aplica pela configuração
`vite`. Quando um pacote CommonJS não expõe exports nomeados ao Rollup, gere o
wrapper NAPI-RS com `--esm` ou carregue o pacote CommonJS no código de
servidor:

```ts
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { add } = require('@scope/addon')
```

O relatório de integração com Astro continua aberto como
[napi-rs#2206](https://github.com/napi-rs/napi-rs/issues/2206). Verifique a
saída final do servidor do adapter, porque ele pode executar outra etapa de
bundling depois do Vite.

## Next.js

Use o addon apenas no runtime Node.js: route handlers, server actions ou server
components que não sejam atribuídos ao runtime Edge. Externalize o pacote do
bundle de servidor:

**next.config.mjs**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@scope/addon'],
}

export default nextConfig
```

**app/api/add/route.ts**

```ts
export const runtime = 'nodejs'

import { add } from '@scope/addon'

export function GET() {
  return Response.json({ value: add(20, 22) })
}
```

Não importe o addon de um Client Component, middleware usando o runtime Edge ou
código compartilhado com qualquer um deles. Garanta que sua plataforma de
implantação copie o pacote external e sua dependência binária opcional.

## Electron

O Electron pode carregar um addon Node-API no processo principal e em contextos
preload/renderer com Node habilitado. Prefira carregá-lo no processo principal
ou em um script de preload e expor uma API IPC estreita; habilitar integração
Node irrestrita em um renderer amplia a fronteira de segurança da aplicação.

Para aplicações empacotadas:

- compile/instale o binário para o sistema operacional e CPU reais do Electron;
- mantenha arquivos `.node` fora da compressão ASAR (`asarUnpack`) ou use o
  suporte do empacotador para desempacotar módulos nativos;
- mantenha pacotes opcionais de plataforma nas dependências de produção;
- teste um artefato instalado/empacotado, incluindo recarregamento e
  desligamento de janela;
- teste cada arquitetura Electron que você distribui.

O Node-API reduz a dependência de um ABI específico do V8, mas não faz um
binário Linux x64 carregar no Windows ou no macOS. Se outra dependência usar o
ABI de addon V8 em vez de Node-API, ela ainda poderá precisar de rebuilds
específicos para Electron.

## Serverless e containers

Compile e instale para o **runtime de implantação**, não para o laptop do
desenvolvedor. Por exemplo, uma implantação Linux em Lambda precisa de um
binário Linux para a arquitetura x64 ou arm64 da função e com uma versão de glibc
compatível.

Um fluxo confiável é:

1. Compilar/publicar pacotes de plataforma separados a partir da CI.
2. Instalar dependências de produção para a plataforma de implantação.
3. Externalizar o addon do bundle JavaScript.
4. Copiar os pacotes raiz e de plataforma opcional para a imagem, função ou
   layer.
5. Iniciar o artefato final na imagem base do provedor e chamar uma exportação
   nativa como smoke test.

Para seleção de libc Linux e target, siga [Compilação cruzada](/docs/cross-build).
Se o provedor não permitir addons nativos, mas oferecer os recursos de runtime
WASI exigidos, considere o [fallback WASI](/docs/concepts/webassembly)
documentado e teste explicitamente esse host.

## Diagnostique uma implantação com bundle

Execute estas sondagens dentro do ambiente final do container/arquivo:

```sh
node -p "process.execPath"
node -p "process.platform + ' ' + process.arch"
node -p "process.report?.getReport?.().header.glibcVersionRuntime || 'no glibc version reported'"
npm ls @scope/addon
```

Depois importe o pacote external com Node puro. Se ele funciona antes do
bundling, mas não a partir do bundle final, inspecione se o bundler realocou o
loader, renomeou o arquivo `.node`, removeu uma dependência opcional ou
selecionou um runtime Edge/browser. O [guia de solução de
problemas](/docs/more/troubleshooting) mostra como imprimir as falhas nativas
no encadeamento `cause` e como forçar um diagnóstico WASI separado.
