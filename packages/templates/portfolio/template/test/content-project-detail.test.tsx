const PROJECT_FILE_PAGE = {
  slug: 'field-notes',
  namespace: 'project-field-notes',
  filename: 'field-notes.json',
} as const;
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { renderWithText } from '../../test/text-render';
import { PROJECT_FILE_RESOURCES } from '../../src/features/projects/files/resources';
import { projectFilePageSchema } from '../../src/features/projects/files/schemas';
import { RESOURCE_STARTUP_TEXT } from '../../src/site/startup-text';
import { ContentProjectDetail } from '../../src/features/projects/files/components/content-project-detail';
import { useText, useTextLocale } from '../../src/infra/resources/client';
import { planResourceScope, splitScopeSnapshot } from '../../src/infra/resources';
import { prepareResourcePlan } from '@frontend/resource-runtime';
import { FIELD_NOTES_SCOPE, readProjectResource, resourceRequestURL } from './project-resources';

beforeEach(() => {
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
});
afterEach(() => vi.unstubAllGlobals());

it.each(['content', 'text'] as const)(
  'retries only failed page %s through the inherited Runtime',
  async (kind) => {
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
    let attempts = 0;
    const failedPath = kind === 'content' ? '/json/content/' : '/text/';
    const requests = vi.fn<typeof fetch>((url) => {
      const value = resourceRequestURL(url);
      if (value.includes(failedPath) && attempts++ === 0)
        return Promise.resolve(new Response(null, { status: 503 }));
      return Promise.resolve(
        Response.json(value.includes('/json/content/') ? file : readProjectResource(value))
      );
    });
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
    expect(requests).toHaveBeenCalledTimes(3);
    expect(
      requests.mock.calls
        .map(([url]) => url)
        .filter((url) => resourceRequestURL(url).includes(failedPath))
    ).toEqual([
      expect.stringContaining(
        kind === 'content' ? '/project-field-notes.json' : '/field-notes.json'
      ),
      expect.stringContaining(
        kind === 'content' ? '/project-field-notes.json' : '/field-notes.json'
      ),
    ]);
  }
);

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
    const requests = vi.fn<typeof fetch>((url) =>
      Promise.resolve(
        Response.json(
          resourceRequestURL(url).includes('/json/content/')
            ? damaged
            : readProjectResource(resourceRequestURL(url))
        )
      )
    );
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
    expect(requests).toHaveBeenCalledTimes(2);
  }
);

it.each([
  { locale: 'en', heading: 'An illustrated field log', back: 'Back to projects' },
  { locale: 'zh', heading: '带插图的野外记录', back: '返回项目列表' },
] as const)(
  'waits for page text as well as Puck content on a pure CSR $locale entry',
  async ({ locale, heading, back }) => {
    let release: (response: Response) => void = () => {};
    const pendingText = new Promise<Response>((resolve) => {
      release = resolve;
    });
    let textURL = '';
    const requests = vi.fn<typeof fetch>(async (url) => {
      const value = resourceRequestURL(url);
      if (value.includes('/text/')) {
        textURL = value;
        return pendingText;
      }
      return Response.json(readProjectResource(value));
    });
    vi.stubGlobal('fetch', requests);
    await act(async () => {
      await renderWithText(
        <ContentProjectDetail slug={PROJECT_FILE_PAGE.slug} />,
        undefined,
        locale
      );
    });
    await waitFor(() => expect(requests).toHaveBeenCalledTimes(2));
    expect(screen.getByRole('status')).toHaveTextContent(RESOURCE_STARTUP_TEXT.pending);
    expect(screen.queryByRole('heading', { name: heading })).not.toBeInTheDocument();
    act(() => {
      release(Response.json(readProjectResource(textURL)));
    });
    expect(await screen.findByRole('heading', { name: heading })).toBeVisible();
    expect(screen.getByRole('link', { name: back })).toBeVisible();
    expect(requests).toHaveBeenCalledTimes(2);
  }
);

function LanguageControl() {
  const text = useText();
  const { selectLocale } = useTextLocale();
  return <button onClick={() => selectLocale('zh')}>{text.locale}</button>;
}

it.each(['en', 'zh'] as const)(
  'restores both SSR snapshots without fetching again for %s',
  async (locale) => {
    const target = planResourceScope(FIELD_NOTES_SCOPE, locale);
    const snapshot = await prepareResourcePlan(target.plan, (resource) =>
      Promise.resolve(readProjectResource(resource.url))
    );
    const serialized: unknown = JSON.parse(JSON.stringify(snapshot));
    const snapshots = splitScopeSnapshot(target, serialized);
    const requests = vi.fn<typeof fetch>(() =>
      Promise.reject(new Error('Unexpected client fetch'))
    );
    vi.stubGlobal('fetch', requests);
    await act(async () => {
      await renderWithText(
        <ContentProjectDetail slug={PROJECT_FILE_PAGE.slug} initialSnapshots={snapshots} />,
        undefined,
        locale
      );
    });
    expect(
      screen.getByRole('heading', {
        name: locale === 'en' ? 'An illustrated field log' : '带插图的野外记录',
      })
    ).toBeVisible();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(requests).not.toHaveBeenCalled();
  }
);

it('keeps global and page text in English until every Chinese dictionary is ready', async () => {
  let release: (response: Response) => void = () => {};
  const pendingText = new Promise<Response>((resolve) => {
    release = resolve;
  });
  let textURL = '';
  const requests = vi.fn<typeof fetch>(async (url) => {
    const value = resourceRequestURL(url);
    if (value.includes('/zh/field-notes.json')) {
      textURL = value;
      return pendingText;
    }
    return Response.json(readProjectResource(value));
  });
  vi.stubGlobal('fetch', requests);
  await act(async () => {
    await renderWithText(
      <>
        <LanguageControl />
        <ContentProjectDetail slug={PROJECT_FILE_PAGE.slug} />
      </>
    );
  });
  await screen.findByRole('heading', { name: 'An illustrated field log' });
  await userEvent.click(screen.getByRole('button', { name: 'en' }));
  await waitFor(() => expect(textURL).not.toBe(''));
  expect(screen.getByRole('button', { name: 'en' })).toBeVisible();
  expect(screen.getByRole('heading', { name: 'An illustrated field log' })).toBeVisible();
  expect(screen.queryByRole('heading', { name: '带插图的野外记录' })).not.toBeInTheDocument();
  act(() => {
    release(Response.json(readProjectResource(textURL)));
  });
  expect(await screen.findByRole('button', { name: 'zh' })).toBeVisible();
  expect(screen.getByRole('heading', { name: '带插图的野外记录' })).toBeVisible();
  expect(screen.getByRole('link', { name: '返回项目列表' })).toBeVisible();
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});
