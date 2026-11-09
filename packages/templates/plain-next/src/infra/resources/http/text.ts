import { readGeneratedText } from '../server';
import { TEXT_RESOURCE_VERSION, TEXT_LOCALES, isTextNamespace, textDefinition } from '../index';
import { IMMUTABLE_RESOURCE_MAX_AGE_SECONDS } from './cache';
export async function GET(
  _request: Request,
  {
    params,
  }: {
    readonly params: Promise<{
      readonly version: string;
      readonly locale: string;
      readonly namespace: string;
    }>;
  }
) {
  const input = await params;
  const locale = TEXT_LOCALES.find((value) => value === input.locale);
  const namespace = input.namespace.endsWith('.json')
    ? input.namespace.slice(0, -'.json'.length)
    : '';
  if (input.version !== TEXT_RESOURCE_VERSION || !locale || !isTextNamespace(namespace))
    return new Response(null, { status: 404 });
  const value = await readGeneratedText(textDefinition(namespace, locale).url);
  return Response.json(value, {
    headers: {
      'Cache-Control': `public, max-age=${IMMUTABLE_RESOURCE_MAX_AGE_SECONDS}, immutable`,
    },
  });
}
