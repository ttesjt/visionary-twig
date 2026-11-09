const ICON_PATHS = {
  grid: ['M3 3h7v7H3z', 'M14 3h7v7h-7z', 'M3 14h7v7H3z', 'M14 14h7v7h-7z'],
  note: [
    'M8 3h11a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z',
    'M3 7h6M3 12h6M3 17h6M12 8h5M12 12h5M12 16h3',
  ],
  book: ['M12 5v16', 'M12 5C9 2 5 2 2 3v15c4-1 7 0 10 3 3-3 6-4 10-3V3c-3-1-7-1-10 2Z'],
  arrow: ['M5 12h14M13 6l6 6-6 6'],
  menu: ['M4 6h16M4 12h16M4 18h16'],
  close: ['m6 6 12 12M6 18 18 6'],
  chevron: ['m9 5 7 7-7 7'],
  page: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z', 'M14 2v6h6M8 13h8M8 17h5'],
} as const;
export type StudioIconName = keyof typeof ICON_PATHS;
/** Small neutral symbols. Page registrations may supply any host-owned React icon instead. */
export function StudioIcon({ name }: { readonly name: StudioIconName }) {
  return (
    <svg
      className="ui-studio-symbol"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {ICON_PATHS[name].map((path) => (
        <path key={path} d={path} />
      ))}
    </svg>
  );
}
