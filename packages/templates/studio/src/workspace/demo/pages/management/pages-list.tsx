'use client';
import { StudioLink } from '../../../navigation/studio-link';
import { useStudioText } from '../../../../text/use-studio-text';
import { useDemoPages, useDemoRecords } from '../../data/demo-provider';
import { DEMO_ROUTES, demoPageHref } from '../../demo-routes';
export function DemoPagesList() {
  const pages = useDemoPages();
  const records = useDemoRecords();
  const componentText = useStudioText().workspace.demo.pages;
  return (
    <section className="ui-studio-surface ui-studio-flow" aria-label={componentText.title}>
      <div className="ui-studio-section-heading">
        <h2>{componentText.title}</h2>
        <StudioLink href={DEMO_ROUTES.newPage} className="ui-studio-button">
          {componentText.create}
        </StudioLink>
      </div>
      <p className="ui-studio-muted">{componentText.description}</p>
      {pages.length ? (
        <div className="ui-studio-table-scroll">
          <table className="ui-studio-record-table">
            <thead>
              <tr>
                <th scope="col">{componentText.name}</th>
                <th scope="col">{componentText.revision}</th>
                <th scope="col">{componentText.binding.title}</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((page) => (
                <tr key={page.id}>
                  <td>
                    <StudioLink href={demoPageHref(page.id)}>{page.title}</StudioLink>
                  </td>
                  <td>{page.revision}</td>
                  <td>
                    {records.find((record) => record.pageId === page.id)?.title ??
                      componentText.independent}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>{componentText.empty}</p>
      )}
    </section>
  );
}
