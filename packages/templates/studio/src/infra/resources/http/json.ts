import { jsonDefinition } from '../index';
import { readGeneratedJsonURL } from '../server';
import { IMMUTABLE_RESOURCE_MAX_AGE_SECONDS } from './cache';
export async function GET(
  _request: Request,
  { params }: { readonly params: Promise<{ kind: string; version: string; namespace: string }> }
) {
  const input = await params;
  if (input.kind !== 'config' && input.kind !== 'content')
    return new Response(null, { status: 404 });
  const namespace = input.namespace.endsWith('.json')
    ? input.namespace.slice(0, -'.json'.length)
    : '';
  let definition;
  try {
    definition = jsonDefinition(input.kind, namespace);
  } catch {
    return new Response(null, { status: 404 });
  }
  if (definition.version !== input.version) return new Response(null, { status: 404 });
  return Response.json(await readGeneratedJsonURL(definition.url), {
    headers: {
      'Cache-Control': `public, max-age=${IMMUTABLE_RESOURCE_MAX_AGE_SECONDS}, immutable`,
    },
  });
}
