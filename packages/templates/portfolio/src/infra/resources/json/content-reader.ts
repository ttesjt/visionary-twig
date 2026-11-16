import type { z } from 'zod';
import type { JsonReadView, JsonSchemas } from '@frontend/prepared-data/resource';
import { contentTextReferenceSchema } from '../../content-text-reference';

interface ContentTextLookup {
  getText(namespace: string, key: string): string;
}
type ResolvedFields<T> = { readonly [K in keyof T]: Resolved<T[K]> };
// Only an object-valued marker can pass the reference schema and return a translation.
type ResolvedMarker<M> = M extends string | number | boolean | null | undefined | readonly unknown[]
  ? never
  : string;
// Model both successful shapes: a marker alone, or the fields left when the marker is absent.
type Resolved<T> = T extends object
  ? '$text' extends keyof T
    ? | (Pick<T, '$text'> extends T ? ResolvedMarker<T['$text']> : never)
      | (Omit<T, '$text'> extends T ? ResolvedFields<Omit<T, '$text'>> : never)
    : ResolvedFields<T>
  : T;

interface ContentReadView<R extends JsonSchemas> extends JsonReadView<R> {
  getResolved<N extends keyof R & string>(
    namespace: N,
    options: { readonly text: ContentTextLookup }
  ): Resolved<z.output<R[N]>>;
}

function resolveValue(value: unknown, text: ContentTextLookup): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value))
    return Object.freeze(value.map((item: unknown) => resolveValue(item, text)));
  if (Object.hasOwn(value, '$text')) {
    const { $text } = contentTextReferenceSchema.parse(value);
    return text.getText($text.namespace, $text.key);
  }
  return Object.freeze(
    Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, resolveValue(child, text)])
    )
  );
}

/** Resolve against the caller's current reader; the published Content snapshot stays language-independent. */
export function createContentReader<R extends JsonSchemas>(
  raw: JsonReadView<R>
): ContentReadView<R> {
  return Object.freeze({
    ...raw,
    getResolved<N extends keyof R & string>(
      namespace: N,
      { text }: { readonly text: ContentTextLookup }
    ) {
      // The traversal mirrors Resolved<T> over the schema-validated JSON tree.
      return resolveValue(raw.get(namespace), text) as Resolved<z.output<R[N]>>;
    },
  });
}
