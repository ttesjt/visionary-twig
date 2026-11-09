'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { type ComponentProps } from 'react';
import { textLocale } from '../../infra/resources';
import { studioHref } from './studio-url';

export function useStudioRouteLocale() {
  return textLocale(useParams().locale);
}
export function StudioLink({
  href,
  ...props
}: Omit<ComponentProps<typeof Link>, 'href' | 'as'> & { href: string }) {
  const locale = useStudioRouteLocale();
  return <Link {...props} href={studioHref(href, locale)} />;
}
