import type { PuckComponent, Slot } from '@puckeditor/core';
import type { z } from 'zod';
import type { componentSchemas, SlotComponentName } from '../registry/catalog.js';

export type RuntimeProps = {
  [Name in keyof typeof componentSchemas]: z.output<(typeof componentSchemas)[Name]> &
    (Name extends SlotComponentName ? { content: Slot } : object);
};
export type ComponentRenderers = {
  [Name in keyof RuntimeProps]: PuckComponent<RuntimeProps[Name]>;
};
