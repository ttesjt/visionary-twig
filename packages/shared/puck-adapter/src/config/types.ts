import type { PuckComponent, Slot } from '@puckeditor/core';
import type { z } from 'zod';
import type {
  componentSchemas,
  SlotComponentName,
  documentComponentSchemas,
  DocumentSlotComponentName,
} from '../registry/catalog.js';

export type RuntimeProps = {
  [Name in keyof typeof componentSchemas]: z.output<(typeof componentSchemas)[Name]> &
    (Name extends SlotComponentName ? { content: Slot } : object);
};
type DocumentRuntimeProps = {
  [Name in keyof typeof documentComponentSchemas]: z.output<
    (typeof documentComponentSchemas)[Name]
  > &
    (Name extends DocumentSlotComponentName ? { content: Slot } : object);
};
export type ComponentRenderers = {
  [Name in keyof DocumentRuntimeProps]: PuckComponent<DocumentRuntimeProps[Name]>;
};
