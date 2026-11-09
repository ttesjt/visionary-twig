'use client';
import { ThemePicker } from '../../../components/theme-picker';
import { useText, useAppConfig } from '../../../infra/resources/client';
export function HomeContent() {
  const text = useText();
  const config = useAppConfig().get('app');
  return (
    <main className="example-page example-sections">
      <header className="example-header example-controls">
        <p>{text.getText('main', 'home.brand')}</p>
        <ThemePicker />
      </header>
      <div className="example-flow">
        <h1 className="example-title">{text.getText('main', 'home.title')}</h1>
        {config.home.showIntroduction && (
          <p className="example-description">{text.getText('main', 'home.description')}</p>
        )}
      </div>
    </main>
  );
}
