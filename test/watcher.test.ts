import { createTsHelperInstance, getDefaultWatchDirs } from '../dist';
import Watcher, { WatchItem } from '../dist/watcher';
import path from 'path';
import assert = require('assert');

describe('watcher.test.ts', () => {
  let watcher: Watcher;
  const tsHelper = createTsHelperInstance({
    cwd: path.resolve(__dirname, './fixtures/app'),
    watch: false,
    execAtInit: true,
    autoRemoveJs: false,
  });

  const defaultWatchDir = getDefaultWatchDirs();

  afterEach(() => {
    watcher.destroy();
  });

  it('should works without error', () => {
    watcher = new Watcher(
      {
        ...defaultWatchDir.model as WatchItem,
        name: 'xxx',
      },
      tsHelper,
    );

    assert(!!watcher.execute().dist);
    assert(!!watcher.execute().content);
  });

  it('should watch multiple times without error', () => {
    watcher = new Watcher(
      {
        ...defaultWatchDir.model as WatchItem,
        name: 'xxx',
      },
      tsHelper,
    );

    watcher.watch();
    const oldWatcher = watcher.fsWatcher!;
    watcher.watch();
    assert(oldWatcher !== watcher.fsWatcher);
  });

  it('should throttle without error', () => {
    watcher = new Watcher(
      {
        ...defaultWatchDir.model as WatchItem,
        name: 'xxx',
      },
      tsHelper,
    );

    watcher.watch();
    watcher.fsWatcher!.emit('add', 'fff');
    watcher.fsWatcher!.emit('add', 'fff');
    watcher.fsWatcher!.emit('add', 'fff2');
    assert(watcher.throttleStack.length === 2);
  });

  it('should throw error if generator is not exist', () => {
    try {
      watcher = new Watcher(
        {
          ...defaultWatchDir.model as WatchItem,
          name: 'xxx',
          generator: '666',
        },
        tsHelper,
      );
    } catch (e) {
      return;
    }

    throw new Error('should throw error');
  });
});
