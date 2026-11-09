import type { ReactNode } from 'react';
export function StudioRecordWorkspace({
  list,
  inspector,
  preview,
}: {
  readonly list: ReactNode;
  readonly inspector: ReactNode;
  readonly preview?: ReactNode;
}) {
  return (
    <div className="ui-studio-record-browser">
      {list}
      {inspector}
      {preview}
    </div>
  );
}
export function StudioRecordInspector({
  title,
  children,
}: {
  readonly title: string;
  readonly children: ReactNode;
}) {
  return (
    <section className="ui-studio-surface ui-studio-flow" aria-label={title}>
      <div className="ui-studio-section-heading">
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  );
}
export function StudioRecordPreview({
  title,
  notice,
  children,
}: {
  readonly title: string;
  readonly notice?: ReactNode;
  readonly children: ReactNode;
}) {
  return (
    <section
      className="ui-studio-surface ui-studio-flow ui-studio-record-preview"
      aria-label={title}
    >
      <div className="ui-studio-section-heading">
        <h2>{title}</h2>
        {notice}
      </div>
      {children}
    </section>
  );
}
