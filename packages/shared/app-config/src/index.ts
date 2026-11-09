import { assertSafeData, freezePreparedData } from '@frontend/prepared-data';
import { z } from 'zod';
/** Configuration is language-independent and validated at its owning app boundary. */
export function createAppConfigReader<S extends z.ZodType>(schema: S, input: unknown) {
  assertSafeData(input);
  const value = schema.parse(input);
  assertSafeData(value);
  freezePreparedData(value);
  return { get: (): z.output<S> => value };
}
