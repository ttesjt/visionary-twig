'use client';
import { useState } from 'react';
import { useSWRConfig } from 'swr';
import { useText } from '../../../../../infra/resources/client';
import { useRemoteSettings } from '../_data/use-remote-settings';
import {
  REMOTE_SETTINGS_SOURCES,
  remoteSettingsKey,
  type RemoteSettingsSource,
} from '../_data/schema';

function SettingsPreview({
  source,
  enabled,
  title,
}: {
  readonly source: RemoteSettingsSource;
  readonly enabled: boolean;
  readonly title: string;
}) {
  const text = useText();
  const { settings, error, isLoading, isValidating } = useRemoteSettings(source, enabled);
  const status = !enabled
    ? 'disabled'
    : isLoading
      ? 'loading'
      : isValidating
        ? 'refreshing'
        : error
          ? 'failed'
          : 'ready';
  return (
    <section
      className="example-settings-panel example-flow"
      data-density={settings.density}
      data-testid="settings-preview"
    >
      <h2>{title}</h2>
      <p role="status">{text.getText('main', `remoteSettings.${status}`)}</p>
      {error && <p role="alert">{text.getText('main', `remoteSettings.errors.${error.kind}`)}</p>}
      <pre className="example-code">{JSON.stringify(settings, null, 2)}</pre>
      {settings.showNote && (
        <p data-testid="settings-note">{text.getText('main', 'remoteSettings.note')}</p>
      )}
    </section>
  );
}
export function RemoteSettingsExample() {
  const text = useText();
  const [source, setSource] = useState<RemoteSettingsSource>('comfortable');
  const [enabled, setEnabled] = useState(true);
  const { mutate } = useSWRConfig();
  return (
    <div className="example-sections">
      <div className="example-controls">
        <label>
          {text.getText('main', 'remoteSettings.source')}{' '}
          <select
            value={source}
            onChange={(event) => {
              const value = REMOTE_SETTINGS_SOURCES.find((entry) => entry === event.target.value);
              if (value) setSource(value);
            }}
          >
            {REMOTE_SETTINGS_SOURCES.map((entry) => (
              <option key={entry} value={entry}>
                {text.getText('main', `remoteSettings.sources.${entry}`)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
          />{' '}
          {text.getText('main', 'remoteSettings.enabled')}
        </label>
        <button
          type="button"
          className="ui-button"
          disabled={!enabled}
          onClick={() => {
            // Consumers display SWR's error; refresh must not leak a rejected Promise.
            void mutate(remoteSettingsKey(source)).catch(() => {});
          }}
        >
          {text.getText('main', 'remoteSettings.refresh')}
        </button>
      </div>
      <SettingsPreview
        source={source}
        enabled={enabled}
        title={text.getText('main', 'remoteSettings.firstPreview')}
      />
      <SettingsPreview
        source={source}
        enabled={enabled}
        title={text.getText('main', 'remoteSettings.secondPreview')}
      />
    </div>
  );
}
