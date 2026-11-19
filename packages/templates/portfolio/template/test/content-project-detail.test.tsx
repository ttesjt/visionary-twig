const PROJECT_FILE_PAGE = {
  slug: 'field-notes',
  namespace: 'project-field-notes',
  filename: 'field-notes.json',
} as const;
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { renderWithText } from '../../test/text-render';
import { PROJECT_FILE_RESOURCES } from '../../src/features/projects/files/resources';
import { projectFilePageSchema } from '../../src/features/projects/files/schemas';
import { RESOURCE_STARTUP_TEXT } from '../../src/site/startup-text';
import { ContentProjectDetail } from '../../src/features/projects/files/components/content-project-detail';

afterEach(() => vi.unstubAllGlobals());

it('loads a missing page namespace through the inherited Runtime and retries only that resource', async () => {
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
  const file: unknown = JSON.parse(
    readFileSync(
      resolve(
        import.meta.dirname,
        '../..',
        PROJECT_FILE_RESOURCES[PROJECT_FILE_PAGE.namespace].defaults
      ),
      'utf8'
    )
  );
  const requests = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(new Response(null, { status: 503 }))
    .mockImplementation(() => Promise.resolve(Response.json(file)));
  vi.stubGlobal('fetch', requests);
  await act(async () => {
    await renderWithText(<ContentProjectDetail slug={PROJECT_FILE_PAGE.slug} />);
  });
  await screen.findByRole('alert');
  expect(
    screen.queryByRole('heading', { name: 'An illustrated field log' })
  ).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: RESOURCE_STARTUP_TEXT.retry }));
  await screen.findByRole('heading', { name: 'An illustrated field log' });
  expect(requests).toHaveBeenCalledTimes(2);
  expect(requests.mock.calls.map(([url]) => url)).toEqual([
    expect.stringContaining('/' + PROJECT_FILE_PAGE.namespace + '.json'),
    expect.stringContaining('/' + PROJECT_FILE_PAGE.namespace + '.json'),
  ]);
});

it.each([
  {
    locale: 'en',
    title: 'Field Notes',
    summary: 'A small web journal for observations made outdoors.',
    unavailable: 'The full project write-up is currently unavailable.',
  },
  {
    locale: 'zh',
    title: '野外笔记',
    summary: '记录户外见闻的一本网页日志。',
    unavailable: '暂时无法查看项目正文。',
  },
] as const)(
  'preserves the $locale summary on a pure CSR Text resolution failure',
  async ({ locale, title, summary, unavailable }) => {
    const raw = projectFilePageSchema.parse(
      JSON.parse(
        readFileSync(
          resolve(
            import.meta.dirname,
            '../..',
            PROJECT_FILE_RESOURCES[PROJECT_FILE_PAGE.namespace].defaults
          ),
          'utf8'
        )
      ) as unknown
    );
    const damaged = {
      ...raw,
      context: { ...raw.context, nested: [{ $text: { namespace: 'main', key: '' } }] },
    };
    const requests = vi.fn<typeof fetch>(() => Promise.resolve(Response.json(damaged)));
    vi.stubGlobal('fetch', requests);
    await act(async () => {
      await renderWithText(
        <ContentProjectDetail slug={PROJECT_FILE_PAGE.slug} />,
        undefined,
        locale
      );
    });
    expect(await screen.findByRole('heading', { name: title })).toBeVisible();
    expect(screen.getByText(summary)).toBeVisible();
    expect(await screen.findByRole('alert')).toHaveTextContent(unavailable);
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(requests).toHaveBeenCalledTimes(1);
  }
);
