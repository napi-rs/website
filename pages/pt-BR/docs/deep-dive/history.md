---
description: The history of writing Node.js native addons.
---

# História

> Algumas partes foram retiradas de https://xcoder.in/2017/07/01/nodejs-addon-history/

## A era feudal: Usando cabeçalhos `v8 C++` diretamente

Nos primórdios, os desenvolvedores estavam usando os cabeçalhos `v8/Node C++` diretamente para construir _Node.js native addon_.

```cpp
Handle<Value> Echo(const Arguments& args)
{
    HandleScope scope;

    if(args.Length() < 1)
    {
        ThrowException(
            Exception::TypeError(
                String::New("Wrong number of arguments.")));
        return scope.Close(Undefined());
    }

    return scope.Close(args[0]);
}

void Init(Handle<Object> exports)
{
    exports->Set(String::NewSymbol("echo"),
        FunctionTemplate::New(Echo)->GetFunction());
}
```

Este trecho de código define uma função simples do Node.js: `echo`. Ela sempre retorna o primeiro argumento passado. E é equivalente a este código simples do `Node.js`:

```js
exports.echo = function () {
  if (arguments.length < 1) throw new Error('Wrong number of arguments.')
  return arguments[0]
}
```

Se você publicar esses códigos como um pacote `npm`, ele só funcionará com `node 0.10.x`.

Mas por quê? A resposta curta é **_o v8 e as APIs do Node.js mudam rapidamente._** Por exemplo, no `Node.js 6.x`, a forma de definir `JsFunction` mudou:

```cpp
Handle<Value> Echo(const Arguments& args);    // 0.10.x
void Echo(FunctionCallbackInfo<Value>& args); // 6.x
```

Então, pacotes nativos desenvolvidos dessa maneira só podem suportar algumas versões do Node.js, quando a API do `v8` ou do `Node.js` muda, esses pacotes não podem mais ser compilados. E se os mantenedores atualizarem a API para o Node.js e `v8` mais recentes, o pacote não poderá ser compilado em versões mais antigas do Node.js novamente.

## A era do Castelo: Abstrações nativas para o Node.js

De volta a 2013, com a rápida iteração do `Node.js` e do `v8`, os pacotes que usavam a maneira antiga de construir complementos nativos cresciam com dores. E [`NAN`](https://github.com/nodejs/nan) surgiu. É uma abreviação para **Native Abstractions for Node.js**.

> O NAN foi construído por [Rod Vagg](https://github.com/rvagg) e depois por [Benjamin Byholm](https://github.com/kkoopa). O NAN pertencia à conta do GitHub de Rod Vaggs desde o início e foi transferido para a organização `io.js` na era sombria da divisão do `Node.js` em `io.js` e `Node.js`; depois que eles se reuniram, o NAN finalmente foi transferido para a organização `Node.js`.

Depois que o NAN surgiu, a experiência de desenvolvimento em pacotes de complementos nativos entrou na **_era do Castelo_**, e permanece até os dias atuais.

A descrição completa do NAN ainda é um pouco abstrata: **_Abstrações nativas para o Node.js_**. Para ser mais específico, é um conjunto de **_macros em C_**. Você pode definir uma função JavaScript assim, por exemplo:

```cpp
NAN_METHOD(Echo)
{
}
```

A macro do NAN será expandida para diferentes códigos CPP durante a compilação de acordo com a versão do Node.js:

```cpp
Handle<Value> Echo(const Arguments& args);    // 0.10.x
void Echo(FunctionCallbackInfo<Value>& args); // 6.x
```

`NAN_METHOD` será expandido pelo NAN para os trechos de código abaixo.

Existem toneladas de macros no NAN além de `NAN_METHOD`, os desenvolvedores podem usá-lo para fazer quase qualquer coisa.

Por exemplo, o `Nan::HandleScope` permite declarar um **escopo de alça**, `Nan::AsyncWorker` permite iniciar uma tarefa no `libuv`.

Então, na **era do Castelo**, aqui está como se parece o addon nativo em c++:

```cpp
NAN_METHOD(Echo)
{
    if(info.Length() < 1)
    {
        Nan::ThrowError("Wrong number of arguments.");
        return info.GetReturnValue().Set(Nan::Undefined());
    }

    info.GetReturnValue().Set(info[0]);
}

NAN_MODULE_INIT(InitAll)
{
    Nan::Set(
        target,
        Nan::New<String>("echo").ToLocalChecked(),
        Nan::GetFunction(Nan::New<v8::FunctionTemplate>(Echo)).ToLocalChecked());
}
```

O benefício de escrever códigos dessa forma é que os códigos podem ser atualizados automaticamente com a atualização do NAN, tornando-os compatíveis com todas as versões do Node.js.

> Mesmo uma coisa boa como o NAN tem uma missão, e qualquer coisa fora dessa missão será gradualmente eliminada. Versões como 0.10.x e 0.12.x, por exemplo, devem ser aposentadas, e o NAN irá gradualmente abandonar a compatibilidade e o suporte para elas.

## Era dos Impérios: ABI-compliant N-API

Desde o lançamento do Node.js v8.0.0, o Node.js introduziu uma nova interface para desenvolvimento de módulos nativos C++, a **N-API**.

> De acordo com a documentação oficial, é pronunciado com um único N, mais API, o que significa que as quatro letras em inglês são pronunciadas separadamente.

Como isso difere das três eras anteriores? Por que seria uma era ainda maior de impérios?

Em primeiro lugar, sabemos que mesmo sob o desenvolvimento do NAN, o código escrito uma vez precisa ser recompilado sob diferentes versões do Node.js, caso contrário, o Node.js não carregará uma extensão C++ corretamente se as versões não corresponderem. Em outras palavras, escreva uma vez, compile em qualquer lugar.

A N-API, em comparação com o NAN, encapsula todas as estruturas de dados subjacentes do Node.js e as abstrai na interface da N-API.

Diferentes versões do Node.js usam a mesma interface, que é estavelmente compatível com ABI, ou seja, a Interface Binária de Aplicativo (ABI). Isso permite que as extensões C++ compiladas sejam usadas diretamente sem recompilação, desde que o número da versão do ABI seja o mesmo em todas as versões do Node.js. Na verdade, o Node.js que suporta a interface N-API especifica a versão atual do ABI usada pelo Node.js.

Para alcançar o objetivo oculto acima, a postura de usar a N-API parece com isso:

- Forneça o arquivo de cabeçalho `node_api.h`.
- Qualquer chamada de N-API retorna um `enum napi_status` para indicar se a chamada foi bem-sucedida ou não.
- O valor de retorno da N-API é ocupado por `napi_status`, então o valor de retorno real é herdado dos argumentos de entrada.
- Todos os tipos de dados JavaScript são envolvidos no tipo de caixa preta `napi_value`, não mais tipos como `v8::Object`, `v8::Number`, e assim por diante.
- Se a chamada de função não for bem-sucedida, a função `napi_get_last_error_info` pode ser usada para obter informações sobre o último erro.

Para obter mais detalhes sobre as funções da N-API, visite sua [documentação](https://nodejs.org/api/n-api.html), mas por enquanto, vamos dar uma olhada em algo um pouco menos abstrato para lhe dar uma ideia da N-API.

### Inicialização do Módulo

Nas eras **_Feudal_** e NAN, a inicialização do módulo era deixada para os macros fornecidos pelo Node.js.

```cpp
NODE_MODULE(addon, Init)
```

Na N-API atual, isso se torna um macro da N-API.

```cpp
NODE_MODULE(addon, Init)
```

Consequentemente, esta função de inicialização `Init` será escrita de forma diferente. Por exemplo, ela é escrita de duas maneiras diferentes na era feudal e na era do NAN:

```cpp
// Feudal style
void Init(Local<Object> exports) {
    NODE_SET_METHOD(exports, "echo", Echo);
}

// NAN style
NAN_MODULE_INIT(Init)
{
    Nan::Set(
        target,
        Nan::New<String>("echo").ToLocalChecked(),
        Nan::GetFunction(Nan::New<v8::FunctionTemplate>(Echo)).ToLocalChecked());
}
```

A função `Init` deve se parecer com isso quando se trata de N-API:

```cpp
void Init(napi_env env, napi_value exports, napi_value module, void* priv)
{
    napi_status status;

    // Description constructs for setting exports
    napi_property_descriptor desc =
        { "echo", 0, Echo, 0, 0, 0, napi_default, 0 };

    // set "echo" into `module.exports`
    status = napi_define_properties(env, exports, 1, &desc);
}
```

<blockquote>

`napi_property_descriptor` é uma estrutura de descrição para configurar propriedades de objeto, que é declarada da seguinte forma:

```cpp
typedef struct {
  const char* utf8name;
  napi_value name;

  napi_callback method;
  napi_callback getter;
  napi_callback setter;
  napi_value value;

  napi_property_attributes attributes;
  void* data;
} napi_property_descriptor;
```

> Então, o `desc` na função `Init` acima significa que algo chamado "echo" é definido sob o objeto a ser instalado, a função é `Echo`, todos os outros `getters`, `setters`, e assim por diante são ponteiros vazios, e a propriedade é `napi_default`.

</blockquote>

### Declarar Funções

Lembra-se das duas declarações de função anteriores? Vamos para a terceira vez:

```cpp
Handle<Value> Echo(const Arguments& args);    // 0.10.x
void Echo(FunctionCallbackInfo<Value>& args); // 6.x
```

No N-API, você não precisa mais ter um histórico em `C++`, `C` é suficiente. Pois em N-API, declarar um Echo se parece com isso:

```c
napi_value Echo(napi_env env, napi_callback_info info)
{
    napi_status status;

    size_t argc = 1;
    napi_value argv[1];
    status = napi_get_cb_info(env, info, &argc, argv, 0, 0);
    if(status != napi_ok || argc < 1)
    {
        napi_throw_type_error(env, "Wrong number of arguments");
        return 0; // `napi_value` is actually a pointer, returning a null pointer means no return value.
    }

    return argv[0];
}

```

Análise passo a passo do código acima:

- `napi_get_cb_info` Obtém informações sobre os parâmetros da solicitação de função atual, incluindo o número de parâmetros e seus corpos (que são representados como uma matriz de napi_value).
- Verifica se há um erro na chamada (status não é igual a napi_ok) ou se o número de parâmetros é menor que 1.
  - Se houver um erro na chamada ou o número de argumentos for menor que 1, um objeto de erro é lançado no nível do JavaScript via `napi_throw_type_error` e retornado.
  - Prossegue se não houver erros.
- Retorna `argv[0]`, o primeiro argumento

## Conclusão

Esta sessão explica a mudança na abordagem para o desenvolvimento de módulos C++ nativos no Node.js:

- De node-waf para node-gyp, é uma mudança nas ferramentas de compilação, talvez GN ou algo mais no futuro.
- De quebra de código para o surgimento do NAN, a comunidade Node.js viu sua parcela justa de amores e ódios, até o novo integrante, N-API, que trouxe sangue novo para o desenvolvimento de módulos C++ nativos.

Espero que isso ajude você a entender a história azeda do desenvolvimento de módulos nativos do Node.js e os motivos e o contexto para o surgimento do N-API.
