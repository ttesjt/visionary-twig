import { z } from 'zod';
import { ServerEnvironmentError } from '@/infra/environment/server';
import { MAX_TOPIC_LENGTH } from './contract';
import { fetchRecommendation, UpstreamError } from './upstream';

const inputSchema = z.strictObject({ topic: z.string().trim().min(1).max(MAX_TOPIC_LENGTH) });
const headers = { 'Cache-Control': 'no-store' };

export async function GET(request: Request): Promise<Response> {
  const query = new URL(request.url).searchParams;
  const input = inputSchema.safeParse(
    query.getAll('topic').length === 1 ? Object.fromEntries(query) : undefined
  );
  if (!input.success) {
    return Response.json({ error: 'invalid-input' }, { status: 422, headers });
  }
  try {
    return Response.json(await fetchRecommendation(input.data.topic), { headers });
  } catch (error) {
    if (error instanceof ServerEnvironmentError) {
      console.error('Example BFF configuration error', { fields: error.fields });
      return Response.json({ error: 'configuration' }, { status: 503, headers });
    }
    if (error instanceof UpstreamError) {
      console.error('Example BFF dependency error', { kind: error.kind });
      return Response.json(
        { error: error.kind },
        { status: error.kind === 'timeout' ? 504 : 502, headers }
      );
    }
    throw error;
  }
}
