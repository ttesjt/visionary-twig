import type { Page } from '@playwright/test';

const HYDRATION_SCRIPTS = '**/_next/static/**/*.js';
const PAINT_MARKER = 'theme-first-contentful-paint';
export const THEME_CANVAS = { light: 'rgb(250, 250, 250)', dark: 'rgb(17, 17, 17)' } as const;

/** Hold external runtime chunks while allowing the library's early inline script and SSR HTML. */
export async function holdHydration(page: Page): Promise<{
  readonly paints: readonly string[];
  readonly release: () => Promise<void>;
}> {
  let resume = () => {};
  const gate = new Promise<void>((resolve) => {
    resume = resolve;
  });
  await page.route(HYDRATION_SCRIPTS, async (route) => {
    await gate;
    await route.continue();
  });
  const paints: string[] = [];
  page.on('console', (message) => {
    if (message.text().startsWith(PAINT_MARKER + ' '))
      paints.push(message.text().slice(PAINT_MARKER.length + 1));
  });
  await page.addInitScript((marker) => {
    const observer = new PerformanceObserver((list) => {
      if (!list.getEntries().some((entry) => entry.name === 'first-contentful-paint')) return;
      console.debug(
        marker,
        document.documentElement.dataset.theme,
        getComputedStyle(document.documentElement).colorScheme,
        getComputedStyle(document.body).backgroundColor
      );
      observer.disconnect();
    });
    observer.observe({ type: 'paint', buffered: true });
  }, PAINT_MARKER);
  return {
    paints,
    async release() {
      resume();
      await page.unrouteAll({ behavior: 'wait' });
    },
  };
}

export function hydrationErrors(page: Page): readonly string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (
      message.type() === 'error' &&
      /hydrat|did not match|server rendered|Minified React error/i.test(message.text())
    )
      errors.push(message.text());
  });
  return errors;
}
