import * as child_process from 'child_process';
import path from 'path';
import os from 'os';
const psList: child_process.ChildProcess[] = [];

export const tscBin = getBin('tsc');
export const eggBin = getBin('egg-bin');

export function getBin(name) {
  return path.resolve(__dirname, `../node_modules/.bin/${name}${(os.platform() === 'win32' ? '.cmd' : '')}`);
}

export function triggerBin(...args: string[]) {
  const ps = spawn(
    'node',
    [ path.resolve(__dirname, '../dist/bin.js') ].concat(args),
    {
      env: {
        ...process.env,
        ETS_SILENT: 'false',
      },
    },
  );

  return ps;
}

export function tsc(cwd: string) {
  const p = spawn(tscBin, [ '-p', path.resolve(cwd, './tsconfig.json') ], { cwd });
  return new Promise(resolve => p.on('close', resolve));
}

export async function getOutput(...args: string[]) {
  const ps = triggerBin.apply(null, args);
  const { stdout } = await getStd(ps, false, 0);
  return stdout;
}

export function fork(modulePath: string, args?: string[], opt?: child_process.ForkOptions) {
  const ps = child_process.fork(modulePath, args, opt);
  addProc(ps);
  return ps;
}

export function spawn(cmd: string, args?: string[], opt?: child_process.SpawnOptions) {
  const ps = child_process.spawn(cmd, args, opt);
  addProc(ps);
  return ps;
}

export function addProc(proc: child_process.ChildProcess) {
  if (!psList.includes(proc)) psList.push(proc);
}

export function getStd(proc: child_process.ChildProcess, autoKill?: boolean, waitTime = 5000) {
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
          proc.emit('SIGINT');
        }
      }, waitTime);
    };

    proc.stdout.on('data', data => {
      if (process.env.DEBUG) {
        process.stdout.write(data);
      }
      stdout += data.toString();
      wait();
    });

    proc.stderr.on('data', data => {
      if (process.env.DEBUG) {
        process.stderr.write(data);
      }
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
