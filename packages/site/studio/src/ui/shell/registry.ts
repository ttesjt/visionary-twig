import type { StudioPageDefinition, StudioPageGroup, StudioRegistry } from './contracts.js';

const REGISTRATION_ID = /^[a-z][a-z0-9-]*$/u;
function assertIdentity(id: string, label: string): void {
  if (!REGISTRATION_ID.test(id) || !label.trim())
    throw new Error('Studio registrations require a kebab-case ID and a non-empty label.');
}
/** Code-owned registration. Array order defines navigation order; IDs never depend on labels. */
export function createStudioRegistry(input: {
  readonly groups: readonly StudioPageGroup[];
  readonly pages: readonly StudioPageDefinition[];
}): StudioRegistry {
  if (!input.pages.length) throw new Error('Studio requires at least one registered page.');
  const groups = new Set<string>();
  for (const group of input.groups) {
    assertIdentity(group.id, group.label);
    if (groups.has(group.id)) throw new Error('Duplicate Studio group: ' + group.id);
    groups.add(group.id);
  }
  const pages = new Map<string, StudioPageDefinition>();
  for (const page of input.pages) {
    assertIdentity(page.id, page.title);
    if (pages.has(page.id)) throw new Error('Duplicate Studio page: ' + page.id);
    if (!groups.has(page.group)) throw new Error('Unknown Studio group: ' + page.group);
    pages.set(page.id, Object.freeze({ ...page }));
  }
  return Object.freeze({
    groups: Object.freeze(input.groups.map((group) => Object.freeze({ ...group }))),
    pages: Object.freeze([...pages.values()]),
    findPage: (id: string) => pages.get(id),
  });
}
