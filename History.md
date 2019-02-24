
1.22.3 / 2019-02-24
===================

  * fix: register should use env instead of file (#37)

1.22.2 / 2019-02-23
===================

  * fix: no need to clean cache file (#36)

1.22.1 / 2019-02-18
===================

  * fix: ignore watcher initial (#33)
  * docs: update docs

1.22.0 / 2019-02-14
===================

  * feat: auto gen jsconfig in js project & pass options from env (#31)

1.21.0 / 2019-02-02
===================

  * feat: add Egg to global namespace (#30)

1.20.0 / 2019-01-06
===================

  * generator support default config
  * add silent to options of TsHelper
  * ext of config file default to .js or .json
  * add init command

1.19.2 / 2018-12-20
===================

  * fix: agent should merge to Agent (#26)

1.19.1 / 2018-12-12
===================

  * fix:  interfaceHandle cannot be covered (#25)

1.19.0 / 2018-12-12
===================

  * feat: generator of configure support file path
  * feat: add a new generator: auto
  * refactor: code splitting and add a new class Watcher

1.18.0 / 2018-12-10
===================

  * feat: interfaceHandle can be string
  * fix: interfaceHandle in `function` or `object` can be overwrite.

1.17.1 / 2018-12-05
===================

  * fix: fixed clean bug

1.17.0 / 2018-12-05
===================

  * feat: support js project & add oneForAll option (#21)

1.16.1 / 2018-11-29
===================

  * fix: add tslib deps

1.16.0 / 2018-11-29
===================

  * chore: update comment
  * feat: add prefix to interface
  * refactor: add esModuleInterop option
  * feat: add new generator `function` and `object`
  * refactor: refactor build-in generators

1.15.0 / 2018-11-28
===================

  * feat: add `declareTo` option
  * chore: upgrade typescript to 3.0

1.14.0 / 2018-11-12
===================

  * feat: caseStyle option add function support (#19)

1.13.0 / 2018-10-13
===================

  * feat: silent in test (#17)

1.12.1 / 2018-09-30
===================

  * fix: interface don't contain semicolon (#15)

1.12.0 / 2018-09-30
===================

  * feat: generate extend type with env (#14)

1.11.0 / 2018-09-10
===================

  * feat: Code Optimization (#10)

1.10.0 / 2018-08-30
===================

  * feat: model.enabled default to true
  * feat: add model check and only read framework from tsHelper.framework
  * docs: update docs

1.9.0 / 2018-06-22
==================

  * feat: add chokidar options

1.8.0 / 2018-05-29
==================

  * feat: support model

1.7.1 / 2018-05-22
==================

  * fix: fixed mistake of middleware dts

1.7.0 / 2018-05-07
==================

  * fix: lint fix
  * feat: support auto created d.ts for middleware

1.6.1 / 2018-04-23
==================

  * fix: make sure register was running only once time

1.6.0 / 2018-04-10
==================

  * feat: do not write file if ts not changed
  * feat: add plugin generator
