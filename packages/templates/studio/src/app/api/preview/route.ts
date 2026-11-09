import { trackAcceptedPreview } from '../../../site/preview-tracking.server';
import { previewStore } from '../../../preview/preview-server';
import {
  readPreviewBody,
  sameLocalOrigin,
  validatePreviewInput,
} from '../../../preview/preview-request';
const headers = { 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow' };
export const runtime = 'nodejs';
export async function POST(request: Request): Promise<Response> {
  if (!sameLocalOrigin(request))
    return Response.json(
      {
        errors: [
          {
            code: 'preview-origin',
            path: [],
            message: 'Preview requests must come from this loopback Studio origin.',
          },
        ],
      },
      { status: 403, headers }
    );
  if (request.headers.get('content-type')?.split(';')[0]?.trim() !== 'application/json')
    return Response.json(
      {
        errors: [{ code: 'preview-content-type', path: [], message: 'Expected application/json.' }],
      },
      { status: 415, headers }
    );
  const body = await readPreviewBody(request);
  if (!body.ok)
    return Response.json(
      { errors: body.errors },
      {
        status: body.errors.some((issue) => issue.code === 'preview-too-large') ? 413 : 400,
        headers,
      }
    );
  const result = validatePreviewInput(body.value);
  if (!result.ok) return Response.json({ errors: result.errors }, { status: 422, headers });
  const id = previewStore.put(result.value);
  await trackAcceptedPreview(request);
  return Response.json({ url: `/preview/${id}` }, { status: 201, headers });
}
