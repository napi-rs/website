---
description: napi universalize command in @napi-rs/cli.
---

# Universalize

Combine built binaries into one universal binary

## Usage

```sh
# CLI
napi universalize [--options]
```

```typescript
// Programmatically
import { NapiCli } from '@napi-rs/cli'

new NapiCli().universalize({
  // options
})
```

## Options

| Options         | CLI Options         | type   | required | default                                       | description                                                                                                                                                 |
| --------------- | ------------------- | ------ | -------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
|                 | --help,-h           |        |          |                                               | get help                                                                                                                                                    |
| cwd             | --cwd               | string | false    | process.cwd()                                 | The working directory of where napi command will be executed in, all other paths options are relative to this path                                          |
| configPath      | --config-path,-c    | string | false    |                                               | Path to <span class="chalk-green">napi</span> config json file                                                                                              |
| packageJsonPath | --package-json-path | string | false    | <span class="chalk-green">package.json</span> | Path to <span class="chalk-green">package.json</span>                                                                                                       |
| outputDir       | --output-dir,-o     | string | false    | <span class="chalk-green">./</span>           | Path to the folder where all built <span class="chalk-green">.node</span> files put, same as <span class="chalk-green">--output-dir</span> of build command |
