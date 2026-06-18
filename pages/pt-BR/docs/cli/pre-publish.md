---
title: 'Prepublish'
description: napi prepublish command in @napi-rs/cli.
---

# Prepublish

Rodando algumas preparações para publicação de pacotes **NAPI-RS**.

::: info
Este comando geralmente é usado nos scripts de ciclo de vida `prepublishOnly`
no `package.json`.
:::

**package.json**

```json {2}
"scripts": {
  "prepublishOnly": "napi prepublish -t npm"
}
```

## Flags

| Flag                | Tipo/Valor padrão    | Descrição                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--tagstyle,-t`     | `String`/`lerna`     | O estilo da tag do seu commit do git. Atualmente, oferecemos dois tipos de estilos: `npm` e `lerna`. Por exemplo, se você alterar a versão do seu pacote usando `npm version patch`, o último commit será `v1.2.1`. E o comando `napi prepublish -t npm` coletará as informações de `version` a partir da mensagem do último commit. Essas informações serão usadas para fazer upload dos artefatos para **GitHub Releases**. <br />Se o <span class="chalk-green">`--skip-gh-release`</span> for fornecido, o <span class="chalk-green">`--tagstyle,-t`</span> não terá efeito. |
| `--skip-gh-release` | `Boolean`/`false`    | Se deseja pular o upload do binário da plataforma para **GitHub Release**.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `-p,--prefix`       | `String`/`npm`       | O caminho no qual os pacotes da plataforma estão. `@napi-rs/cli` irá atualizar todos os arquivos `package.json` nele. Aumente o campo `version` para alinhar o `package.json` na raiz do projeto.                                                                                                                                                                                                                                                                                                                                                                                |
| `-c,--config`       | `String`/`undefined` | O caminho do arquivo `package.json` a ser lido, relativo ao `process.cwd()`.<br />O arquivo `package.json` deve conter o campo de configuração `napi`.<br /><span class="chalk-warning">`@napi-rs/cli` irá escrever o campo `optionalDependencies` no `package.json`, e o `optionalDependencies` conterá todas as plataformas definidas no campo [`napi.triples`](./napi-config).</span>                                                                                                                                                                                         |
