import * as child_process from 'child_process';
import path from 'path';
import os from 'os';
const psList: child_process.ChildProcess[] = [];

export function triggerBin(...args: string[]) {
  const ps = spawn(
    'node',
    [ path.resolve(__dirname, '../dist/bin.js') ].concat(args),
    {
      env: {
        ...process.env,
        NODE_ENV: 'development',
      },
    },
  );

  return ps;
}

export function tsc(cwd: string) {
  const bin = path.resolve(__dirname, '../node_modules/.bin/tsc' + (os.platform() === 'win32' ? '.cmd' : ''));
  const p = spawn(bin, [ '-p', path.resolve(cwd, './tsconfig.json') ], { cwd });
  return new Promise(resolve => p.on('close', resolve));
}

export async function getOutput(...args: string[]) {
  const ps = triggerBin.apply(null, args);
  const { stdout } = await getStd(ps, false, 0);
  return stdout;
}

export function fork (...args) {
  const ps = child_process.fork.apply(child_process, args as any);
  addProc(ps);
  return ps;
}

export function spawn (...args) {
  const ps = child_process.spawn.apply(undefined, args as any);
  addProc(ps);
  return ps;
}

export function addProc(proc: child_process.ChildProcess) {
  if (!psList.includes(proc)) psList.push(proc);
}

export function getStd(proc: child_process.ChildProcess, autoKill?: boolean, waitTime = 2000) {
  addProc(proc);
  return new Promise<{ stdout: string; stderr: string}>(resolve => {
    let stdout = '';
    let stderr = '';
    let tick;
    const end = () => resolve({ stdout, stderr });
    const wait = () => {
      if (!waitTime) {
        return;
      }

      clearTimeout(tick);
      tick = setTimeout(() => {
        end();
        proc.removeListener('close', end);
        if (autoKill) {
          proc.kill('SIGINT');
        }
      }, waitTime);
    };

    proc.stdout.on('data', data => {
      stdout += data.toString();
      wait();
    });

    proc.stderr.on('data', data => {
      stderr += data.toString();
      wait();
    });

    proc.once('close', end);
  });
}

afterEach(() => {
  psList.forEach(ps => {
    if (ps && !ps.killed) {
      ps.kill('SIGINT');
    }
  });
  psList.length = 0;
});

export function sleep(time) {
  return new Promise(res => setTimeout(res, time));
}
