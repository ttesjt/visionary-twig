interface PreferenceSelectProps<Value extends string> {
  readonly label: string;
  readonly value: Value | undefined;
  readonly options: readonly {
    readonly value: Value;
    readonly label: string;
    readonly lang?: string;
  }[];
  readonly onChange: (value: Value) => void;
  readonly pendingLabel?: string;
  readonly compact?: boolean;
}

export function PreferenceSelect<Value extends string>({
  label,
  value,
  options,
  onChange,
  pendingLabel,
  compact = false,
}: PreferenceSelectProps<Value>) {
  return (
    <label className="ui-portfolio-picker" data-compact={compact || undefined}>
      <span className={compact ? 'ui-portfolio-sr-only' : 'ui-portfolio-picker-label'}>
        {label}
      </span>
      <span className="ui-portfolio-select-control">
        <select
          value={value ?? ''}
          disabled={value === undefined}
          onChange={(event) => {
            const selected = options.find((option) => option.value === event.currentTarget.value);
            if (selected) onChange(selected.value);
          }}
        >
          {pendingLabel !== undefined && (
            <option value="" disabled hidden>
              {pendingLabel}
            </option>
          )}
          {options.map(({ value, label, lang }) => (
            <option key={value} value={value} lang={lang}>
              {label}
            </option>
          ))}
        </select>
      </span>
    </label>
  );
}
