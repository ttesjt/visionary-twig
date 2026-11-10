import { useCallback, useEffect, useState } from 'react';
import type { ContentIssue } from '@frontend/ui-document';
import type { ProjectSession } from '../session/use-project-session.js';
import {
  JSON_INDENT_SPACES,
  JSON_SECTIONS,
  jsonDraftIssues,
  sectionSource,
  type JsonDrafts,
  type JsonSection,
} from './draft-model.js';

const JSON_DRAFT_ID = 'studio-json-workspace';
interface DraftState {
  readonly generation: number;
  readonly drafts: JsonDrafts;
  readonly issues: readonly ContentIssue[];
}
/** Own this alongside the session, above route/tab switches. Apply commits all staged sections atomically. */
export function useStudioJsonDrafts(session: ProjectSession) {
  const [section, select] = useState<JsonSection>(JSON_SECTIONS[0]);
  const [stored, setStored] = useState<DraftState>(() => ({
    generation: session.state.generation,
    drafts: {},
    issues: [],
  }));
  const current: DraftState =
    stored.generation === session.state.generation
      ? stored
      : { generation: session.state.generation, drafts: {}, issues: [] };
  if (current !== stored) setStored(current);
  const pending = JSON_SECTIONS.some((section) => {
    const draft = current.drafts[section];
    return draft !== undefined && draft.text !== draft.source;
  });
  const setDraft = session.setDraft;
  useEffect(() => {
    setDraft(JSON_DRAFT_ID, pending);
    return () => setDraft(JSON_DRAFT_ID, false);
  }, [setDraft, pending, current.generation]);
  const change = useCallback(
    (section: JsonSection, text: string) => {
      setStored((previous) => {
        const latest = session.latest.current;
        const drafts = previous.generation === latest.state.generation ? previous.drafts : {};
        const previousDraft = drafts[section];
        const source =
          previousDraft && previousDraft.text !== previousDraft.source
            ? previousDraft.source
            : sectionSource(latest.project, section);
        return {
          generation: latest.state.generation,
          drafts: { ...drafts, [section]: { source, text } },
          issues: [],
        };
      });
    },
    [session.latest]
  );
  function validate(apply: boolean): boolean {
    const latest = session.latest.current;
    if (apply && [...latest.state.drafts].some((id) => id !== JSON_DRAFT_ID)) {
      setStored((previous) => ({
        ...previous,
        issues: [
          {
            code: 'pending-editor-draft',
            path: [],
            message: 'Repair or discard unapplied input in the other editor before applying JSON.',
          },
        ],
      }));
      return false;
    }
    const drafts = stored.generation === latest.state.generation ? stored.drafts : {};
    const result = jsonDraftIssues(latest.project, drafts, session.registry);
    setStored((previous) => ({ ...previous, issues: result.ok ? [] : result.errors }));
    if (!result.ok) return false;
    if (apply && session.run(result)) {
      setStored({ generation: latest.state.generation, drafts: {}, issues: [] });
      setDraft(JSON_DRAFT_ID, false);
    }
    return true;
  }
  function text(section: JsonSection): string {
    const draft = current.drafts[section];
    return draft && draft.text !== draft.source
      ? draft.text
      : sectionSource(session.project, section);
  }
  return {
    section,
    select,
    pending,
    issues: current.issues,
    text,
    conflicted: (section: JsonSection) => {
      const draft = current.drafts[section];
      return (
        draft !== undefined &&
        draft.text !== draft.source &&
        draft.source !== sectionSource(session.project, section)
      );
    },
    change,
    validate: () => validate(false),
    apply: () => validate(true),
    reset: (section: JsonSection) =>
      setStored((previous) => {
        const drafts = { ...previous.drafts };
        delete drafts[section];
        return { ...previous, drafts, issues: [] };
      }),
    format: (section: JsonSection) => {
      try {
        const value: unknown = JSON.parse(text(section));
        change(section, JSON.stringify(value, null, JSON_INDENT_SPACES));
      } catch {
        setStored((previous) => ({
          ...previous,
          issues: [
            {
              code: 'invalid-json',
              path: [section],
              message: 'Enter valid JSON before formatting.',
            },
          ],
        }));
      }
    },
  };
}
export type StudioJsonDrafts = ReturnType<typeof useStudioJsonDrafts>;
