export const TEXT_VARIABLE_NAME = /^[a-zA-Z][a-zA-Z0-9_]*$/;
type TextPart =
  | { readonly kind: 'text'; readonly value: string }
  | { readonly kind: 'variable'; readonly name: string };
/** Shared grammar for preparation checks and rendering. No expressions or escape syntax. */
export function parseTextTemplate(template: string): readonly TextPart[] {
  const parts: TextPart[] = [];
  let offset = 0;
  for (const match of template.matchAll(/\{([^{}]*)\}|[{}]/g)) {
    const name = match[1];
    if (name === undefined || !TEXT_VARIABLE_NAME.test(name))
      throw new Error('Invalid text placeholder: ' + match[0]);
    parts.push(
      { kind: 'text', value: template.slice(offset, match.index) },
      { kind: 'variable', name }
    );
    offset = match.index + match[0].length;
  }
  parts.push({ kind: 'text', value: template.slice(offset) });
  return parts;
}
