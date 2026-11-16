import 'server-only';
import { notFound } from 'next/navigation';
import { TEXT_LOCALES } from '../text';
export async function resourceRouteLocale(params: Promise<{ readonly locale: string }>) {
  const input = (await params).locale;
  const selected = TEXT_LOCALES.find((value) => value === input);
  if (!selected) notFound();
  return selected;
}
