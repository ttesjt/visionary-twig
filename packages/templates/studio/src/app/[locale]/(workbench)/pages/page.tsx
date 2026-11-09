import { resourceRouteLocale } from '../../../../infra/resources/server';
import { studioHref } from '../../../../workspace/navigation/studio-url';
import { redirect } from 'next/navigation';
import { STUDIO_PAGES, studioPageHref } from '../../../../workspace/page-ids';

export default async function PagesRoute({
  params,
}: {
  readonly params: Promise<{ readonly locale: string }>;
}) {
  redirect(studioHref(studioPageHref(STUDIO_PAGES.pages), await resourceRouteLocale(params)));
}
