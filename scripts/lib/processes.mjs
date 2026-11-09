import { spawn } from 'node:child_process';
import { setTimeout, clearTimeout } from 'node:timers';

export const PROCESS_SHUTDOWN_GRACE_MS = 3000;

export function pnpmCommand(args) {
  return process.env.npm_execpath
    ? [process.execPath, [process.env.npm_execpath, ...args]]
    : ['pnpm', args];
}

// Each POSIX child owns a process group, including its package-manager descendants.
// No process lookup, global kill or unrelated server cleanup is performed.
export function runProcesses(
  commands,
  { cwd, env = process.env, onOutput, shutdownGraceMs = PROCESS_SHUTDOWN_GRACE_MS } = {}
) {
  if (commands.length === 0) throw new Error('Expected at least one child command.');
  return new Promise((resolve) => {
    let stopping = false;
    let exitCode = 0;
    let closed = 0;
    let timeout;
    const children = [];
    function signalChildren(signal) {
      for (const child of children) {
        if (!child.pid) continue;
        try {
          if (process.platform === 'win32') child.kill(signal);
          else process.kill(-child.pid, signal);
        } catch (error) {
          if (error.code !== 'ESRCH') console.error(error);
        }
      }
    }
    function stop(code, signal = 'SIGTERM') {
      if (stopping) return;
      stopping = true;
      exitCode = code;
      signalChildren(signal);
      timeout = setTimeout(() => signalChildren('SIGKILL'), shutdownGraceMs);
    }
    const interrupt = () => stop(130, 'SIGINT');
    const terminate = () => stop(143, 'SIGTERM');
    // Package managers may forward the same signal after the process group receives it.
    // Keep handlers installed until descendants close so repeats cannot bypass cleanup.
    process.on('SIGINT', interrupt);
    process.on('SIGTERM', terminate);
    for (const [command, args] of commands) {
      const child = spawn(command, args, {
        cwd,
        env,
        stdio: onOutput ? ['inherit', 'pipe', 'pipe'] : 'inherit',
        detached: process.platform !== 'win32',
      });
      if (onOutput) {
        for (const stream of ['stdout', 'stderr'])
          child[stream].on('data', (chunk) => {
            process[stream].write(chunk);
            onOutput(chunk.toString(), stream);
          });
      }
      children.push(child);
      child.once('error', (error) => {
        console.error(error.message);
        stop(1);
      });
      child.once('exit', (code) => stop(code ?? 1));
      child.once('close', () => {
        closed++;
        if (closed !== commands.length) return;
        clearTimeout(timeout);
        signalChildren('SIGKILL');
        process.removeListener('SIGINT', interrupt);
        process.removeListener('SIGTERM', terminate);
        resolve(exitCode);
      });
    }
  });
}
