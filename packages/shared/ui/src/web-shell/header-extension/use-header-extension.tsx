'use client';

import { useContext, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { HeaderExtensionContext } from './provider.js';
import type { HeaderExtensionLease, HeaderExtensionValue } from './registry.js';
import { DEFAULT_HEADER_EXTENSION_DENSITY } from './density.js';

export interface HeaderExtensionProps extends Omit<HeaderExtensionValue, 'content'> {
  readonly resourceKey: string;
  readonly children: ReactNode;
}
/** Automatically owns and releases a registration, including component reuse and StrictMode. */
export function useHeaderExtension(
  resourceKey: string,
  value: HeaderExtensionValue
): HeaderExtensionLease | null {
  const registry = useContext(HeaderExtensionContext);
  if (!registry) throw new Error('Header extensions require a HeaderExtensionProvider.');
  // A retained old page must not re-register just because its parent entered a new route.
  const origin = useRef({ registry, resourceKey });
  const latest = useRef(value);
  const active = useRef<HeaderExtensionLease | null>(null);
  const [registration, setRegistration] = useState<{
    registry: typeof registry;
    resourceKey: string;
    lease: HeaderExtensionLease;
  } | null>(null);
  useLayoutEffect(() => {
    latest.current = value;
    active.current?.update(value);
  }, [value.content, value.bottom, value.density, value.visible]);
  useLayoutEffect(() => {
    if (origin.current.resourceKey !== resourceKey) origin.current = { registry, resourceKey };
    if (origin.current.registry !== registry) return;
    const lease = registry.register(latest.current);
    active.current = lease;
    setRegistration({ registry, resourceKey, lease });
    return () => {
      lease.release();
      if (active.current === lease) active.current = null;
    };
  }, [registry, resourceKey]);
  return registration?.registry === registry && registration.resourceKey === resourceKey
    ? registration.lease
    : null;
}
export function HeaderExtension({
  resourceKey,
  children,
  bottom,
  density = DEFAULT_HEADER_EXTENSION_DENSITY,
  visible = true,
}: HeaderExtensionProps) {
  useHeaderExtension(resourceKey, { content: children, bottom, density, visible });
  return null;
}
