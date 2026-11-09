import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Hero, Heading, RichText, MediaText, Separator, ActionLinks } from './index.js';
import {
  heroPropsSchema,
  mediaTextPropsSchema,
  headingPropsSchema,
  actionLinkSchema,
} from './schema.js';
const image = {
  id: 'mountains',
  src: '/mountains.svg',
  alt: 'Mountains',
  width: 1200,
  height: 600,
};
describe('bounded content presentation', () => {
  it('renders a background hero independently of its normal inline image variant', () => {
    const { container, rerender } = render(
      <Hero
        title="An observatory"
        headingLevel={1}
        image={image}
        variant="background"
        size="compact"
        align="center"
      />
    );
    expect(container.querySelector('.ui-content-hero')).toHaveAttribute(
      'data-variant',
      'background'
    );
    expect(container.querySelector('.ui-hero-background img')).toHaveAttribute('src', image.src);
    expect(container.querySelector('.ui-media-figure')).toBeNull();
    expect(screen.getByRole('heading', { name: 'An observatory' })).toBeVisible();
    rerender(<Hero title="An observatory" headingLevel={1} image={image} />);
    expect(container.querySelector('.ui-hero-background')).toBeNull();
    expect(screen.getByRole('img', { name: 'Mountains' })).toBeVisible();
  });
  it('exposes alignment, a semantic separator and compact media without authored style values', () => {
    const { container } = render(
      <>
        <Heading text="Section" align="center" />
        <RichText content={[]} align="end" />
        <Separator />
        <MediaText
          media={{ type: 'image', image }}
          body={[]}
          mediaSize="compact"
          proportion="text-dominant"
        />
      </>
    );
    expect(screen.getByRole('separator')).toHaveClass('ui-content-separator');
    expect(container.querySelector('.ui-media-text')).toHaveAttribute(
      'data-proportion',
      'text-dominant'
    );
    expect(container.querySelector('.ui-media-text')).toHaveAttribute('data-media-size', 'compact');
    expect(container.querySelector('[style]')).toBeNull();
  });
  it('keeps the optional smartphone icon explicitly data-driven', () => {
    const { container } = render(
      <ActionLinks
        actions={[
          {
            id: 'phone',
            availability: 'available',
            href: '/app.apk',
            label: 'Android',
            icon: 'smartphone',
          },
          { id: 'plain', availability: 'available', href: '/other.apk', label: 'Other' },
        ]}
      />
    );
    expect(container.querySelectorAll('.ui-action-icon')).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Other' }).querySelector('svg')).toBeNull();
  });
  it('rejects arbitrary values in all newly added choices', () => {
    expect(heroPropsSchema.safeParse({ title: 'T', headingLevel: 1, size: 999 }).success).toBe(
      false
    );
    expect(
      mediaTextPropsSchema.safeParse({
        media: { type: 'image', image },
        body: [],
        proportion: 0.25,
      }).success
    ).toBe(false);
    expect(headingPropsSchema.safeParse({ text: 'T', align: 'justify' }).success).toBe(false);
    expect(
      actionLinkSchema.safeParse({
        id: 'x',
        label: 'X',
        availability: 'available',
        href: '/',
        icon: '<svg />',
      }).success
    ).toBe(false);
  });
});
