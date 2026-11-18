import { existsSync, lstatSync } from 'node:fs';
import { inside } from './files.mjs';

export function validateTemplateSetup(source, setup) {
  if (setup === undefined) return;
  const command = (value) =>
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((part) => typeof part === 'string' && part.length > 0) &&
    !value[0].startsWith('-');
  if (!setup || !command(setup.command) || !Array.isArray(setup.outputs))
    throw new Error('Template setup needs a command and declared local output directories.');
  const outputs = new Set();
  for (const output of setup.outputs) {
    if (typeof output !== 'string' || !output.startsWith('.local/') || outputs.has(output))
      throw new Error('Setup outputs must be distinct paths under the new app .local directory.');
    inside(source, output);
    if (
      [...outputs].some((entry) => entry.startsWith(output + '/') || output.startsWith(entry + '/'))
    )
      throw new Error('Setup output directories must not overlap.');
    outputs.add(output);
  }
  if (setup.demo === undefined) return;
  if (
    !setup.demo ||
    !command(setup.demo.command) ||
    !setup.demo.files ||
    typeof setup.demo.files !== 'object' ||
    Array.isArray(setup.demo.files)
  )
    throw new Error('Demo setup needs a command and explicit delivery files.');
  for (const [destination, input] of Object.entries(setup.demo.files)) {
    inside(source, destination);
    if (
      destination.startsWith('.') ||
      destination.startsWith('template/') ||
      destination === 'template' ||
      destination === 'template.config.mjs'
    )
      throw new Error(
        'Demo inputs must be portable app files, outside ignored/template directories.'
      );
    if (typeof input !== 'string' || !input.startsWith('template/'))
      throw new Error('Demo inputs must be owned by the template directory.');
    const file = inside(source, input);
    if (!existsSync(file) || !lstatSync(file).isFile())
      throw new Error('Missing demo delivery file: ' + input);
  }
}

export function selectTemplateSetup(entry, mode) {
  if (mode === undefined) return undefined;
  if (entry.type !== 'app' || !['empty', 'demo'].includes(mode))
    throw new Error('Setup requires an app template and a supported mode.');
  const setup = entry.config.setup;
  if (!setup || (mode === 'demo' && !setup.demo))
    throw new Error('Template ' + entry.id + ' does not support the requested setup mode.');
  return {
    command: mode === 'demo' ? setup.demo.command : setup.command,
    outputs: setup.outputs,
    files: mode === 'demo' ? setup.demo.files : {},
  };
}
