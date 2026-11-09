import { existsSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import path from 'node:path';

const IGNORED_DIRECTORIES = new Set([
  '.git',
  'node_modules',
  'dist',
  '.next',
  '.cache',
  '.local',
  '.generated',
  'coverage',
  'test-results',
  'playwright-report',
]);

function withoutCode(markdown) {
  return markdown.replace(/^ {0,3}(`{3,}|~{3,})[^\n]*\n[\s\S]*?^ {0,3}\1[^\n]*$/gm, (block) =>
    block.replace(/[^\n]/g, ' ')
  );
}

function destination(text) {
  if (text.startsWith('<')) return text.slice(1, text.indexOf('>'));
  let depth = 0;
  let end = 0;
  for (; end < text.length; end++) {
    const character = text[end];
    if (character === '\\') {
      end++;
      continue;
    }
    if (character === '(') depth++;
    if (character === ')') {
      if (!depth) break;
      depth--;
    }
    if (/\s/u.test(character) && depth === 0) break;
  }
  return text.slice(0, end).replace(/\\([\\() ])/g, '$1');
}

/** Inline/image and full/collapsed reference links; code examples are not links. */
function links(markdown) {
  const text = withoutCode(markdown).replace(/(`+)[^\n]*?\1/g, (code) => ' '.repeat(code.length));
  const definitions = new Map();
  const normalize = (label) => label.trim().replace(/\s+/g, ' ').toLowerCase();
  for (const match of text.matchAll(/^ {0,3}\[([^\]]+)\]:\s*(.+)$/gm))
    definitions.set(normalize(match[1]), destination(match[2]));
  const found = [];
  for (const match of text.matchAll(/!?\[([^\]\n]*)\](?:\(\s*|\[([^\]\n]*)\])/g)) {
    const target = match[0].endsWith(']')
      ? definitions.get(normalize(match[2] || match[1]))
      : destination(text.slice(match.index + match[0].length));
    if (target === undefined) continue;
    found.push({ target, line: text.slice(0, match.index).split('\n').length });
  }
  return found;
}

function anchors(markdown) {
  const text = withoutCode(markdown);
  const used = new Set();
  for (const match of text.matchAll(/^ {0,3}#{1,6}\s+(.+?)\s*#*\s*$/gm)) {
    const base = match[1]
      .toLowerCase()
      .replace(/<[^>]*>/g, '')
      .replace(/[^\p{L}\p{N}\p{M}_\-\s]/gu, '')
      .replace(/\s/g, '-');
    let slug = base;
    let suffix = 0;
    while (used.has(slug)) slug = base + '-' + ++suffix;
    used.add(slug);
  }
  for (const match of text.matchAll(/\b(?:id|name)=["']([^"']+)["']/g)) used.add(match[1]);
  return used;
}

/** Enumerate owned Markdown; installed, private and generated outputs are not guides. */
export function markdownFiles(root) {
  const files = [];
  function visit(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory() && !IGNORED_DIRECTORIES.has(entry.name)) visit(file);
      else if (entry.isFile() && entry.name.endsWith('.md')) files.push(file);
    }
  }
  visit(root);
  return files;
}

/** Validate all delivered guides, or just the caller-owned incoming documents. */
export function checkDocumentationLinks(root, files = markdownFiles(root)) {
  const project = realpathSync(root);
  const inside = (value) => value === project || value.startsWith(project + path.sep);
  const errors = [];
  for (const requested of files) {
    const file = realpathSync(requested);
    const directory = path.dirname(file);
    const relative = path.relative(project, file);
    if (!inside(file)) {
      errors.push({
        file: relative,
        line: 1,
        target: requested,
        message: 'Document escapes project',
      });
      continue;
    }
    for (const link of links(readFileSync(file, 'utf8'))) {
      const report = (message) =>
        errors.push({ file: relative, line: link.line, target: link.target, message });
      if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(link.target)) continue;
      let local;
      let fragment;
      try {
        const [pathname, hash] = link.target.split('#', 2);
        local = decodeURIComponent(pathname.split('?', 1)[0]);
        fragment = hash ? decodeURIComponent(hash) : '';
      } catch {
        report('Invalid URL encoding');
        continue;
      }
      const target = local
        ? path.resolve(local.startsWith('/') ? project : directory, local.replace(/^\//, ''))
        : file;
      if (!inside(target) || (existsSync(target) && !inside(realpathSync(target)))) {
        report('Destination escapes project');
        continue;
      }
      if (!existsSync(target)) {
        report('Missing local destination');
        continue;
      }
      if (!fragment) continue;
      const document = statSync(target).isDirectory() ? path.join(target, 'README.md') : target;
      if (!document.endsWith('.md')) continue;
      if (!existsSync(document) || !anchors(readFileSync(document, 'utf8')).has(fragment))
        report('Missing Markdown fragment');
    }
  }
  return errors;
}
