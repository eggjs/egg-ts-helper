# egg-ts-helper

[![NPM version][npm-image]][npm-url]
[![Build Status][travis-image]][travis-url]
[![Appveyor status][appveyor-image]][appveyor-url]
[![Coverage Status][coveralls-image]][coveralls-url]

[npm-image]: https://img.shields.io/npm/v/egg-ts-helper.svg?style=flat-square
[npm-url]: https://npmjs.org/package/egg-ts-helper
[travis-url]: https://travis-ci.org/whxaxes/egg-ts-helper
[travis-image]: http://img.shields.io/travis/whxaxes/egg-ts-helper.svg
[appveyor-url]: https://ci.appveyor.com/project/whxaxes/egg-ts-helper/branch/master
[appveyor-image]: https://ci.appveyor.com/api/projects/status/github/whxaxes/egg-ts-helper?branch=master&svg=true
[coveralls-url]: https://coveralls.io/r/whxaxes/egg-ts-helper
[coveralls-image]: https://img.shields.io/coveralls/whxaxes/egg-ts-helper.svg

A simple tool using to create `d.ts` for [egg](https://eggjs.org) application. Injecting `controller, proxy, service, etc.` to the types of egg by [Declaration Merging](https://www.typescriptlang.org/docs/handbook/declaration-merging.html) for typeCheck and IntelliSense


## Install

```
npm i egg-ts-helper -g
```

or

```
yarn global add egg-ts-helper
```

## QuickStart

Open your egg application, executing the command

```
$ ets
```

It can auto recreate d.ts while the file has changed by `-w` flag.

```
$ ets -w
```

Or using `register` in `egg-bin`

```
$ egg-bin dev -r egg-ts-helper/register
```

## CLI

```
$ ets -h

  Usage: ets [commands] [options]

  Options:

    -v, --version           Output the version number
    -w, --watch             Watching files, d.ts will recreate if file is changed
    -c, --cwd [path]        Egg application base dir (default: process.cwd)
    -C, --config [path]     Configuration file, The argument can be a file path to a valid JSON/JS configuration file.(default: {cwd}/tshelper.js)
    -o, --oneForAll [path]  Create a d.ts import all types (default: typings/ets.d.ts)
    -s, --silent            Running without output
    -i, --ignore [dirs]     Ignore watchDirs, your can ignore multiple dirs with comma like: -i controller,service
    -e, --enabled [dirs]    Enable watchDirs, your can enable multiple dirs with comma like: -e proxy,other
    -E, --extra [json]      Extra config, the value should be json string
    -h, --help              Output usage information

  Commands:

    clean                   Clean js file when it has same name ts file
```

## Configuration

| name | type | default | description |
| --- | --- | --- | --- |
| cwd | `string` | process.cwd | egg application base dir |
| typings | `string` | {cwd}/typings | typings dir |
| caseStyle | `string` `Function` | lower | egg case style(lower,upper,camel) or `(filename) => {return 'YOUR_CASE'}`|
| watch | `boolean` | false | watch file change or not |
| watchOptions | `object` | undefined | chokidar [options](https://github.com/paulmillr/chokidar#api) |
| execAtInit | `boolean` | false | execute d.ts generation while instance was created |
| configFile | `string` | {cwd}/tshelper.js | configure file path |
| watchDirs | `object` | | generator configuration |

You can configure the options above in `./tshelper.js` or `package.json`.

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

## Generators

Generator is the core of `egg-ts-helper`. ( build-in generator: https://github.com/whxaxes/egg-ts-helper/tree/master/src/generators
 )

In startup, `egg-ts-helper` executes all watcher's generator, the generator will traverse the directory and collect modules, then return fields `dist`( d.ts file path ) and `content`( import these modules and defined to interface of egg. ) to `egg-ts-helper`. `egg-ts-helper` will create `d.ts` by `dist` and `content` fields.

You can configure watcher in option `watchDirs` ( see `getDefaultWatchDirs` method in https://github.com/whxaxes/egg-ts-helper/blob/master/src/index.ts to know default config of watcher ). `egg-ts-helper` watch these directories `app/extend`,`app/controller`,`app/service`, `app/config`, `app/middleware`, `app/model` by default. When the files under these folders is changed, the `d.ts` will be created ( config.watch should set to true ) .

Watcher can be disabled by `-i` flag.

```
$ ets -i extend,controller
```

Or configure in `tshelper.js`, setting `watchDirs.extend` and `watchDirs.controller` to `false`.

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

The name of generator, ( the generator will be executed and recreate `d.ts` when the file is changed. ) but I recommend to use `class` `function` `object` only, because the other generator is not suitable for custom loader.

`generator` set to `class`.

```typescript
interface IModel {
  Station: Station;
}
```

`generator` set to `function`. ( Support since `1.16.0` )

```typescript
interface IModel {
  Station: ReturnType<typeof Station>;
}
```

`generator` set to `object`. ( Support since `1.16.0` )

```typescript
interface IModel {
  Station: typeof Station;
}
```

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

The generated typings is the same as above. `{{ 0 }}` means the first argument in function.

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
