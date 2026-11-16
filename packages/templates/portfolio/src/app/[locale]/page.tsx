import type { Metadata } from 'next';
import { siteMetadata } from '../../site/metadata';
import { resourceRouteLocale } from '../../infra/resources/server';
import { HomeContent } from './_components/home-page';
export async function generateMetadata({
  params,
}: {
  readonly params: Promise<{ readonly locale: string }>;
}): Promise<Metadata> {
  return siteMetadata(await resourceRouteLocale(params), '/');
}
export default function HomePage() {
  return <HomeContent />;
}
