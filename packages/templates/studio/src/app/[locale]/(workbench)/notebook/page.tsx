import { resourceRouteLocale } from '../../../../infra/resources/server';
import { studioHref } from '../../../../workspace/navigation/studio-url';
import { redirect } from 'next/navigation';
import { studioPageHref, STUDIO_PAGES } from '../../../../workspace/page-ids';
export default async function LegacyDemoPage({
  params,
}: {
  readonly params: Promise<{ readonly locale: string }>;
}) {
  redirect(studioHref(studioPageHref(STUDIO_PAGES.demo), await resourceRouteLocale(params)));
}
