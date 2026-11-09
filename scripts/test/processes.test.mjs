import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtempSync, existsSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout } from 'node:timers/promises';
import { test } from 'node:test';
import { URL } from 'node:url';
import { runProcesses } from '../lib/processes.mjs';

test('propagates failure and spawn errors', async () => {
  assert.equal(await runProcesses([[process.execPath, ['-e', 'process.exit(7)']]]), 7);
  assert.equal(await runProcesses([['/definitely-missing-gallery-command', []]]), 1);
});

async function eventually(predicate) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (predicate()) return;
    await setTimeout(30);
  }
  assert.fail('Timed out waiting for child process lifecycle.');
}

function alive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error.code === 'ESRCH') return false;
    throw error;
  }
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  test(
    `${signal} reaches app/watch descendants and preserves unrelated processes`,
    { skip: process.platform === 'win32' },
    async (context) => {
      const root = mkdtempSync(path.join(tmpdir(), 'gallery-process-'));
      const unrelated = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)']);
      const module = new URL('../lib/processes.mjs', import.meta.url).href;
      const commands = ['app', 'watch'].map((name) => [
        process.execPath,
        [
          '-e',
          `
      const { spawn } = require('node:child_process');
      const { writeFileSync } = require('node:fs');
      const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)']);
      writeFileSync(${JSON.stringify(path.join(root, name))}, JSON.stringify([process.pid, child.pid]));
      setInterval(() => {}, 1000);
    `,
        ],
      ]);
      const supervisor = spawn(process.execPath, [
        '--input-type=module',
        '-e',
        `
      import { runProcesses } from ${JSON.stringify(module)};
      process.exitCode = await runProcesses(${JSON.stringify(commands)});
    `,
      ]);
      context.after(() => {
        supervisor.kill('SIGKILL');
        unrelated.kill('SIGKILL');
        for (const name of ['app', 'watch']) {
          const file = path.join(root, name);
          if (existsSync(file))
            for (const pid of JSON.parse(readFileSync(file, 'utf8'))) {
              try {
                process.kill(pid, 'SIGKILL');
              } catch (error) {
                if (error.code !== 'ESRCH') throw error;
              }
            }
        }
        rmSync(root, { recursive: true, force: true });
      });
      await eventually(() => ['app', 'watch'].every((name) => existsSync(path.join(root, name))));
      const exited = once(supervisor, 'exit');
      supervisor.kill(signal);
      const [code] = await exited;
      assert.equal(code, signal === 'SIGINT' ? 130 : 143);
      const pids = ['app', 'watch'].flatMap((name) =>
        JSON.parse(readFileSync(path.join(root, name), 'utf8'))
      );
      await eventually(() => pids.every((pid) => !alive(pid)));
      assert.ok(alive(unrelated.pid));
    }
  );
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  test(
    `repeated ${signal} cannot bypass forced descendant cleanup`,
    { skip: process.platform === 'win32' },
    async (context) => {
      const root = mkdtempSync(path.join(tmpdir(), 'repeated-signal-'));
      const ready = path.join(root, 'ready'),
        received = path.join(root, 'received');
      const module = new URL('../lib/processes.mjs', import.meta.url).href;
      const commands = [
        [
          process.execPath,
          [
            '-e',
            `
      const {writeFileSync} = require('node:fs');
      process.on(${JSON.stringify(signal)}, () => writeFileSync(${JSON.stringify(received)}, 'received'));
      writeFileSync(${JSON.stringify(ready)}, String(process.pid));
      setInterval(() => {}, 1000);
    `,
          ],
        ],
      ];
      const supervisor = spawn(
        process.execPath,
        [
          '--input-type=module',
          '-e',
          `
      import {runProcesses} from ${JSON.stringify(module)};
      process.exitCode = await runProcesses(${JSON.stringify(commands)});
    `,
        ],
        { stdio: 'ignore' }
      );
      context.after(() => {
        supervisor.kill('SIGKILL');
        if (existsSync(ready)) {
          try {
            process.kill(Number(readFileSync(ready, 'utf8')), 'SIGKILL');
          } catch (error) {
            if (error.code !== 'ESRCH') throw error;
          }
        }
        rmSync(root, { recursive: true, force: true });
      });
      await eventually(() => existsSync(ready));
      const exited = once(supervisor, 'exit');
      supervisor.kill(signal);
      await eventually(() => existsSync(received));
      supervisor.kill(signal);
      const [code, exitSignal] = await exited;
      assert.equal(exitSignal, null);
      assert.equal(code, signal === 'SIGINT' ? 130 : 143);
      await eventually(() => !alive(Number(readFileSync(ready, 'utf8'))));
    }
  );
}
