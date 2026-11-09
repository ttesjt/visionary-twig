import '@testing-library/jest-dom/vitest';
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Column, Container, Grid, Layer, Row } from '../layout.js';

describe('layout public contracts', () => {
  it('supports semantic containers, native attributes and refs', () => {
    const ref = createRef<HTMLElement>();
    render(
      <Container
        as="article"
        ref={ref}
        width="reading"
        aria-label="Story"
        className="consumer-hook"
      >
        Readable
      </Container>
    );
    expect(screen.getByRole('article')).toBe(ref.current);
    expect(ref.current).toHaveAttribute('data-width', 'reading');
    expect(ref.current).toHaveClass('ui-container', 'consumer-hook');
  });
  it('keeps the established flex defaults and forwards refs', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Column>
        <Row ref={ref}>Children</Row>
      </Column>
    );
    expect(ref.current).toHaveAttribute('data-space', 'content');
    expect(ref.current).toHaveAttribute('data-collapse', 'narrow');
    expect(ref.current).toHaveAttribute('data-align', 'center');
  });
  it('separates layer flow content from its positioned overlay', () => {
    render(
      <Layer position="bottom-start" overlay={<button>Overlay</button>}>
        <p>Main content</p>
      </Layer>
    );
    expect(screen.getByText('Main content').parentElement).toHaveClass('ui-layer-content');
    expect(screen.getByRole('button').parentElement).toHaveAttribute(
      'data-position',
      'bottom-start'
    );
  });
  it('drops runtime styles even when a JavaScript consumer bypasses types', () => {
    const injected: Record<string, unknown> = { style: { width: '9999px' } };
    const { container } = render(
      <Container {...injected}>
        <Row {...injected}>
          <Column {...injected}>
            <Grid {...injected}>
              <Layer {...injected}>Safe</Layer>
            </Grid>
          </Column>
        </Row>
      </Container>
    );
    expect(container.querySelector('[style]')).toBeNull();
  });
});
