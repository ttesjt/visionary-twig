import 'server-only';
import type { z } from 'zod';

export class ServerEnvironmentError extends Error {
  readonly fields: readonly string[];
  constructor(fields: readonly string[]) {
    super('Invalid server environment fields: ' + fields.join(', '));
    this.name = 'ServerEnvironmentError';
    this.fields = Object.freeze([...fields]);
  }
}

/** Next loads env files. This boundary validates only the requested capability.
 * Raw schema errors can retain secret input, so expose field names alone.
 */
export function readServerEnvironment<T>(
  schema: z.ZodType<T>,
  environment: Readonly<Record<string, string | undefined>> = process.env
): T {
  const parsed = schema.safeParse(environment);
  if (!parsed.success) {
    throw new ServerEnvironmentError(
      [...new Set(parsed.error.issues.map((issue) => issue.path.join('.') || '(root)'))].sort()
    );
  }
  return parsed.data;
}
