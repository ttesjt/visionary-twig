import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createProject } from '../../data/index.js';
import { useProjectSession } from '../session/use-project-session.js';
import { useStudioJsonDrafts } from './use-json-drafts.js';
function setup() {
  return renderHook(() => {
    const session = useProjectSession(createProject('source-test'));
    return { session, drafts: useStudioJsonDrafts(session) };
  });
}
describe('staged JSON working copies', () => {
  it('stages sections without editing the project and applies them in one undoable transaction', () => {
    const { result } = setup();
    act(() => {
      result.current.drafts.change('context', '{"request":{"title":"New"}}');
      result.current.drafts.change('catalogs', '{"en":{"title":"Hello"},"zh":{"title":"你好"}}');
    });
    expect(result.current.session.project.context).toEqual({});
    expect(result.current.session.flags.canSave).toBe(false);
    expect(result.current.drafts.pending).toBe(true);
    act(() => {
      expect(result.current.drafts.validate()).toBe(true);
    });
    expect(result.current.session.project.context).toEqual({});
    act(() => {
      expect(result.current.drafts.apply()).toBe(true);
    });
    expect(result.current.session.project.context).toEqual({ request: { title: 'New' } });
    expect(result.current.session.project.catalogs.zh).toEqual({ title: '你好' });
    expect(result.current.session.flags.canSave).toBe(true);
    expect(result.current.session.state.history.past).toHaveLength(1);
    act(() => result.current.session.dispatch({ type: 'undo' }));
    expect(result.current.session.project.context).toEqual({});
    expect(result.current.drafts.text('context')).toBe('{}');
    act(() => result.current.session.dispatch({ type: 'redo' }));
    expect(result.current.drafts.text('context')).toContain('New');
  });
  it('invalid JSON and invalid protocol preserve every draft and do not partially apply', () => {
    const { result } = setup();
    act(() => {
      result.current.drafts.change('context', '{broken');
      result.current.drafts.change('catalogs', '{"en":{"title":"Held draft"}}');
    });
    act(() => {
      expect(result.current.drafts.apply()).toBe(false);
    });
    expect(result.current.drafts.issues).toMatchObject([
      { code: 'invalid-json', path: ['context'] },
    ]);
    expect(result.current.drafts.text('context')).toBe('{broken');
    expect(result.current.session.project.catalogs).toEqual({});
    act(() => result.current.drafts.change('context', '[]'));
    act(() => {
      expect(result.current.drafts.apply()).toBe(false);
    });
    expect(result.current.drafts.issues[0]?.code).toBe('invalid-context');
    act(() => result.current.drafts.change('context', '{"fixed":true}'));
    act(() => {
      result.current.drafts.apply();
    });
    expect(result.current.session.project.catalogs.en).toEqual({ title: 'Held draft' });
  });
  it('preserves stale drafts and rejects concurrent edits instead of silently overwriting', () => {
    const { result } = setup();
    act(() => result.current.drafts.change('catalogs', '{"en":{"title":"Draft"}}'));
    act(() => {
      result.current.session.run({
        ok: true,
        value: {
          ...result.current.session.project,
          catalogs: { en: { title: 'Changed elsewhere' } },
        },
      });
    });
    expect(result.current.drafts.conflicted('catalogs')).toBe(true);
    act(() => {
      expect(result.current.drafts.apply()).toBe(false);
    });
    expect(result.current.drafts.issues[0]?.code).toBe('json-draft-conflict');
    expect(result.current.drafts.text('catalogs')).toContain('Draft');
    expect(result.current.session.project.catalogs.en).toEqual({ title: 'Changed elsewhere' });
    act(() => result.current.drafts.reset('catalogs'));
    expect(result.current.drafts.text('catalogs')).toContain('Changed elsewhere');
    expect(result.current.session.flags.canSave).toBe(true);
  });
  it('keeps independent working changes while applying another section', () => {
    const { result } = setup();
    act(() => result.current.drafts.change('context', '{"draft":true}'));
    act(() => {
      result.current.session.run({
        ok: true,
        value: { ...result.current.session.project, catalogs: { en: { kept: true } } },
      });
    });
    act(() => {
      result.current.drafts.apply();
    });
    expect(result.current.session.project.catalogs.en).toEqual({ kept: true });
  });
  it('replacement cancels old drafts only after confirmation and starts with clean sources', () => {
    const { result } = setup();
    act(() => result.current.drafts.change('context', '{incomplete'));
    act(() => {
      result.current.session.newProject();
    });
    expect(result.current.session.pending).not.toBeNull();
    act(() => result.current.session.cancelReplacement());
    expect(result.current.drafts.text('context')).toBe('{incomplete');
    act(() => {
      result.current.session.newProject();
    });
    act(() => result.current.session.confirmReplacement());
    expect(result.current.drafts.pending).toBe(false);
    expect(result.current.drafts.text('context')).toBe('{}');
    expect(result.current.session.flags.canSave).toBe(true);
  });
  it('format never applies and reset affects only the chosen section', () => {
    const { result } = setup();
    act(() => {
      result.current.drafts.change('context', '{"formatted":true}');
      result.current.drafts.change('catalogs', '{broken');
    });
    act(() => result.current.drafts.format('context'));
    expect(result.current.drafts.text('context')).toBe('{\n  "formatted": true\n}');
    expect(result.current.session.project.context).toEqual({});
    act(() => result.current.drafts.reset('catalogs'));
    expect(result.current.drafts.pending).toBe(true);
    expect(result.current.drafts.text('context')).toContain('formatted');
  });
  it('does not replace unapplied input owned by another editor', () => {
    const { result } = setup();
    act(() => result.current.session.setDraft('custom-editor-field', true));
    act(() => result.current.drafts.change('context', '{"valid":true}'));
    act(() => {
      expect(result.current.drafts.apply()).toBe(false);
    });
    expect(result.current.drafts.issues[0]?.code).toBe('pending-editor-draft');
    expect(result.current.session.project.context).toEqual({});
    expect(result.current.drafts.pending).toBe(true);
    act(() => result.current.session.setDraft('custom-editor-field', false));
    act(() => {
      expect(result.current.drafts.apply()).toBe(true);
    });
    expect(result.current.session.project.context).toEqual({ valid: true });
  });
});
