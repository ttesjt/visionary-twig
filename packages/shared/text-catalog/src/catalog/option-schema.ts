import { z } from 'zod';
/** Labels are exhaustive; numeric and string IDs retain their HTML option values. */
export function textOptionLabelsSchema<const Options extends readonly (string | number)[]>(
  options: Options
) {
  const ids = options.map((option) => String(option) as `${Options[number]}`);
  if (!ids.length || ids.some((id) => !id) || new Set(ids).size !== ids.length)
    throw new Error('Text options must have distinct, nonempty IDs.');
  return z.record(z.enum(ids), z.string().min(1));
}
/** Lookup for runtime-selected IDs. Missing labels are integration errors, never ID fallbacks. */
export function textOptionLabel(
  labels: Readonly<Record<string, string>>,
  value: string | number
): string {
  const label = labels[String(value)];
  if (label === undefined) throw new Error('Missing text option label: ' + String(value));
  return label;
}
