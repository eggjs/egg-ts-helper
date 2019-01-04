import { ChildProcess, spawn } from 'child_process';
import path from 'path';
import os from 'os';

let ps: ChildProcess | undefined;
export function triggerBin(...args: string[]) {
  ps = spawn(
    'node',
    [ path.resolve(__dirname, '../dist/bin.js') ].concat(args),
    {
      env: {
        ...process.env,
        NODE_ENV: 'local',
      },
    },
  );

  return ps;
}

export function tsc(cwd: string) {
  const bin = path.resolve(__dirname, '../node_modules/.bin/tsc' + (os.platform() === 'win32' ? '.cmd' : ''));
  const p = spawn(bin, [], { cwd });
  return new Promise(resolve => p.on('exit', resolve));
}

export function getOutput(...args: string[]) {
  ps = triggerBin.apply(null, args);
  return new Promise<string>(resolve => {
    let info = '';
    ps!.stdout.on('data', data => {
      info += data.toString();
    });

    ps!.on('close', () => {
      resolve(info);
    });
  });
}

afterEach(() => {
  if (ps && !ps.killed) {
    ps.kill();
  }
});

export function sleep(time) {
  return new Promise(res => setTimeout(res, time));
}
