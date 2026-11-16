import 'server-only';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import type { TextLocale } from '../../../site/text';
import type { PortfolioData } from './contracts';

export const getSqlProjectDetail = cache(
  async (data: PortfolioData, slug: string, locale: TextLocale) => {
    await connection();
    const detail = await data.detail(slug, locale);
    if (detail.status === 'not-found') notFound();
    if (detail.status === 'invalid-document')
      console.error('Portfolio detail document could not be rendered', {
        slug,
        locale,
        error: detail.error,
      });
    return detail;
  }
);
