// @vitest-environment node
import { expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { readServerEnvironment, ServerEnvironmentError } from './server';
import { z } from 'zod';
const exampleUpstreamEnvironmentSchema = z.object({
  EXAMPLE_UPSTREAM_URL: z.url().refine((value) => {
    if (!URL.canParse(value)) return false;
    const url = new URL(value);
    return (
      ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password && !url.hash
    );
  }),
  EXAMPLE_UPSTREAM_API_KEY: z
    .string()
    .min(1)
    .max(4096)
    .refine((value) => !/[^\x21-\x7e]/.test(value)),
});

it('reads only declared values and permits the process environment to contain other capabilities', () => {
  expect(
    readServerEnvironment(exampleUpstreamEnvironmentSchema, {
      EXAMPLE_UPSTREAM_URL: 'https://service.example.test/recommendation',
      EXAMPLE_UPSTREAM_API_KEY: 'test-key',
      UNRELATED: 'value',
    })
  ).toEqual({
    EXAMPLE_UPSTREAM_URL: 'https://service.example.test/recommendation',
    EXAMPLE_UPSTREAM_API_KEY: 'test-key',
  });
});

it('reports missing or malformed fields without retaining their values in diagnostics', () => {
  const secret = 'unique-private-value';
  for (const environment of [
    {},
    { EXAMPLE_UPSTREAM_URL: secret, EXAMPLE_UPSTREAM_API_KEY: secret },
    { EXAMPLE_UPSTREAM_URL: 'file:///private/' + secret, EXAMPLE_UPSTREAM_API_KEY: secret },
    {
      EXAMPLE_UPSTREAM_URL: 'https://name:' + secret + '@service.example.test',
      EXAMPLE_UPSTREAM_API_KEY: secret,
    },
    {
      EXAMPLE_UPSTREAM_URL: 'https://service.example.test',
      EXAMPLE_UPSTREAM_API_KEY: secret + '\n',
    },
  ]) {
    try {
      readServerEnvironment(exampleUpstreamEnvironmentSchema, environment);
      throw new Error('Expected invalid environment');
    } catch (error) {
      expect(error).toBeInstanceOf(ServerEnvironmentError);
      expect(String(error) + JSON.stringify(error)).not.toContain(secret);
      expect(error).not.toHaveProperty('cause');
    }
  }
});
