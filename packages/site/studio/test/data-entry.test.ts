// @vitest-environment node

import { execFileSync } from 'node:child_process';
import { test } from 'vitest';

test('the built data entry can edit and read a project without importing React or Puck', () => {
  execFileSync(
    process.execPath,
    [
      '--input-type=module',
      '--eval',
      `
        import assert from 'node:assert/strict';
        import { registerHooks } from 'node:module';

        registerHooks({
          resolve(specifier, context, nextResolve) {
            const [scope, name] = specifier.split('/');
            const usesReact = scope === 'react' || scope === 'react-dom';
            const usesPuck = scope === '@puckeditor' || (scope.startsWith('@') && name === 'puck-adapter');
            assert.ok(!usesReact && !usesPuck, 'Unexpected dependency: ' + specifier);
            return nextResolve(specifier, context);
          },
        });
        const { createProject, encodeProject, parseProject } = await import('@frontend/studio/data');
        const project = createProject('test-page');
        assert.deepEqual(parseProject(encodeProject(project), { nodes: {} }), {
          ok: true,
          value: project,
        });
        await import('@frontend/studio/data/records');
      `,
    ],
    { cwd: new URL('../', import.meta.url), stdio: 'pipe' }
  );
});
