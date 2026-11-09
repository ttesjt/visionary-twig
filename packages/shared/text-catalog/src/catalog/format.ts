import { parseTextTemplate } from './template.js';
export function formatTextParts(
  parts: ReturnType<typeof parseTextTemplate>,
  values: Readonly<Record<string, string | number>>
): string {
  return parts
    .map((part) => {
      if (part.kind === 'text') return part.value;
      if (!Object.hasOwn(values, part.name)) throw new Error('Missing text variable: ' + part.name);
      return String(values[part.name]);
    })
    .join('');
}
/** Plain text named placeholders, without expressions or HTML interpretation. */
export function formatText(
  template: string,
  values: Readonly<Record<string, string | number>>
): string {
  return formatTextParts(parseTextTemplate(template), values);
}
