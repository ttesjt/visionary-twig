import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

function infrastructure(directory, label, errors) {
  const files = new Map();
  const root = path.join(directory, 'src/infra');
  function visit(folder, relative = '') {
    for (const name of readdirSync(folder).sort()) {
      const file = path.join(folder, name);
      const key = path.posix.join(relative, name);
      const stat = lstatSync(file);
      if (stat.isSymbolicLink() || (!stat.isDirectory() && !stat.isFile())) {
        errors.push(label + ': infrastructure must contain regular files/directories: ' + key);
      } else if (stat.isDirectory()) visit(file, key);
      else files.set(key, { bytes: readFileSync(file), executable: stat.mode & 0o111 });
    }
  }
  if (!existsSync(root) || !lstatSync(root).isDirectory() || lstatSync(root).isSymbolicLink())
    errors.push(label + ': missing regular src/infra directory');
  else visit(root);
  return files;
}

function checkPreviewIsolation(entry, errors) {
  const root = path.join(entry.source, 'src');
  const visit = (folder, relative = '') => {
    for (const name of readdirSync(folder).sort()) {
      const file = path.join(folder, name);
      const key = path.posix.join(relative, name);
      const stat = lstatSync(file);
      if (stat.isSymbolicLink()) continue;
      if (stat.isDirectory()) {
        if (key !== 'demo/appearance') visit(file, key);
        continue;
      }
      if (!/\.(?:ts|tsx|mts|cts)$/.test(name)) continue;
      const text = readFileSync(file, 'utf8');
      if (
        /\b(?:useAppearance|APPEARANCE_(?:POLICY|PRESETS|STORAGE_KEY)|appearanceBootstrapScript)\b|data-(?:preset|style-preview)|\.dataset\.(?:preset|stylePreview)\b/.test(
          text
        )
      )
        errors.push(
          entry.id + ': appearance preview runtime must stay inside src/demo/appearance: src/' + key
        );
      for (const match of text.matchAll(
        /(?:from\s*|import\s*\()\s*['"]([^'"]*demo\/appearance[^'"]*)['"]/g
      )) {
        if (
          key !== 'app/[locale]/layout.tsx' ||
          !/demo\/appearance(?:\/index)?(?:\.(?:ts|tsx))?$/.test(match[1])
        )
          errors.push(
            entry.id +
              ': only the root layout may mount the public appearance preview entry: src/' +
              key
          );
      }
    }
  };
  if (existsSync(root)) visit(root);
}

/** Source repository policy only. Call with maintained catalog entries, never generated applications. */
export function checkTemplateFoundations(templates) {
  const errors = [];
  const next = templates.filter((entry) => entry.kind === 'next-app');
  const baseline = next.find((entry) => entry.id === 'plain-next');
  if (!baseline) return ['Template foundations require plain-next as the Next baseline.'];
  const expected = infrastructure(baseline.source, baseline.id, errors);
  const site = path.join(baseline.source, 'src/site');
  if (!existsSync(site)) return [...errors, 'plain-next: missing src/site declarations'];
  const entries = readdirSync(site).filter(
    (file) => file.endsWith('.ts') && !/\.(test|spec)\.ts$/.test(file)
  );
  for (const entry of next) {
    checkPreviewIsolation(entry, errors);
    const actual = entry === baseline ? expected : infrastructure(entry.source, entry.id, errors);
    for (const file of new Set([...expected.keys(), ...actual.keys()])) {
      const before = expected.get(file);
      const after = actual.get(file);
      if (
        !before ||
        !after ||
        !before.bytes.equals(after.bytes) ||
        before.executable !== after.executable
      )
        errors.push(
          entry.id +
            ': src/infra/' +
            file +
            ' must match plain-next byte for byte (including executable mode).'
        );
    }
    for (const file of entries) {
      const target = path.join(entry.source, 'src/site', file);
      if (!existsSync(target) || !lstatSync(target).isFile() || lstatSync(target).isSymbolicLink())
        errors.push(entry.id + ': missing regular site declaration entry ' + file);
    }
  }
  return errors;
}
