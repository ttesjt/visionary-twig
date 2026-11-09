import { z } from 'zod';
import { MAX_TITLE_LENGTH } from './contract';
import { readJson } from '@/infra/http/read-json';

const inputSchema = z.strictObject({ title: z.string().min(1).max(MAX_TITLE_LENGTH) });

export async function POST(request: Request): Promise<Response> {
  const mediaType = request.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase();
  if (mediaType !== 'application/json') {
    return Response.json({ error: 'expected-json' }, { status: 415 });
  }
  const body = await readJson(request);
  if (!body.ok) {
    return Response.json(
      { error: body.error },
      { status: body.error === 'body-too-large' ? 413 : 400 }
    );
  }

  const input = inputSchema.safeParse(body.value);
  if (input.success) {
    const words = input.data.title
      .normalize('NFKC')
      .toLowerCase()
      .match(/[\p{L}\p{N}][\p{L}\p{N}\p{M}]*/gu);
    if (words) return Response.json({ slug: words.join('-') });
  }
  return Response.json({ error: 'invalid-title' }, { status: 422 });
}
