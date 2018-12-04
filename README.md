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

A simple tool using to create `d.ts` for [egg](https://eggjs.org) application. Injecting `controller`,`proxy`,`service` and `extend` to egg by [Declaration Merging](https://www.typescriptlang.org/docs/handbook/declaration-merging.html)


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

## Usage

```
$ ets -h

  Usage: ets [commands] [options]

  Options:

    -v, --version           Output the version number
    -w, --watch             Watching files, d.ts will recreate if file is changed
    -c, --cwd [path]        Egg application base dir (default: process.cwd)
    -C, --config [path]     Configuration file, The argument can be a file path to a valid JSON/JS configuration file.（default: {cwd}/tshelper.js
    -f, --framework [name]  Egg framework(default: egg)
    -o, --oneForAll [path]  Create a d.ts import all types (default: typings/ets.d.ts)
    -s, --silent            Running without output
    -i, --ignore [dirs]     Ignore watchDirs, your can ignore multiple dirs with comma like: -i controller,service
    -e, --enabled [dirs]    Enable watchDirs, your can enable multiple dirs with comma like: -e proxy,other
    -E, --extra [json]      Extra config, the value should be json string
    -h, --help              Output usage information

  Commands:

    clean                   Clean js file when it has same name ts file
```

## Options

| name | type | default | description |
| --- | --- | --- | --- |
| cwd | `string` | process.cwd | egg application base dir |
| framework | `string` | egg | egg framework |
| typings | `string` | {cwd}/typings | typings dir |
| caseStyle | `string` `Function` | lower | egg case style(lower,upper,camel) or `(filename) => {return 'YOUR_CASE'}`|
| watch | `boolean` | false | watch file change or not |
| watchOptions | `object` | undefined | chokidar [options](https://github.com/paulmillr/chokidar#api) |
| execAtInit | `boolean` | false | execute d.ts generation while instance was created |
| configFile | `string` | {cwd}/tshelper.js | configure file path |
| watchDirs | `object` | | generator configuration |

egg-ts-helper watch `app/extend`,`app/controller`,`app/service`, `app/config`, `app/middleware`, `app/model` by default. The d.ts can recreate when the files under these folders is changed.

You can disabled some folders by `-i` flag.

```
$ ets -i extend,controller
```

Or configure in `tshelper.js`

```
// {cwd}/tshelper.js

module.exports = {
  watchDirs: {
    extend: false,
    controller: false,
  }
}
```

Or `package.json`

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

`egg-ts-helper` not only support the base loader( controller, middleware ... ), but also support custom loader.

### Example

Creating d.ts for `model` by `egg-ts-helper`.

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

The configuration can create d.ts like below.

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

option list

- path
- pattern
- generator
- caseStyle
- interface
- interfaceHandle
- trigger

### Effect of different options.

**interface** `string`

`interface` set to `IOther`.

```typescript
interface IOther {
  Station: Station;
}
```

**generator** `string`

see https://github.com/whxaxes/egg-ts-helper/tree/master/src/generators



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

**interfaceHandle** `function`

If you want to define your own type, just setting the `interfaceHandle`.

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

The typings.

```typescript
interface IModel {
  Station: Station & { [key: string]: any };
}
```

**caseStyle** `string|function`

`caseStyle` can set to `lower`、`upper`、`camel` or function

**declareTo** `string` ( Support since `1.15.0` )

`declareTo` set to `Context.model`

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

`declareTo` set to `Application.model.subModel`

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

`egg-ts-helper` offers a `register.js` for easyier to use with [egg-bin](https://github.com/eggjs/egg-bin).

```
$ egg-bin dev -r egg-ts-helper/register
```

test/coverage/debugging

```
$ egg-bin test -r egg-ts-helper/register
$ egg-bin cov -r egg-ts-helper/register
$ egg-bin debug -r egg-ts-helper/register
```

## Declarations

see https://github.com/whxaxes/egg-ts-helper/tree/master/test/fixtures/real/typings


## Demo

see https://github.com/whxaxes/egg-boilerplate-d-ts
