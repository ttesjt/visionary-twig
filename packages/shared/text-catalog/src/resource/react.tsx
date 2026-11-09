'use client';
import { createContext, useContext, type ReactNode } from 'react';
import type { TextReadView } from './state/text-view.js';
import type { TextContractsInput } from './contracts/types.js';
/** The owner supplies an already prepared, locale-bound view. No loading or effects. */
export function createTextResourceContext<R extends TextContractsInput>() {
  const Context = createContext<TextReadView<R> | undefined>(undefined);
  Context.displayName = 'TextResource';
  function TextProvider({
    value,
    children,
  }: {
    readonly value: TextReadView<R>;
    readonly children: ReactNode;
  }) {
    return <Context.Provider value={value}>{children}</Context.Provider>;
  }
  function useText(): TextReadView<R> {
    const value = useContext(Context);
    if (!value) throw new Error('Missing TextProvider.');
    return value;
  }
  return { TextProvider, useText };
}
