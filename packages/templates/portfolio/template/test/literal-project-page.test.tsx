import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { prepareResourcePlan } from '@frontend/resource-runtime';
import { z } from 'zod';
import { renderWithText } from '../../test/text-render';
import { ContentProjectDetail } from '../../src/features/projects/files/components/content-project-detail';
import { planResourceScope } from '../../src/infra/resources';
import { projectFilePageSchema } from '../../src/features/projects/files/schemas';
import {
  FIELD_NOTES_PAGE,
  FIELD_NOTES_SCOPE,
  readProjectResource,
  resourceRequestURL,
} from './project-resources';

// A real page declaration without textNamespaces must not require a page TextProvider.
vi.mock('../../src/site/project-data.ts', async (original) => {
  const actual = await original<typeof import('../../src/site/project-data.ts')>();
  return {
    ...actual,
    PROJECT_FILE_PAGES: actual.PROJECT_FILE_PAGES.map(({ slug, namespace, filename }) => ({
      slug,
      namespace,
      filename,
    })),
  };
});
afterEach(() => vi.unstubAllGlobals());

it.each([false, true])(
  'renders a literal page without extra text (snapshot: %s)',
  async (seeded) => {
    vi.stubGlobal('matchMedia', (media: string) => ({
      media,
      matches: false,
      addEventListener() {},
      removeEventListener() {},
    }));
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    );
    expect(FIELD_NOTES_SCOPE.text).toEqual([]);
    const { plan, parts } = planResourceScope(FIELD_NOTES_SCOPE);
    expect(parts.map(({ kind }) => kind)).toEqual(['content']);
    const document = projectFilePageSchema.parse(readProjectResource(plan.resources[0]?.url ?? ''));
    // Materialize a plain-string fixture; no $text marker remains in the delivered page.
    const publication = z
      .record(z.string(), z.string())
      .parse(
        JSON.parse(
          readFileSync(
            resolve(import.meta.dirname, '../../.generated/text/en/field-notes.json'),
            'utf8'
          )
        ) as unknown
      );
    const literal = { ...document, context: { publication } };
    const contentPlan = parts.find(({ kind }) => kind === 'content')?.plan;
    if (!contentPlan) throw new Error('Expected a Content plan.');
    const content = seeded
      ? await prepareResourcePlan(contentPlan, () => Promise.resolve(literal))
      : undefined;
    const requests = vi.fn<typeof fetch>(() => Promise.resolve(Response.json(literal)));
    vi.stubGlobal('fetch', requests);
    await act(async () => {
      await renderWithText(
        <ContentProjectDetail
          slug={FIELD_NOTES_PAGE.slug}
          initialSnapshots={content ? { content } : undefined}
        />
      );
    });
    const heading = publication.heading;
    if (!heading) throw new Error('Expected a literal heading.');
    expect(await screen.findByRole('heading', { name: heading })).toBeVisible();
    expect(requests).toHaveBeenCalledTimes(seeded ? 0 : 1);
    expect(
      requests.mock.calls.every(([url]) => resourceRequestURL(url).includes('/json/content/'))
    ).toBe(true);
  }
);
