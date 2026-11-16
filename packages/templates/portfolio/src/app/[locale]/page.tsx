import type { Metadata } from 'next';
import { siteMetadata } from '../../site/metadata';
import { resourceRouteLocale } from '../../infra/resources/server';
import { HomeContent } from './_components/home-page';
interface PageProps {
  readonly params: Promise<{ readonly locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return siteMetadata(await resourceRouteLocale(params), '/');
}
export default async function HomePage({ params }: PageProps) {
  return <HomeContent locale={await resourceRouteLocale(params)} />;
}
