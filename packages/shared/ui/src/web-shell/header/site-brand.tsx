import type { ReactElement } from 'react';
export interface SiteBrandImage {
  readonly url: string;
  readonly width: number;
  readonly height: number;
}

/** label names the Home link in every mode, and is the visible text when present. */
export type SiteHeaderBrand = {
  readonly label: string;
  readonly href: string;
} & (
  | { readonly display?: 'text'; readonly image?: never }
  | { readonly display: 'image' | 'image-text'; readonly image: SiteBrandImage }
);

export function SiteBrandContent({ brand }: { readonly brand: SiteHeaderBrand }): ReactElement {
  return (
    <>
      {brand.image && (
        <img
          className="ui-site-brand-image"
          src={brand.image.url}
          width={brand.image.width}
          height={brand.image.height}
          alt=""
        />
      )}
      {brand.display !== 'image' && <span className="ui-site-brand-label">{brand.label}</span>}
    </>
  );
}
