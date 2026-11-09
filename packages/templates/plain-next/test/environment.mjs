import { randomUUID } from 'node:crypto';

/** Tests override env-file values so a developer's real upstream is never contacted. */
export function environment(context) {
  const key = 'build-secret-' + randomUUID();
  return {
    ...context.environment,
    SITE_URL: 'https://site.example.test',
    EXAMPLE_UPSTREAM_URL: 'http://127.0.0.1:1/recommendation',
    EXAMPLE_UPSTREAM_API_KEY: key,
    EXAMPLE_BFF_BUILD_SECRET: key,
  };
}
