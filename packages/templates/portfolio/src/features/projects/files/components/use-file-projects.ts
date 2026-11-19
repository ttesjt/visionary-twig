'use client';

import { useMemo } from 'react';
import { useContent, useText } from '../../../../infra/resources/client';
import { textLocale } from '../../../../infra/resources';
import { readFileProjectCatalog } from '../catalog';
import { PROJECT_FILE_INDEX } from '../constants';

export function useFileProjects() {
  const content = useContent();
  const text = useText();
  const locale = textLocale(text.locale);
  return useMemo(
    () => readFileProjectCatalog(content.getResolved(PROJECT_FILE_INDEX, { text }), locale),
    [content, text, locale]
  );
}
