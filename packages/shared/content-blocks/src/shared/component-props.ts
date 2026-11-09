export interface ContentProps {
  readonly id?: string;
  readonly className?: string;
  readonly style?: never;
}

export function contentClassName(base: string, custom?: string): string {
  return custom ? `${base} ${custom}` : base;
}
