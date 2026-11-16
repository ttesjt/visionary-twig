'use client';
import { ExampleLanguagePicker } from '../../_components/example-language-picker';
import { useState } from 'react';
import Link from 'next/link';
import {
  ContentProvider,
  TextProvider,
  useContent,
  useText,
  ResourceScope,
} from '../../../../../infra/resources/client';
import { RESOURCE_SCOPES } from '../../../../../infra/resources';
import { localeHref } from '../../../../../infra/resources/routing';
import type { ResourceSnapshot } from '@frontend/resource-runtime';
function Notes() {
  const notes = useContent().get('making-notes');
  return (
    <ul data-testid="making-notes">
      {notes.entries.map((note) => (
        <li key={note.workId}>{note.technique}</li>
      ))}
    </ul>
  );
}
function Catalog() {
  const data = useContent();
  const text = useText();
  const [expanded, setExpanded] = useState(false);
  const base = data.get('base');
  const catalog = data.getResolved('catalog', { text });
  return (
    <main className="example-page">
      <Link href={localeHref('/', text.locale)}>{text.getText('main', 'examples.back')}</Link>
      <h1>{base.collection}</h1>
      <ExampleLanguagePicker />
      <h2>{text.getText('main', 'content.catalog')}</h2>
      <ul data-testid="catalog">
        {catalog.works.map((work) => (
          <li key={work.id}>
            {work.title} ({work.year})
          </li>
        ))}
      </ul>
      <button
        aria-expanded={expanded}
        aria-controls="making-notes-section"
        onClick={() => setExpanded((value) => !value)}
      >
        {text.getText('main', 'content.notes')}
      </button>
      {expanded && (
        <section id="making-notes-section" aria-label={text.getText('main', 'content.notes')}>
          <ResourceScope scope={RESOURCE_SCOPES.makingNotes}>
            <Notes />
          </ResourceScope>
        </section>
      )}
    </main>
  );
}
export function ContentExample({
  contentSnapshot,
  textSnapshot,
}: {
  readonly contentSnapshot: ResourceSnapshot;
  readonly textSnapshot: ResourceSnapshot;
}) {
  const scope = RESOURCE_SCOPES.contentDemo;
  return (
    <TextProvider scope={scope} initialSnapshot={textSnapshot}>
      <ContentProvider scope={scope} initialSnapshot={contentSnapshot}>
        <ResourceScope scope={scope}>
          <Catalog />
        </ResourceScope>
      </ContentProvider>
    </TextProvider>
  );
}
