'use client';

import { useContext, useRef, useSyncExternalStore } from 'react';
import { HeaderExtensionContext } from './provider.js';
import type { HeaderExtensionRegistry } from './registry.js';
import { useExtensionPresence } from './use-extension-presence.js';
import { scrollExtensionAnchor } from './scroll-extension-anchor.js';
import { DEFAULT_HEADER_EXTENSION_DENSITY } from './density.js';
import { HeaderExtensionSurfaceContext } from './surface-context.js';

export const HEADER_EXTENSION_PRESENTATIONS = ['integrated', 'attached'] as const;
export type HeaderExtensionPresentation = (typeof HEADER_EXTENSION_PRESENTATIONS)[number];
export const DEFAULT_HEADER_EXTENSION_PRESENTATION: HeaderExtensionPresentation = 'integrated';
const serverSnapshot = () => null;
function ExtensionSurface({ registry }: { readonly registry: HeaderExtensionRegistry }) {
  const snapshot = useSyncExternalStore(registry.subscribe, registry.snapshot, serverSnapshot);
  const ref = useRef<HTMLDivElement>(null);
  const { displayed, phase, expanded, interactive } = useExtensionPresence(snapshot, ref);
  return (
    <div
      ref={ref}
      className="ui-site-header-extension"
      data-state={phase}
      data-density={displayed?.density ?? DEFAULT_HEADER_EXTENSION_DENSITY}
      data-expanded={expanded ? 'true' : 'false'}
      aria-hidden={!interactive}
      inert={!interactive}
      onClick={scrollExtensionAnchor}
    >
      <div className="ui-site-header-extension-clip">
        {displayed && (
          <HeaderExtensionSurfaceContext value={interactive} key={displayed.owner}>
            <div className="ui-site-header-extension-group">
              <div className="ui-site-header-extension-content">{displayed.content}</div>
              {displayed.bottom != null && (
                <div className="ui-site-header-extension-bottom">{displayed.bottom}</div>
              )}
            </div>
          </HeaderExtensionSurfaceContext>
        )}
      </div>
    </div>
  );
}
export function HeaderExtensionSurface() {
  const registry = useContext(HeaderExtensionContext);
  return registry ? <ExtensionSurface key={registry.scope} registry={registry} /> : null;
}
