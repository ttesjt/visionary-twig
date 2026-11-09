import type { ReactElement } from 'react';
import type { ActionLink } from './action-links.schema.js';

type ActionIconName = NonNullable<ActionLink['icon']>;
const ICON_PATHS: Readonly<Record<ActionIconName, string>> = {
  smartphone: 'M7 2h10v20H7zM11 18h2',
  website: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20M2 12h20M12 2c-5 6-5 14 0 20 5-6 5-14 0-20',
  github: 'M8 5H5v14h3M16 5h3v14h-3M10 9l-3 3 3 3M14 9l3 3-3 3',
  download: 'M12 3v12M7 10l5 5 5-5M4 17v4h16v-4',
  video: 'M4 3h16v18H4zM10 8l6 4-6 4z',
  external: 'M14 3h7v7M21 3l-9 9M10 5H3v16h16v-7',
};
export function ActionIcon({ name }: { readonly name: ActionIconName }): ReactElement {
  return (
    <svg
      className="ui-action-icon"
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d={ICON_PATHS[name]}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
