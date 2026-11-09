import { afterEach, describe, expect, it, vi } from 'vitest';
import * as templates from '../../catalog/template.js';
import * as formatting from '../../catalog/format.js';
import { TextResource } from './text-resource.js';
import type { TextReadView } from './text-view.js';
import { TextInterpolationError } from './interpolation.js';
// Shape of generated contract JSON; production hosts derive this from defaults.
const contracts = {
  common: { title: {}, 'actions.save': {}, greeting: { name: true } },
  other: { label: {} },
};
const english = { title: 'Example', 'actions.save': 'Save', greeting: 'Hello {name}' };
const chinese = { title: '示例', 'actions.save': '保存', greeting: '你好，{name}' };
function prepared() {
  return new TextResource(contracts, [
    { locale: 'en', dictionaries: [{ namespace: 'common', dictionary: english, version: '1' }] },
    { locale: 'zh', dictionaries: [{ namespace: 'common', dictionary: chinese, version: '1' }] },
  ]);
}
afterEach(() => vi.restoreAllMocks());
describe('flat TextResource', () => {
  it('reads flat keys, raw templates, variables and optional language overrides synchronously', () => {
    const resource = prepared();
    const text = resource.createView('en');
    expect(text.getText('common', 'actions.save')).toBe('Save');
    expect(text.getText('common', 'greeting')).toBe('Hello {name}');
    expect(text.getText('common', 'greeting', { name: 'Reader' })).toBe('Hello Reader');
    expect(text.getText('common', 'title', undefined, { locale: 'zh' })).toBe('示例');
    expect(resource.createView('zh').getText('common', 'title')).toBe('示例');
    const view = resource.createView('en', { required: { common: '1' } });
    expect(view.getText('common', 'title')).toBe('Example');
    expect(view.getText('common', 'greeting', { name: '' })).toBe('Hello ');
    expect(view.getText('common', 'greeting', { name: 0 })).toBe('Hello 0');
  });
  it('compiles on installation and bypasses interpolation completely when values are omitted', () => {
    const parse = vi.spyOn(templates, 'parseTextTemplate');
    const format = vi.spyOn(formatting, 'formatTextParts');
    const text = prepared().createView('en');
    const compiled = parse.mock.calls.length;
    for (let i = 0; i < 5; i++) text.getText('common', 'greeting');
    expect(format).not.toHaveBeenCalled();
    expect(parse).toHaveBeenCalledTimes(compiled);
    expect(text.getText('common', 'greeting', { name: '{literal}' })).toBe('Hello {literal}');
    text.getText('common', 'greeting', { name: 'Reader' });
    expect(format).toHaveBeenCalledTimes(2);
    expect(parse).toHaveBeenCalledTimes(compiled);
    expect(text.getText('common', 'title', {})).toBe('Example');
  });
  it('reports missing/invalid/unknown variables without including their values', () => {
    const text = prepared().createView('en');
    for (const values of [
      {},
      { fileName: 'private-value' },
      { name: undefined },
      { name: null },
      { name: true },
      { name: Infinity },
      null,
      [],
    ]) {
      try {
        Reflect.apply(text.getText.bind(text), text, ['common', 'greeting', values]);
        throw new Error('Expected invalid interpolation');
      } catch (error) {
        expect(error).toBeInstanceOf(TextInterpolationError);
        expect(error).toMatchObject({ namespace: 'common', key: 'greeting', locale: 'en' });
        expect(String(error)).not.toContain('private-value');
      }
    }
    const accessor = Object.defineProperty({}, 'name', {
      enumerable: true,
      get() {
        throw new Error('Getter must not run');
      },
    });
    expect(() => {
      Reflect.apply(text.getText.bind(text), text, ['common', 'greeting', accessor]);
    }).toThrow(TextInterpolationError);
  });
  it('keeps prepared data and old readers independent from replacement resources', () => {
    const input = structuredClone(english);
    const resource = new TextResource(contracts, [
      { locale: 'en', dictionaries: [{ namespace: 'common', dictionary: input, version: '1' }] },
    ]);
    input['actions.save'] = 'Changed';
    const before = resource.createView('en', { required: { common: '1' } });
    const next = new TextResource(contracts, [
      {
        locale: 'en',
        dictionaries: [
          {
            namespace: 'common',
            dictionary: { ...english, 'actions.save': 'Store' },
            version: '2',
          },
        ],
      },
    ]);
    expect(before.getText('common', 'actions.save')).toBe('Save');
    expect(next.createView('en').getText('common', 'actions.save')).toBe('Store');
    expect(resource.hasText('common', 'en', '1')).toBe(true);
    expect(() => resource.createView('en', { required: { common: '2' } })).toThrow();
  });
  it('diagnoses absent text and supports arbitrary prepared languages', () => {
    const missing = vi.fn();
    const resource = new TextResource(
      contracts,
      [
        {
          locale: 'ja',
          dictionaries: [
            { namespace: 'other', dictionary: { label: '\u5225\u306e\u4f8b' }, version: '1' },
          ],
        },
      ],
      { maxLocales: 1, onMissing: missing }
    );
    expect(resource.createView('ja').getText('other', 'label')).toBe('\u5225\u306e\u4f8b');
    expect(resource.createView('ja').getText('common', 'title')).toBe('common.title');
    expect(missing).toHaveBeenCalledWith('common', 'title', 'ja');
  });
});
function typeContract(text: TextReadView<typeof contracts>) {
  text.getText('common', 'greeting');
  text.getText('common', 'greeting', { name: 'Reader' });
  // @ts-expect-error unknown namespace
  text.getText('absent', 'title');
  // @ts-expect-error unknown literal flat key
  text.getText('common', 'actions.svae');
  // @ts-expect-error interpolation variable spelling
  text.getText('common', 'greeting', { fileName: 'Reader' });
  // @ts-expect-error missing value in explicitly provided variables
  text.getText('common', 'greeting', {});
  // @ts-expect-error locale is now an option, not the third argument
  text.getText('common', 'title', 'zh');
}
void typeContract;

function readonlyContract(resource: TextResource<typeof contracts>) {
  // @ts-expect-error prepared resources have no runtime editing API
  void resource.addText;
  // @ts-expect-error language is selected by the read view, not mutable resource state
  void resource.setCurrentLang;
  // @ts-expect-error consumers do not remove installed dictionaries
  void resource.removeText;
  // @ts-expect-error scope lifecycle replaces resource references
  void resource.clear;
  // @ts-expect-error reads require an explicitly bound view
  void resource.getText;
}
void readonlyContract;
