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

A simple tool for generates typescript definition files(d.ts) for [egg](https://eggjs.org) application. Injecting `controller`,`proxy`,`service` and `extend` to egg by [Declaration Merging](https://www.typescriptlang.org/docs/handbook/declaration-merging.html)


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

`-w` flag can auto recreated d.ts while file changed

```
$ ets -w
```

## Usage

```
$ ets -h

  Usage: ets [commands] [options]

  Options:

    -v, --version           output the version number
    -w, --watch             Watching files, d.ts would recreated while file changed
    -c, --cwd [path]        Egg application base dir (default: process.cwd)
    -C, --config [path]     Configuration file, The argument can be a file path to a valid JSON/JS configuration file.（default: {cwd}/tshelper.js
    -f, --framework [name]  Egg framework(default: egg)
    -s, --silent            Running without output
    -i, --ignore [dirs]     Ignore watchDirs, your can ignore multiple dirs with comma like: -i controller,service
    -e, --enabled [dirs]    Enable watchDirs, your can enable multiple dirs with comma like: -e proxy,other
    -E, --extra [json]      Extra config, the value should be json string
    -h, --help              output usage information

  Commands:

    clean                   Clean js file while it has the same name ts file
```

## Options

| name | type | default | description |
| --- | --- | --- | --- |
| cwd | string | process.cwd | egg application base dir |
| framework | string | egg | egg framework |
| typings | string | {cwd}/typings | typings dir |
| caseStyle | string | lower | egg case style(lower,upper,camel) |
| watch | boolean | false | watch file change or not |
| execAtInit | boolean | false | execute d.ts generation while instance was created |
| configFile | string | {cwd}/tshelper.js | configure file path |
| watchDirs | object | | generator configuration |

egg-ts-helper would watching `app/extend`,`app/controller`,`app/service`, `app/config` by default. The dts would recreated when the files under these folders was changed.

you can disabled some folders by `-i` flag.

```
$ ets -i extend,controller
```

or configure in the config file

```
// {cwd}/tshelper.js

module.exports = {
  watchDirs: {
    extend: false,
    controller: false,
  }
}
```

or configure in package.json

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

## Register

You can require register to start egg-ts-helper before starting egg application with [egg-bin](https://github.com/eggjs/egg-bin).

```
$ egg-bin dev -r egg-ts-helper/register
```

debugging

```
$ egg-bin debug -r egg-ts-helper/register
```

## Demo

see https://github.com/whxaxes/egg-boilerplate-d-ts

It works in these directories : `app/controller`, `app/service`, `app/proxy`, `app/extend`, `app/config`.

#### Controller

(service, proxy are the same)

ts

```typescript
// app/controller/home.ts
import { Controller } from 'egg';

export default class HomeController extends Controller {
  public async index() {
    this.ctx.body = 'ok';
  }
}
```

typings

```typescript
// app/typings/app/controller/index.d.ts
import Home from '../../../app/controller/home';

declare module 'egg' {
  interface IController {
    home: Home;
  }
}
```

#### Extend

ts

```typescript
// app/extend/context.ts
export default {
  doSomething() {
    console.info('do something');
  }
};
```

typings

```typescript
// app/typings/app/controller/index.d.ts
import ExtendObject from '../../../app/extend/context';

declare module 'egg' {
  interface Context {
    doSomething: typeof ExtendObject.doSomething;
  }
}
```

#### Config

ts

```typescript
// config/config.default.ts
export default function() {
  return {
    keys: '123456'
  }
}
```

typings

```typescript
// app/typings/config/index.d.ts
import { EggAppConfig } from 'egg';
import ExportConfigDefault from '../../config/config.default';
type ConfigDefault = ReturnType<typeof ExportConfigDefault>;
type NewEggAppConfig = EggAppConfig & ConfigDefault;

declare module 'egg' {
  interface Application {
    config: NewEggAppConfig;
  }

  interface Controller {
    config: NewEggAppConfig;
  }

  interface Service {
    config: NewEggAppConfig;
  }
}
```

#### Plugin

ts

```typescript
// config/plugin.ts
export default {
  cors: {
    enable: true,
    package: 'egg-cors',
  },
  static: {
    enable: true,
    package: 'egg-static',
  }
}
```

typings

```typescript
// app/typings/config/plugin.d.ts

// it's only import the package was exist under the node_modules
import 'egg-cors';
import 'egg-static';
```
