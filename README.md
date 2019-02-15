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
[easter-image]: https://img.shields.io/badge/easter%20egg-none-brightgreen.svg?style=flat-square

A simple tool for creating `d.ts` in [egg](https://eggjs.org) application. Injecting `controller, proxy, service, etc.` to definition type of egg ( such as `Context` `Application` etc. ) by [Declaration Merging](https://www.typescriptlang.org/docs/handbook/declaration-merging.html), and making IntelliSense works in both egg-js and egg-ts.


## Install

open your application and install.

```
npm i egg-ts-helper --save-dev
```

or

```
yarn add egg-ts-helper --dev
```

## QuickStart

Open your egg application, executing ets by [npx](https://github.com/zkat/npx)

```
$ npx ets
```

Watching files by `-w` flag.

```
$ npx ets -w
```

`egg-ts-helper` has build-in in `egg-bin`, You can easily to use it by

```
$ egg-bin dev --dts
```

or add configuration `egg.declarations` in `package.json`

## CLI

```
$ ets -h

  Usage: bin [commands] [options]

  Options:
    -v, --version           output the version number
    -w, --watch             Watching files, d.ts would recreated while file changed
    -c, --cwd [path]        Egg application base dir (default: process.cwd)
    -C, --config [path]     Configuration file, The argument can be a file path to a valid JSON/JS configuration file.（default: {cwd}/tshelper.js
    -f, --framework [name]  Egg framework(default: egg)
    -o, --oneForAll [path]  Create a d.ts import all types (default: typings/ets.d.ts)
    -s, --silent            Running without output
    -i, --ignore [dirs]     Ignore watchDirs, your can ignore multiple dirs with comma like: -i controller,service
    -e, --enabled [dirs]    Enable watchDirs, your can enable multiple dirs with comma like: -e proxy,other
    -E, --extra [json]      Extra config, the value should be json string
    -h, --help              output usage information

  Commands:
    clean                   Clean js file while it has the same name ts file
    init <type>             Init egg-ts-helper in your existing project
```

## Configuration

| name | type | default | description |
| --- | --- | --- | --- |
| cwd | `string` | process.cwd | egg application base dir |
| typings | `string` | {cwd}/typings | typings dir |
| caseStyle | `string` `Function` | lower | egg case style(lower,upper,camel) or `(filename) => {return 'YOUR_CASE'}`|
| silent | `boolean` | false | ignore logging |
| watch | `boolean` | false | watch file change or not |
| watchOptions | `object` | undefined | chokidar [options](https://github.com/paulmillr/chokidar#api) |
| execAtInit | `boolean` | false | execute d.ts generation while instance was created |
| configFile | `string` | {cwd}/tshelper.(js|json) | configure file path |
| watchDirs | `object` | | generator configuration |

You can configure the options above in `./tshelper.js` `./tshelper.json` or `package.json`.

In `tshelper.js`

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

In `tshelper.json`

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

In `package.json`

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

Also you can pass options by env ( support since 1.22.0 )

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

## Generators

Generator is the core of `egg-ts-helper`. ( build-in generator: https://github.com/whxaxes/egg-ts-helper/tree/master/src/generators
 )

On `egg-ts-helper` startup, it will executes all watcher's generator for traversing directories and collect modules, after executing, generator return fields `dist`( d.ts file path ) and `content`( import these modules and defined to interface of egg. ) to `egg-ts-helper`, then writes `content` to `dist`  ( remove file if `content` is undefined ).

Watcher can be configured in option `watchDirs` ( see `getDefaultWatchDirs` method in https://github.com/whxaxes/egg-ts-helper/blob/master/src/index.ts to know default config of watcher ). `egg-ts-helper` watch these directories `app/extend`,`app/controller`,`app/service`, `app/config`, `app/middleware`, `app/model` by default. The `d.ts` will be recreated when files under these folders are changed ( config.watch should set to `true` ) .

You can disable watcher by `-i` flag.

```
$ ets -i extend,controller
```

Or in `tshelper.js`, setting `watchDirs.extend` and `watchDirs.controller` to `false`.

```
// {cwd}/tshelper.js

module.exports = {
  watchDirs: {
    extend: false,
    controller: false,
  }
}
```

Or in `package.json` , setting is the same as above.

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

## Extend

`egg-ts-helper` using generator to implement feature like loader in egg. and it also support custom loader.

See the example below to know how to configure.

### Example

Creating `d.ts` for `model` by `egg-ts-helper`. Setting `watchDirs.model` in `tshelper.js`.

```typescript
// ./tshelper.js

module.exports = {
  watchDirs: {
    model: {
      path: 'app/model', // dir path
      // pattern: '**/*.(ts|js)', // glob pattern, default is **/*.(ts|js). it doesn't need to configure normally.
      generator: 'class', // generator name
      interface: 'IModel',  // interface name
      declareTo: 'Context.model', // declare to this interface
      // watch: true, // whether need to watch files
      // caseStyle: 'upper', // caseStyle for loader
      // interfaceHandle: val => `ReturnType<typeof ${val}>`, // interfaceHandle
      // trigger: ['add', 'unlink'], // recreate d.ts when receive these events, all events: ['add', 'unlink', 'change']
    }
  }
}
```

The configuration can create d.ts in below.

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

the options using to configure watcher

- path
- pattern
- generator
- caseStyle
- interface
- interfaceHandle
- trigger

### Effect of different options

#### interface `string`

`interface` set to `IOther`.

```typescript
interface IOther {
  Station: Station;
}
```

It will use random interface name if `interface` is not set.

```typescript
interface T100 {
  Station: Station;
}
```

Should set `declareTo` if without `interface`.

#### generator `string`

The name of generator, ( the generator will be executed and recreate `d.ts` when the file is changed. ) but I recommend to use `class` `function` `object` `auto` only, because the other generator is not suitable for custom loader.

##### | `generator` set to `class`

the types created by `class` generator like below

```typescript
interface IModel {
  Station: Station;
}
```

suitable for module like this

```typescript
export default class XXXController extends Controller { }
```

##### | `generator` set to `function` ( Support since `1.16.0` )

the types created by `function` generator like below

```typescript
interface IModel {
  Station: ReturnType<typeof Station>;
}
```

suitable for module like this

```typescript
export default () => {
  return {};
}
```

##### | `generator` set to `object` ( Support since `1.16.0` )

the types created by `object` generator like below.

```typescript
interface IModel {
  Station: typeof Station;
}
```

suitable for module like this

```typescript
export default {}
```

##### | `generator` set to `auto` ( Support since `1.19.0` )

the types created by `auto` generator like below. It will check types automatically.

```typescript
type AutoInstanceType<T, U = T extends (...args: any[]) => any ? ReturnType<T> : T> = U extends { new (...args: any[]): any } ? InstanceType<U> : U;

interface IModel {
  Station: AutoInstanceType<typeof Station>;
}
```

suitable for every module in above.

#### interfaceHandle `function|string`

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

The generated typings.

```typescript
interface IModel {
  Station: Station & { [key: string]: any };
}
```

The type of `interfaceHandle` can be `string` ( Support since `1.18.0` )

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

The generated typings are the same as above. `{{ 0 }}` means the first argument in function.

#### caseStyle `function|string`

`caseStyle` can set to `lower`、`upper`、`camel` or function

#### declareTo `string`

Declaring interface to definition of egg. ( Support since `1.15.0` )

`declareTo` set to `Context.model` , and you can get intellisense by `ctx.model.xxx`

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

`declareTo` set to `Application.model.subModel`, and you can get intellisense by `app.model.subModel.xxx`

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

### Defining custom generator

```javascript
// ./tshelper.js

// custom generator
function myGenerator(config, baseConfig) {
  // config.dir       dir
  // config.dtsDir    d.ts dir
  // config.file      changed file
  // config.fileList  file list
  console.info(config);
  console.info(baseConfig);

  // return type can be object or array { dist: string; content: string } | Array<{ dist: string; content: string }>
  // egg-ts-helper will remove dist file when content is undefined.
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

or define generator to other js.

```javascript
// ./my-generator.js

module.exports.defaultConfig = {
  // default watchDir config
}

// custom generator
module.exports = (config, baseConfig) => {
  // config.dir       dir
  // config.dtsDir    d.ts dir
  // config.file      changed file
  // config.fileList  file list
  console.info(config);
  console.info(baseConfig);

  // return type can be object or array { dist: string; content: string } | Array<{ dist: string; content: string }>
  // egg-ts-helper will remove dist file when content is undefined.
  return {
    dist: 'd.ts file url',
    content: 'd.ts content'
  }
}
```

configure in `tshelper.js` or `package.json`

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

## Register

`egg-ts-helper` offers a `register.js` for easier to use with [egg-bin](https://github.com/eggjs/egg-bin).

```
$ egg-bin dev -r egg-ts-helper/register
```

test/coverage/debugging

```
$ egg-bin test -r egg-ts-helper/register
$ egg-bin cov -r egg-ts-helper/register
$ egg-bin debug -r egg-ts-helper/register
```

## Demo

`egg-ts-helper` can works in both `ts` and `js` egg project.

TS demo: https://github.com/whxaxes/egg-boilerplate-d-ts

JS demo: https://github.com/whxaxes/egg-boilerplate-d-js
