import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkUiTextSource } from '../lib/ui-text-policy.mjs';
const check = (code, file = 'apps/renamed-host/src/example.tsx') => checkUiTextSource(file, code);
test('rejects direct UI, accessible labels, descriptor labels and literal branches', () => {
  for (const code of [
    '<p>Open editor</p>',
    '<p>好</p>',
    '<p>I</p>',
    '<p>{ready && "Done"}</p>',
    '<p>{value ?? "Empty"}</p>',
    '<input placeholder="Your email" />',
    '<nav aria-label="Main links" />',
    '<button>{failed ? "Try again" : text.save}</button>',
    '<button>{`Close ${count} panels`}</button>',
    'const items = [{id: "home", label: "Home"}];',
    '<SiteFooter linksLabel="Contact" />',
    '<CategoryFilter allLabel="All work" />',
    'const options = {allLabel: "All work"};',
    '<section aria-roledescription="carousel" />',
  ])
    assert.ok(check(code).length, code);
});
test('accepts text keys, interpolators, imported business records, IDs and empty decoration', () => {
  assert.deepEqual(
    check(`
    import fixture from './fixtures/story.json';
    const items = [{id:'home',label:text.navigation.home,href:'/'}];
    <><h1>{text.title}</h1><p>{formatText(text.count,{count})}</p>
      <p>{fixture.body}</p><img alt="" /><span>{' · '}</span>
      <button aria-label={text.open}>{text.action}</button>
      <CategoryFilter allLabel={text.allWork} />
      <section aria-roledescription={text.carouselRoleDescription} /></>
  `),
    []
  );
});
test('rejects retired UI identifiers without rejecting stored protocol keys or file copying', () => {
  assert.ok(check('const text: ViewerCopy = value;').length);
  assert.ok(check("import { schema } from './workspace/copy.schema';").length);
  assert.deepEqual(
    check(`
    const value = {copy: source.copy, viewerCopy: source.viewerCopy};
    const path = 'context.copy.title';
    copyFile(source, target);
  `),
    []
  );
});
test('guards examples and cases after an app is renamed', () => {
  assert.ok(check('<p>Hardcoded title</p>', 'apps/my-tool/src/cases/preview.tsx').length);
  assert.ok(
    check('<p>Hardcoded title</p>', 'packages/templates/anything/src/app/examples/page.tsx').length
  );
});
