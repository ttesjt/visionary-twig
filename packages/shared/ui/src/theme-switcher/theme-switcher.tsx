'use client';

import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
} from 'react';
import { uiClassName } from '../dom-props.js';
import { DEFAULT_THEME_POLICY, resolveThemePreference, THEME_PREFERENCES } from '../theme.js';
import {
  DEFAULT_THEME_SWITCHER_LABELS,
  DIRECTION_KEYS,
  type ThemeSwitcherProps,
} from './theme-switcher-options.js';
import { ThemeSymbol } from './theme-symbol.js';

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

/** Controlled preference UI. Hosts own persistence and application of the root theme. */
export function ThemeSwitcher({
  preference,
  onPreferenceChange,
  labels = DEFAULT_THEME_SWITCHER_LABELS,
  policy = DEFAULT_THEME_POLICY,
  direction = 'down',
  icons,
  className,
}: ThemeSwitcherProps) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const choices = useRef<(HTMLButtonElement | null)[]>([]);
  const focusOnOpen = useRef(false);
  const enhanced = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const panelId = useId();
  const theme = resolveThemePreference(policy, preference);
  const alternatives = THEME_PREFERENCES.filter((value) => value !== theme);
  const keys = DIRECTION_KEYS[direction];

  useEffect(() => {
    if (!open) return;
    if (focusOnOpen.current) {
      choices.current[0]?.focus();
      focusOnOpen.current = false;
    }
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [open]);

  if (policy.mode === 'fixed') return null;

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      trigger.current?.focus();
      return;
    }
    const forward = event.key === keys.forward;
    const backward = event.key === keys.backward;
    if (!forward && !backward && event.key !== 'Home' && event.key !== 'End') return;
    if (event.target === trigger.current) {
      if (!forward && !backward) return;
      event.preventDefault();
      if (open) choices.current[0]?.focus();
      else {
        focusOnOpen.current = true;
        setOpen(true);
      }
      return;
    }
    if (!open) return;
    const index = choices.current.findIndex((choice) => choice === event.target);
    if (index < 0) return;
    event.preventDefault();
    const lastIndex = alternatives.length - 1;
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? lastIndex
          : (index + (forward ? 1 : -1) + alternatives.length) % alternatives.length;
    choices.current[next]?.focus();
  }

  return (
    <div
      ref={root}
      className={uiClassName('ui-theme-switcher', className)}
      data-direction={direction}
      data-open={open}
      data-preference={theme}
      onKeyDown={onKeyDown}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={trigger}
        className="ui-theme-switcher-button ui-theme-switcher-trigger"
        type="button"
        disabled={!enhanced}
        aria-label={`${labels.label}: ${labels[theme]}`}
        title={`${labels.label}: ${labels[theme]}`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
      >
        <span className="ui-theme-switcher-symbol" key={theme}>
          {icons?.[theme] ?? <ThemeSymbol preference={theme} />}
        </span>
      </button>
      <div
        id={panelId}
        className="ui-theme-switcher-options"
        role="group"
        aria-label={labels.label}
        aria-hidden={!open}
        inert={!open}
      >
        {alternatives.map((value, index) => (
          <button
            key={value}
            ref={(element) => {
              choices.current[index] = element;
            }}
            type="button"
            className="ui-theme-switcher-button"
            aria-label={labels[value]}
            title={labels[value]}
            onClick={() => {
              onPreferenceChange(value);
              setOpen(false);
              trigger.current?.focus();
            }}
          >
            {icons?.[value] ?? <ThemeSymbol preference={value} />}
          </button>
        ))}
      </div>
    </div>
  );
}
