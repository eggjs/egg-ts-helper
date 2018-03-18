# egg-ts-helper

A simple tool for generating declaration files in [egg](https://eggjs.org) application, Injecting `controller`,`proxy`,`service` and `extend` to egg by [Declaration Merging](https://www.typescriptlang.org/docs/handbook/declaration-merging.html)

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


## Install

```
npm i egg-ts-helper --save-dev
```

or

```
yarn add egg-ts-helper --dev
```

## Usage

using npx

```
$ npx ets -h

Usage: ets [options]
Options:
   -h, --help             usage
   -v, --version          show version
   -w, --watch            watch file change
   -c, --cwd [path]       egg application base dir(default: process.cwd)
   -f, --framework [name] egg framework(default: egg)
   -s, --silent           no log
   -i, --ignore           ignore dir, your can ignore multiple dirs with comma like: -i proxy,controller
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


