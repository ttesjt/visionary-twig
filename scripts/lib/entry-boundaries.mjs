import { readFileSync } from 'node:fs';
import { isBuiltin } from 'node:module';
import path from 'node:path';
import ts from 'typescript';
import { importTargets, localPackageImport, sourceFile } from './module-targets.mjs';
const ENTRY_KINDS = new Set(['pure', 'client', 'node']);
function runtimeTarget(value) {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(runtimeTarget).find((target) => target !== undefined);
  if (!value || typeof value !== 'object') return undefined;
  return runtimeTarget(value.import ?? value.default ?? value.types);
}
export function publicTarget(manifest, entry) {
  const exports = manifest.exports;
  if (
    typeof exports === 'string' ||
    Array.isArray(exports) ||
    (exports &&
      typeof exports === 'object' &&
      ('import' in exports || 'default' in exports || 'types' in exports))
  )
    return entry === '.' ? runtimeTarget(exports) : undefined;
  if (Object.hasOwn(exports ?? {}, entry)) return runtimeTarget(exports[entry]);
  const pattern = Object.keys(exports ?? {})
    .filter((key) => key.includes('*'))
    // Literal-prefix specificity wins before the pattern's total length.
    .sort((a, b) => b.indexOf('*') - a.indexOf('*') || b.length - a.length)
    .find((key) => {
      const [prefix, suffix] = key.split('*');
      return (
        entry.startsWith(prefix) &&
        entry.endsWith(suffix) &&
        entry.length >= prefix.length + suffix.length
      );
    });
  if (!pattern) return undefined;
  const [prefix, suffix] = pattern.split('*');
  const target = runtimeTarget(exports[pattern]);
  return target?.replaceAll('*', entry.slice(prefix.length, entry.length - suffix.length));
}
function runtimeImports(file) {
  const source = ts.createSourceFile(
    file,
    readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true
  );
  const imports = [];
  function visit(node) {
    if (ts.isImportTypeNode(node)) return;
    if (ts.isImportDeclaration(node)) {
      const clause = node.importClause;
      if (clause?.isTypeOnly) return;
      if (
        clause?.namedBindings &&
        ts.isNamedImports(clause.namedBindings) &&
        !clause.name &&
        clause.namedBindings.elements.every((element) => element.isTypeOnly)
      )
        return;
      imports.push(node.moduleSpecifier.text);
      return;
    }
    if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
      if (
        node.isTypeOnly ||
        (node.exportClause &&
          ts.isNamedExports(node.exportClause) &&
          node.exportClause.elements.every((element) => element.isTypeOnly))
      )
        return;
      imports.push(node.moduleSpecifier.text);
      return;
    }
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments[0] &&
      ts.isStringLiteral(node.arguments[0])
    )
      imports.push(node.arguments[0].text);
    ts.forEachChild(node, visit);
  }
  visit(source);
  return { imports, source };
}
/** Opt-in public entry contracts; follow real workspace imports, including transitive re-exports. */
export function checkEntryBoundaries(workspaces, byName) {
  const errors = [];
  for (const owner of workspaces) {
    const entries = owner.manifest.workspaceEntrypoints;
    if (entries === undefined) continue;
    if (!entries || typeof entries !== 'object' || Array.isArray(entries)) {
      errors.push(owner.manifest.name + ': invalid workspaceEntrypoints.');
      continue;
    }
    for (const [entry, kind] of Object.entries(entries)) {
      const label = owner.manifest.name + entry.slice(1);
      if (!ENTRY_KINDS.has(kind)) {
        errors.push(label + ': unknown public entry kind.');
        continue;
      }
      const initial = sourceFile(owner.directory, publicTarget(owner.manifest, entry));
      if (!initial) {
        errors.push(label + ': missing declared entry source.');
        continue;
      }
      const visited = new Set();
      function walk(workspace, file, trail) {
        if (visited.has(file)) return;
        visited.add(file);
        const { imports, source } = runtimeImports(file);
        const first = source.statements[0];
        const clientDirective =
          first &&
          ts.isExpressionStatement(first) &&
          ts.isStringLiteral(first.expression) &&
          first.expression.text === 'use client';
        if (file === initial && kind === 'client' && !clientDirective)
          errors.push(label + ': client entry must preserve a leading use client directive.');
        if (kind === 'pure' && clientDirective)
          errors.push(label + ': pure entry reaches a client module: ' + trail);
        for (const original of imports) {
          for (const specifier of importTargets(workspace.manifest, original, { runtime: true })) {
            const route =
              trail + ' → ' + (original === specifier ? specifier : original + ' → ' + specifier);
            if (kind !== 'node' && isBuiltin(specifier)) {
              errors.push(label + ': ' + kind + ' entry reaches Node: ' + route);
              continue;
            }
            if (kind === 'pure' && /^(react|react-dom)(?:\/|$)/.test(specifier)) {
              errors.push(label + ': pure entry reaches React: ' + route);
              continue;
            }
            if (specifier.startsWith('.')) {
              const target = original.startsWith('#')
                ? localPackageImport(workspace.directory, specifier)?.source
                : sourceFile(path.dirname(file), specifier);
              if (target) walk(workspace, target, route);
              continue;
            }
            const name = specifier.startsWith('@')
              ? specifier.split('/').slice(0, 2).join('/')
              : specifier.split('/')[0];
            const imported = byName.get(name);
            if (!imported) continue;
            const subpath = specifier === name ? '.' : './' + specifier.slice(name.length + 1);
            const targetKind = imported.manifest.workspaceEntrypoints?.[subpath];
            if (kind !== 'node' && targetKind === 'node') {
              errors.push(label + ': browser/pure entry reaches a Node entry: ' + route);
              continue;
            }
            if (kind === 'pure' && targetKind === 'client') {
              errors.push(label + ': pure entry reaches a client entry: ' + route);
              continue;
            }
            const target = sourceFile(imported.directory, publicTarget(imported.manifest, subpath));
            if (target) walk(imported, target, route);
          }
        }
      }
      walk(owner, initial, label);
    }
  }
  return errors;
}
