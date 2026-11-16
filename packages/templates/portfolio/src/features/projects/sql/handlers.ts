import { projectIdSchema } from '@frontend/portfolio/contracts';
import { assertObjectKey } from '@frontend/storage';
import type { PortfolioData } from './contracts';
import { parseProjectRequest, portfolioLocaleSchema } from './query';
import { PORTFOLIO_SOURCE_HEADER } from './http-contract';
import { collectionResponse, readCollection } from './read-collection';

export async function handleProjectList(
  request: Request,
  data: PortfolioData,
  pageSize: number
): Promise<Response> {
  const query = parseProjectRequest(new URL(request.url).searchParams, pageSize);
  if (!query.success) return collectionResponse({ status: 'failed', code: 'invalid-query' });
  return collectionResponse(
    await readCollection(
      data.sourceId,
      () => data.projects(query.data),
      request.headers.get(PORTFOLIO_SOURCE_HEADER) ?? undefined
    )
  );
}

export async function handleProjectCategories(
  request: Request,
  data: PortfolioData
): Promise<Response> {
  const locale = portfolioLocaleSchema.safeParse(new URL(request.url).searchParams.get('locale'));
  if (!locale.success) return collectionResponse({ status: 'failed', code: 'invalid-query' });
  return collectionResponse(
    await readCollection(
      data.sourceId,
      () => data.categories(locale.data),
      request.headers.get(PORTFOLIO_SOURCE_HEADER) ?? undefined
    )
  );
}

const PUBLIC_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
]);

export async function handleProjectMedia(
  request: Request,
  params: Promise<{ readonly projectId: string }>,
  data: PortfolioData
): Promise<Response> {
  const id = projectIdSchema.safeParse((await params).projectId);
  const key = new URL(request.url).searchParams.get('key');
  if (!id.success || key === null) return new Response(null, { status: 404 });
  try {
    assertObjectKey(key);
  } catch {
    return new Response(null, { status: 404 });
  }
  const image = await data.media(id.data, key);
  if (!image || !PUBLIC_IMAGE_TYPES.has(image.contentType))
    return new Response(null, { status: 404 });
  return new Response(Uint8Array.from(image.bytes), {
    headers: {
      'Content-Type': image.contentType,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
