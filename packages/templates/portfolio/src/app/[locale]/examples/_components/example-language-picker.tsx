'use client';
import { TEXT_LOCALES } from '../../../../infra/resources';
import { useText, useTextLocale } from '../../../../infra/resources/client';

export function ExampleLanguagePicker() {
  const text = useText();
  const { selection, selectLocale } = useTextLocale();
  return (
    <fieldset>
      <legend>{text.getText('main', 'textDemo.language')}</legend>
      <div className="example-controls">
        {TEXT_LOCALES.map((value) => (
          <button
            type="button"
            className="ui-button"
            key={value}
            aria-pressed={value === selection.locale}
            onClick={() => selectLocale(value)}
          >
            {text.getText('main', `textDemo.languages.${value}`)}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
