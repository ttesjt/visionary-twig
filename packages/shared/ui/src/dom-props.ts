export function withoutStyle<T extends { readonly style?: unknown }>(props: T): Omit<T, 'style'> {
  const { style, ...domProps } = props;
  void style;
  return domProps;
}

export function uiClassName(base: string, custom?: string): string {
  return custom ? `${base} ${custom}` : base;
}
