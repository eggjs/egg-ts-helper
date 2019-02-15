# egg-ts-helper

[![NPM version][npm-image]][npm-url]
[![Package Quality](http://npm.packagequality.com/shield/egg-ts-helper.svg)](http://packagequality.com/#?package=egg-ts-helper)
[![Build Status][travis-image]][travis-url]
[![Appveyor status][appveyor-image]][appveyor-url]
[![Test coverage][codecov-image]][codecov-url]
[![NPM download][download-image]][download-url]

[npm-image]: https://img.shields.io/npm/v/egg-ts-helper.svg?style=flat-square
[npm-url]: https://npmjs.org/package/egg-ts-helper
[travis-url]: https://travis-ci.org/whxaxes/egg-ts-helper
[travis-image]: http://img.shields.io/travis/whxaxes/egg-ts-helper.svg
[appveyor-url]: https://ci.appveyor.com/project/whxaxes/egg-ts-helper/branch/master
[appveyor-image]: https://ci.appveyor.com/api/projects/status/github/whxaxes/egg-ts-helper?branch=master&svg=true
[codecov-image]: https://codecov.io/gh/whxaxes/egg-ts-helper/branch/master/graph/badge.svg
[codecov-url]: https://codecov.io/gh/whxaxes/egg-ts-helper
[download-image]: https://img.shields.io/npm/dm/egg-ts-helper.svg?style=flat-square
[download-url]: https://npmjs.org/package/egg-ts-helper

一个帮助 `egg` 生成 `d.ts` 的工具，通过 ts 提供的 [Declaration Merging](https://www.typescriptlang.org/docs/handbook/declaration-merging.html) 能力来将 `controller, proxy, service 等等` 这些 egg 中动态加载的模块注入到 egg 的声明中。从而获得类型校验以及代码提示。

## 安装

打开应用目录并且安装

```
npm i egg-ts-helper --save-dev
```

或者

```
yarn add egg-ts-helper --dev
```

## 快速开始

打开你的 egg 应用，通过 [npx](https://github.com/zkat/npx) 来执行 ets 指令

```
$ npx ets
```

可以通过 `-w` 来监听文件改动并且重新生成 `d.ts`

```
$ npx ets -w
```

`egg-ts-helper` 已经内置在 `egg-bin` 中，可以通过以下命令方便使用

```
$ egg-bin dev --dts
```

再或者在 `package.json` 中配置 `egg.declarations` 为 true 即可。

## 命令行

```
$ ets -h

  Usage: ets [commands] [options]

  Options:

    -v, --version           版本号
    -w, --watch             是否监听文件改动
    -c, --cwd [path]        Egg 的项目目录，(默认值: process.cwd)
    -C, --config [path]     配置文件，入参应该是合法的 JSON/JS 文件 (默认值: {cwd}/tshelper.js)
    -o, --oneForAll [path]  创建一个 import 了所有生成的 d.ts 的声明 (默认值: typings/ets.d.ts)
    -s, --silent            静默执行，不输出日志
    -i, --ignore [dirs]     忽略 watchDirs 中的相关配置，可以通过逗号配置忽略多个，比如: -i controller,service
    -e, --enabled [dirs]    开启 watchDirs 中的相关配置， 可以通过逗号配置忽略多个，比如: -e proxy,other
    -E, --extra [json]      额外配置，可以是 json 字符串
    -h, --help              帮助

  Commands:

    clean                   清除所有包含同名 ts 文件的 js 文件
    init <type>             在你的项目中初始化 egg-ts-helper
```

## 配置

| name | type | default | description |
| --- | --- | --- | --- |
| cwd | `string` | process.cwd | Egg 的项目目录 |
| typings | `string` | {cwd}/typings | 生成的声明放置目录 |
| caseStyle | `string` `Function` | lower | egg 的模块命名方式 (lower (首字母小写), upper (首字母大写), camel (驼峰) ) ，也可以传方法 `(filename) => {return 'YOUR_CASE'}`|
| silent | `boolean` | false | 静默执行，不输出日志 |
| watch | `boolean` | false | 是否监听文件改动 |
| watchOptions | `object` | undefined | chokidar 的[配置](https://github.com/paulmillr/chokidar#api) |
| execAtInit | `boolean` | false | 是否启动的时候就执行声明生成 |
| configFile | `string` | {cwd}/tshelper.(js|json) | 配置文件路径 |
| watchDirs | `object` | | 生成器配置 |

可以在  `./tshelper.js`  `./tshelper.json` 或者 `package.json` 中配置上面的配置

在 `tshelper.js`

```js
// {cwd}/tshelper.js

module.exports = {
  watch: true,
  execAtInit: true,
  watchDirs: {
    model: {
      enabled: true,
      generator: "function",
      interfaceHandle: "InstanceType<{{ 0 }}>"
    },
  }
}
```

在 `tshelper.json`

```json
// {cwd}/tshelper.json

{
  "watch": true,
  "execAtInit": true,
  "watchDirs": {
    "model": {
      "enabled": true,
      "generator": "function",
      "interfaceHandle": "InstanceType<{{ 0 }}>"
    },
  }
}
```

在 `package.json`

```json
// {cwd}/package.json

{
  "egg": {
    "framework": "egg",
    "tsHelper": {
      "watch": true,
      "execAtInit": true,
      "watchDirs": {
        "model": {
          "enabled": true,
          "generator": "function",
          "interfaceHandle": "InstanceType<{{ 0 }}>"
        },
      }
    }
  }
}
```

同时也可以通过环境变量来传入配置 ( 1.22.0 版本后开始支持 )

- `ETS_CWD`: cwd
- `ETS_FRAMEWORK`: framework
- `ETS_TYPINGS`: typings
- `ETS_CASE_STYLE`: caseStyle
- `ETS_AUTO_REMOVE_JS`: autoRemoveJs
- `ETS_THROTTLE`: throttle
- `ETS_WATCH`: watch
- `ETS_EXEC_AT_INIT`: execAtInit
- `ETS_SILENT`: silent
- `ETS_CONFIG_FILE`: configFile

## 生成器

生成器是 `egg-ts-helper` 的核心组件。（ 内置的生成器: https://github.com/whxaxes/egg-ts-helper/tree/master/src/generators.
 ）

在启动的时候，`egg-ts-helper` 会执行所有配置里的 watcher 的生成器，这些生成器将会遍历目录并且收集模块，然后返回 `dist`（ d.ts 的文件路径 ） 以及 `content`（ 引入了上面收集的所有模块并且定义到了 egg 的声明中 ）给 `egg-ts-helper`。`egg-ts-helper` 将根据这两个字段生成声明文件。

可以在 `watchDirs` 中配置 watcher （ 可以在 https://github.com/whxaxes/egg-ts-helper/blob/master/src/index.ts 中的 `getDefaultWatchDirs` 方法中看到默认配置 ）

`egg-ts-helper` 会默认监听以下几个目录 `app/extend`,`app/controller`,`app/service`, `app/config`, `app/middleware`, `app/model`。当在这些个目录里的代码文件更改后，声明会自动重新生成 （ 前提是配置中的 watch 设置为了 true ）。

可以通过 `-i` 的命令关掉指定的 watcher 

```
$ ets -i extend,controller
```

也可以在 `tshelper.js` 中配置，设置 `watchDirs.extend` 和 `watchDirs.controller` 为 `false` 即可

```
// {cwd}/tshelper.js

module.exports = {
  watchDirs: {
    extend: false,
    controller: false,
  }
}
```

再或者在 `package.json` 中配置, 跟上面的配置一样

```
// {cwd}/package.json

{
  "egg": {
    "framework": "egg",
    "tsHelper": {
      "watchDirs": {
        "extend": false
      }
    }
  }
}
```

## 拓展

`egg-ts-helper` 通过生成器实现了 egg 的 loader 功能，因此也支持配置 custom loader.

### 示例

给 `model` 创建 `d.ts`，在 `tshelper.js` 中配置一下 `watchDirs.model`。

```typescript
// ./tshelper.js

module.exports = {
  watchDirs: {
    model: {
      path: 'app/model', // 监听目录
      // pattern: '**/*.(ts|js)', // 遍历的文件表达式，一般都不需要改这个
      generator: 'class', // 生成器名称
      interface: 'IModel',  // interface 名称，如果不填的话，将会随机生成个 interface
      declareTo: 'Context.model', // 指定定义到 egg 的某个类型下
      // watch: true, // 是否需要监听文件改动
      // caseStyle: 'upper', // 模块命名格式
      // interfaceHandle: val => `ReturnType<typeof ${val}>`, // interface 预处理方法
      // trigger: ['add', 'unlink'], // 当接收到这些文件更改事件的时候，会触发 d.ts 的重新生成, 所有事件: ['add', 'unlink', 'change']
    }
  }
}
```

使用上面的配置，会生成下面这个 `d.ts`

```typescript
import Station from '../../../app/model/station';

declare module 'egg' {
  interface Context {
    model: IModel;
  }

  interface IModel {
    Station: Station;
  }
}
```

可以用来配置 watcher 的配置列表

- path
- pattern
- generator
- caseStyle
- interface
- interfaceHandle
- trigger

### 不同配置的效果

#### interface `string`

`interface` 设置为 `IOther`.

```typescript
interface IOther {
  Station: Station;
}
```

如果不设置 `interface` 将会使用随机的名称

```typescript
interface T100 {
  Station: Station;
}
```

这种情况下请一定要配置 `declareTo`，不然就没意义了。

#### generator `string`

生成器名称，watcher 监听到文件改动的时候会执行该生成器用来重新生成 d.ts，建议只使用 `class` `function` `object` `auto` 这几个生成器，因为其他几个比较定制化，不太适用于 custom loader。

##### | `generator` 设置为 `class`.

生成的声明如下

```typescript
interface IModel {
  Station: Station;
}
```

适合这样写的模块

```typescript
export default class XXXController extends Controller { }
```

##### | `generator` 设置为 `function`. ( `1.16.0` 开始支持 )

生成的声明如下

```typescript
interface IModel {
  Station: ReturnType<typeof Station>;
}
```

适合这样写的模块

```typescript
export default () => {
  return {};
}
```

##### | `generator` 设置为 `object`. ( `1.16.0` 开始支持 )

生成的声明如下

```typescript
interface IModel {
  Station: typeof Station;
}
```

适合这样写的模块

```typescript
export default {}
```

##### | `generator` 设置为 `auto`. ( `1.19.0` 开始支持 )

生成的声明如下，会自动判断 import 的类型是方法还是对象还是类。

```typescript
type AutoInstanceType<T, U = T extends (...args: any[]) => any ? ReturnType<T> : T> = U extends { new (...args: any[]): any } ? InstanceType<U> : U;

interface IModel {
  Station: AutoInstanceType<typeof Station>;
}
```

适合上面描述的所有模块。

#### interfaceHandle `function|string`

如果需要自定义类型，就可以用该配置

```js
module.exports = {
  watchDirs: {
    model: {
      ...

      interfaceHandle: val => `${val} & { [key: string]: any }`,
    }
  }
}
```

生成的声明如下

```typescript
interface IModel {
  Station: Station & { [key: string]: any };
}
```

这个配置也可以是字符串 ( `1.18.0` 开始支持 )

```js
module.exports = {
  watchDirs: {
    model: {
      ...

      interfaceHandle: '{{ 0 }} & { [key: string]: any }',
    }
  }
}
```

生成的声明跟前面方法那个一样，`{{ 0 }}` 代表方法的第一个入参。

#### caseStyle `function|string`

`caseStyle` 可以设置为 `lower`、`upper`、`camel` 或者是方法。

#### declareTo `string`

可以将生成的声明定义到 egg 的类型中，比如 egg 的 ctx 的类型是 `Context` ，就可以配置到 `Context` 下，然后通过 ctx.xxx 就可以拿到提示了。 ( `1.15.0` 开始支持 )

`declareTo` 设置为 `Context.model`，然后就可以通过 `ctx.model.xxx` 拿到代码提示了

```typescript
import Station from '../../../app/model/station';

declare module 'egg' {
  interface Context {
    model: IModel;
  }

  interface IModel {
    Station: Station;
  }
}
```

`declareTo` 设置为 `Application.model.subModel`，然后就可以通过 `app.model.subModel.xxx` 拿到代码提示了

```typescript
import Station from '../../../app/model/station';

declare module 'egg' {
  interface Application {
    model: {
      subModel: IModel;
    }
  }

  interface IModel {
    Station: Station;
  }
}
```

### 自定义生成器

```javascript
// ./tshelper.js

// 自定义 generator
function myGenerator(config, baseConfig) {
  // config.dir       dir
  // config.dtsDir    d.ts 目录
  // config.file      发生更改的文件 file
  // config.fileList  path 下的文件列表
  console.info(config);
  console.info(baseConfig);

  // 返回值可以是对象或者数组 { dist: string; content: string } | Array<{ dist: string; content: string }>
  // 如果返回的 content 是 undefined，egg-ts-helper 会删除 dist 指向的文件
  return {
    dist: 'd.ts file url',
    content: 'd.ts content'
  }
}
module.exports = {
  watchDirs: {
    model: {
      path: 'app/model',
      generator: myGenerator,
      trigger: ['add', 'unlink'],
    }
  }
}
```

或者将自定义生成器定义到其他 js 中

```javascript
// ./my-generator.js

module.exports.defaultConfig = {
  // 默认的 watchDir config
}

// 自定义 generator
module.exports = (config, baseConfig) => {
  // config.dir       dir
  // config.dtsDir    d.ts 目录
  // config.file      发生更改的文件 file
  // config.fileList  path 下的文件列表
  console.info(config);
  console.info(baseConfig);

  // 返回值可以是对象或者数组 { dist: string; content: string } | Array<{ dist: string; content: string }>
  // 如果返回的 content 是 undefined，egg-ts-helper 会删除 dist 指向的文件
  return {
    dist: 'd.ts file url',
    content: 'd.ts content'
  }
}
```

配置一下

```js
// ./tshelper.js

module.exports = {
  watchDirs: {
    model: {
      path: 'app/model',
      generator: './my-generator',
      trigger: ['add', 'unlink'],
    }
  }
}
```

## 注册器

`egg-ts-helper` 提供了 `register.js` 来更方便的搭配 [egg-bin](https://github.com/eggjs/egg-bin) 使用.

```
$ egg-bin dev -r egg-ts-helper/register
```

test/coverage/debugging

```
$ egg-bin test -r egg-ts-helper/register
$ egg-bin cov -r egg-ts-helper/register
$ egg-bin debug -r egg-ts-helper/register
```

## 示例项目

`egg-ts-helper` 可用于 egg 的 `ts` 和 `js` 项目.

TS 项目: https://github.com/whxaxes/egg-boilerplate-d-ts

JS 项目: https://github.com/whxaxes/egg-boilerplate-d-js
