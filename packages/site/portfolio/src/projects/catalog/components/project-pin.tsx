import type { ReactElement } from 'react';

export function ProjectPin({ label }: { readonly label: string }): ReactElement {
  return (
    <svg
      className="ui-project-pin"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label={label}
      focusable="false"
    >
      <path d="M12 16v5M9 3h6l-1 7 4 4v2H6v-2l4-4z" />
    </svg>
  );
}
