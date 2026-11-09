import { existsSync, realpathSync, statSync } from 'node:fs';
import path from 'node:path';

export function contains(directory, file) {
  const relative = path.relative(directory, file);
  return (
    relative === '' ||
    (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative))
  );
}
const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
function boundedPath(base, relative, directory) {
  if (
    typeof relative !== 'string' ||
    !relative ||
    relative.includes('\\') ||
    path.isAbsolute(relative) ||
    relative.split('/').some((part) => !part || part === '.' || part === '..')
  )
    throw new Error('paths must be canonical relative paths');
  const file = path.resolve(base, relative);
  if (!contains(base, file) || !existsSync(file))
    throw new Error('missing or out-of-scope path: ' + relative);
  const resolved = realpathSync(file);
  if (!contains(realpathSync(base), resolved))
    throw new Error('symlink escapes its scope: ' + relative);
  if (directory ? !statSync(resolved).isDirectory() : !statSync(resolved).isFile())
    throw new Error('expected a ' + (directory ? 'directory: ' : 'file: ') + relative);
  return resolved;
}
function entries(directory, values, required) {
  if (!Array.isArray(values) || (required && values.length === 0))
    throw new Error('public/shared must be arrays; public must not be empty');
  const paths = values.map((value) => boundedPath(directory, value, false));
  if (new Set(paths).size !== paths.length) throw new Error('duplicate entry file');
  return new Set(paths);
}
/** A source scope is opt-in; role folders are never inferred to be features. */
export function readFeatures(workspaces) {
  const features = [];
  const errors = [];
  for (const workspace of workspaces) {
    const input = workspace.manifest.workspaceFeatures;
    if (input === undefined) continue;
    const label = workspace.manifest.name + ': workspaceFeatures';
    if (!record(input)) {
      errors.push(label + ' must be an object');
      continue;
    }
    for (const [relative, declaration] of Object.entries(input)) {
      try {
        if (relative !== 'src' && !relative.startsWith('src/'))
          throw new Error('feature roots must be under src/');
        if (
          !record(declaration) ||
          Object.keys(declaration).some((key) => !['public', 'shared'].includes(key))
        )
          throw new Error('expected only public and optional shared entry lists');
        const directory = boundedPath(workspace.directory, relative, true);
        if (!contains(realpathSync(path.join(workspace.directory, 'src')), directory))
          throw new Error('physical feature roots must remain under src/');
        if (features.some((feature) => feature.directory === directory))
          throw new Error('duplicate feature scope');
        features.push({
          directory,
          workspace,
          label: workspace.manifest.name + '/' + relative,
          publicEntries: entries(directory, declaration.public, true),
          sharedEntries: entries(directory, declaration.shared ?? [], false),
        });
      } catch (error) {
        errors.push(label + '[' + relative + ']: ' + error.message);
      }
    }
  }
  features.sort((a, b) => b.directory.length - a.directory.length);
  for (const feature of features) {
    for (const file of feature.sharedEntries) {
      if (features.find((candidate) => contains(candidate.directory, file)) !== feature)
        errors.push(feature.label + ': shared entry cannot belong to a child feature');
    }
  }
  return { features, errors };
}
