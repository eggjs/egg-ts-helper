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

A simple tool for generating declaration files in [egg](https://eggjs.org) application. Injecting `controller`,`proxy`,`service` and `extend` to egg by [Declaration Merging](https://www.typescriptlang.org/docs/handbook/declaration-merging.html)


## Install

```
npm i egg-ts-helper -g
```

or

```
yarn global add egg-ts-helper
```

## Usage

```
$ ets -h

Usage: ets [options]
Options:
   -h, --help               usage
   -v, --version            show version
   -w, --watch              watch file change
   -c, --cwd [path]         egg application base dir (default: process.cwd)
   -C, --config [path]      configuration file, The argument can be a file path to a valid JSON/JS configuration file.（default: {cwd}/tshelper.js）
   -f, --framework [name]   egg framework(default: egg)
   -s, --silent             disabled log
   -i, --ignore [dir]       ignore watchDirs, your can ignore multiple dirs with comma like: -i controller,service
   -e, --enabled [dir]      enabled watchDirs, your can use multiple dirs with comma like: -e proxy,other
   -E, --extra [json]       extra config, value type was a json string
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

egg-ts-helper would watching `app/extend`,`app/controller`,`app/service` by default. The dts would recreated when the files changed under these folders.

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

You can use register to start egg-ts-helper before starting egg application.

```
$ node -r egg-ts-helper/register index.js
```

## Demo

see https://github.com/whxaxes/egg-boilerplate-d-ts

It works in these directories : `app/controller`, `app/service`, `app/proxy`, `app/extend`.

#### Controller

(service, proxy are the same)

ts

```js
// app/controller/home.ts
import { Controller } from 'egg';

export default class HomeController extends Controller {
  public async index() {
    this.ctx.body = 'ok';
  }
}
```

typings

```js
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

```js
// app/extend/context.ts
export default {
  doSomething() {
    console.info('do something');
  }
};
```

typings

```js
// app/typings/app/controller/index.d.ts
import ExtendObject from '../../../app/extend/context';

declare module 'egg' {
  interface Context {
    doSomething: typeof ExtendObject.doSomething;
  }
}
```


