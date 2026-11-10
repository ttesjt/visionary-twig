import type { ContentIssue, ContentResult, ContentRegistry } from '@frontend/ui-document';
import { parseProject, type StudioProject } from '../../data/index.js';
import { contentRegistry } from '@frontend/puck-adapter/schema';

export const JSON_SECTIONS = ['document', 'catalogs', 'context'] as const;
export type JsonSection = (typeof JSON_SECTIONS)[number];
export interface JsonDraft {
  readonly source: string;
  readonly text: string;
}
export type JsonDrafts = Readonly<Partial<Record<JsonSection, JsonDraft>>>;
export const JSON_INDENT_SPACES = 2;
export function sectionSource(project: StudioProject, section: JsonSection): string {
  return JSON.stringify(project[section], null, JSON_INDENT_SPACES);
}
export function jsonDraftIssues(
  project: StudioProject,
  drafts: JsonDrafts,
  registry: ContentRegistry = contentRegistry
): ContentResult<StudioProject> {
  const candidate: Record<string, unknown> = { ...project };
  const errors: ContentIssue[] = [];
  for (const section of JSON_SECTIONS) {
    const draft = drafts[section];
    if (!draft || draft.text === draft.source) continue;
    if (draft.source !== sectionSource(project, section)) {
      errors.push({
        code: 'json-draft-conflict',
        path: [section],
        message:
          'The working section changed after this draft was started. Reset this draft before editing the current version.',
      });
      continue;
    }
    try {
      candidate[section] = JSON.parse(draft.text) as unknown;
    } catch {
      errors.push({ code: 'invalid-json', path: [section], message: 'Enter valid JSON.' });
    }
  }
  return errors.length ? { ok: false, errors } : parseProject(candidate, registry);
}
