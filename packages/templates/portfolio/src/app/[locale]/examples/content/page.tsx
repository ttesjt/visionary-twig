import { ContentExample } from './_components/content-example';
import { prepareScopeResources, resourceRouteLocale } from '../../../../infra/resources/server';
import { RESOURCE_SCOPES } from '../../../../infra/resources';
export default async function ContentPage({
  params,
}: {
  readonly params: Promise<{ readonly locale: string }>;
}) {
  const locale = await resourceRouteLocale(params);
  const snapshots = await prepareScopeResources(RESOURCE_SCOPES.contentDemo, locale);
  if (!snapshots.content || !snapshots.text)
    throw new Error('Content example requires Content and Text snapshots.');
  return <ContentExample contentSnapshot={snapshots.content} textSnapshot={snapshots.text} />;
}
