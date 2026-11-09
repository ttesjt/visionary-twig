import { mergePreparedData } from '../index.js';
import type { PreparedInputReader, PreparedSource } from './contracts.js';
/** One default/auto/custom policy shared by every preparation format. */
export async function resolvePreparedJson<T>(
  read: PreparedInputReader,
  source: PreparedSource,
  options: {
    readonly defaults: string;
    readonly custom: string;
    readonly parse: (value: unknown) => T;
  }
): Promise<T> {
  const defaults = await read(options.defaults);
  const preparedDefaults = options.parse(structuredClone(defaults));
  const override =
    source === 'default' ? undefined : await read(options.custom, { optional: source === 'auto' });
  return override === undefined
    ? preparedDefaults
    : options.parse(structuredClone(mergePreparedData(defaults, override)));
}
