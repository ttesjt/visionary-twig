import { RESOURCE_SCOPES } from '../../../../../infra/resources';
import { connection } from 'next/server';
import { TextDemoPage } from '../_components/text-demo-page';
import { prepareScopeResources, resourceRouteLocale } from '../../../../../infra/resources/server';
export default async function SsrTextPage({
  params,
}: {
  readonly params: Promise<{ readonly locale: string }>;
}) {
  await connection();
  const locale = await resourceRouteLocale(params);
  return (
    <TextDemoPage
      mode="SSR"
      initialSnapshot={(await prepareScopeResources(RESOURCE_SCOPES.textDemo, locale)).text}
    />
  );
}
