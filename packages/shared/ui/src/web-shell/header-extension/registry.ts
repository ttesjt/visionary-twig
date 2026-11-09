import type { ReactNode } from 'react';
import type { HeaderExtensionDensity } from './density.js';

export interface HeaderExtensionValue {
  readonly content: ReactNode;
  /** Unpadded footer content, replaced and released atomically with the main content. */
  readonly bottom?: ReactNode;
  /** Defaults to compact. Global CSS owns all spacing measurements. */
  readonly density?: HeaderExtensionDensity;
  readonly visible?: boolean;
}
export interface HeaderExtensionLease {
  /** Aborted on replacement, resource change, or unmount. Capture this lease before awaiting. */
  readonly signal: AbortSignal;
  readonly update: (value: HeaderExtensionValue) => boolean;
  readonly release: () => void;
}
export interface HeaderExtensionSnapshot extends HeaderExtensionValue {
  readonly owner: number;
}

/** One slot, no stack. Old leases cannot reclaim ownership or clear a newer registration. */
export class HeaderExtensionRegistry {
  constructor(readonly scope = '') {}
  private sequence = 0;
  private owner: AbortController | undefined;
  private value: HeaderExtensionSnapshot | null = null;
  private readonly listeners = new Set<() => void>();
  readonly snapshot = (): HeaderExtensionSnapshot | null => this.value;
  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  private publish(value: HeaderExtensionSnapshot | null): void {
    this.value = value;
    for (const listener of this.listeners) listener();
  }
  register(value: HeaderExtensionValue): HeaderExtensionLease {
    const previous = this.owner;
    const controller = new AbortController();
    const owner = ++this.sequence;
    this.owner = controller;
    this.publish({ ...value, owner });
    previous?.abort();
    return {
      signal: controller.signal,
      update: (next) => {
        if (controller.signal.aborted || this.owner !== controller) return false;
        this.publish({ ...next, owner });
        return true;
      },
      release: () => {
        if (this.owner === controller) {
          this.owner = undefined;
          this.publish(null);
        }
        controller.abort();
      },
    };
  }
  clear(): void {
    const previous = this.owner;
    this.owner = undefined;
    this.publish(null);
    previous?.abort();
  }
}
