import { formatTextParts } from '../../catalog/format.js';
import type { CompiledText } from '../contracts/dictionary.js';
import type { TextNamespaceContract } from '../contracts/types.js';
export class TextInterpolationError extends Error {
  readonly kind = 'interpolation';
  constructor(
    readonly namespace: string,
    readonly key: string,
    readonly locale: string,
    readonly variable?: string
  ) {
    super(
      `Invalid text variables: ${namespace}.${key}${variable === undefined ? '' : ' (' + variable + ')'}`
    );
    this.name = 'TextInterpolationError';
  }
}
export function interpolateText(
  parts: CompiledText,
  allowed: TextNamespaceContract[string],
  values: Readonly<Record<string, string | number>>,
  namespace: string,
  key: string,
  locale: string
): string {
  const fail = (variable?: string): never => {
    throw new TextInterpolationError(namespace, key, locale, variable);
  };
  if (values === null || typeof values !== 'object' || Array.isArray(values)) fail();
  const prototype: unknown = Object.getPrototypeOf(values);
  if (prototype !== null && prototype !== Object.prototype) fail();
  if (Object.getOwnPropertySymbols(values).length) fail();
  for (const [name, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(values))) {
    if (!Object.hasOwn(allowed, name) || !('value' in descriptor)) fail(name);
    const value: unknown = descriptor.value;
    if (typeof value !== 'string' && !(typeof value === 'number' && Number.isFinite(value)))
      fail(name);
  }
  for (const part of parts)
    if (part.kind === 'variable' && !Object.hasOwn(values, part.name)) fail(part.name);
  return formatTextParts(parts, values);
}
