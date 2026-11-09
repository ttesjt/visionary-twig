'use client';
import { createContext, useContext, type ReactNode } from 'react';
/** Instantiate once in an app module. No app defaults or generated imports here. */
export function createAppConfigContext<T>() {
  const Context = createContext<T | undefined>(undefined);
  Context.displayName = 'AppConfig';
  function AppConfigProvider({
    value,
    children,
  }: {
    readonly value: T;
    readonly children: ReactNode;
  }) {
    return <Context.Provider value={value}>{children}</Context.Provider>;
  }
  function useAppConfig(): T {
    const value = useContext(Context);
    if (value === undefined)
      throw new Error('Missing AppConfigProvider in this application scope.');
    return value;
  }
  return { AppConfigProvider, useAppConfig };
}
