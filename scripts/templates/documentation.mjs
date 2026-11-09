import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { readDelivery } from './delivery.mjs';

const NON_DOCUMENTS = new Set([
  '.git',
  'node_modules',
  '.next',
  'dist',
  '.generated',
  '.local',
  '.cache',
  'test-results',
  'playwright-report',
]);
export function markdownFiles(root) {
  const files = [];
  function visit(folder) {
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      if (NON_DOCUMENTS.has(entry.name)) continue;
      const file = path.join(folder, entry.name);
      if (entry.isDirectory()) visit(file);
      else if (entry.isFile() && entry.name.endsWith('.md')) files.push(file);
    }
  }
  visit(root);
  return files;
}
/** Translate source-relative document links through the same delivery/package mappings. */
export function rewriteDeliveredDocumentation(
  source,
  target,
  plan,
  entries,
  { foundation = false } = {}
) {
  const delivery = readDelivery(source);
  const documents = { ...delivery.documents, ...delivery.documentAliases };
  const directories = Object.entries(plan.mapping.directories).sort(
    ([a], [b]) => b.length - a.length
  );
  const mapping = (relative) => {
    if (documents[relative]) return documents[relative];
    for (const [before, after] of directories)
      if (relative === before || relative.startsWith(before + '/'))
        return after + relative.slice(before.length);
    return relative;
  };
  const origins = new Map();
  if (foundation)
    for (const [before, after] of Object.entries(delivery.documents))
      if (!before.startsWith('scaffolds/')) origins.set(path.join(target, after), before);
  for (const entry of entries)
    for (const file of markdownFiles(path.join(target, entry.destination))) {
      if (
        entry.config?.files?.['README.md'] &&
        file === path.join(target, entry.destination, 'README.md')
      )
        continue; // This asset is already authored in delivery coordinates.
      origins.set(
        file,
        path.posix.join(
          path.relative(source, entry.source).split(path.sep).join('/'),
          path.relative(path.join(target, entry.destination), file).split(path.sep).join('/')
        )
      );
    }
  for (const [file, origin] of origins) {
    const outputRelative = path.relative(target, file).split(path.sep).join('/');
    const content = readFileSync(file, 'utf8')
      .replace(/\]\(([^)]+)\)/gu, (original, value) => {
        if (/^[a-z][a-z0-9+.-]*:/iu.test(value) || value.startsWith('#')) return original;
        const [pathname, fragment] = value.split('#');
        const resolved = path.posix.normalize(
          path.posix.join(path.posix.dirname(origin), pathname)
        );
        const translated = mapping(resolved);
        if (translated === resolved && !existsSync(path.join(target, translated))) return original;
        const relative = path.posix.relative(path.posix.dirname(outputRelative), translated) || '.';
        return '](' + relative + (fragment ? '#' + fragment : '') + ')';
      })
      .replaceAll('docs/common/', 'docs/')
      .replaceAll('docs/template-repository/', 'docs/');
    writeFileSync(file, content);
  }
}
export function checkDeliveredDocumentation(target, files = markdownFiles(target)) {
  const errors = [];
  for (const file of files)
    for (const [, link] of readFileSync(file, 'utf8').matchAll(/\]\(([^)]+)\)/gu)) {
      if (/^[a-z][a-z0-9+.-]*:/iu.test(link) || link.startsWith('#')) continue;
      const [relative] = link.split('#');
      if (!existsSync(path.resolve(path.dirname(file), relative)))
        errors.push(path.relative(target, file) + ': ' + link);
    }
  if (errors.length) throw new Error('Broken delivered documentation links:\n' + errors.join('\n'));
}
