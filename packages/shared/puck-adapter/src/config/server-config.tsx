import type { ReactNode } from 'react';
import type { Config, SlotField } from '@puckeditor/core';
import {
  DOCUMENT_COMPONENT_NAMES,
  hasDocumentContentSlot,
  documentSlotAllowedTypes,
  SLOT_PROP,
} from '../registry/catalog.js';
import { componentRenderers } from './renderers.js';

/** Keep slot fields: Puck needs them to convert native arrays into slot components. */
const slotField = (name: string): SlotField => ({
  type: 'slot',
  allow: [...documentSlotAllowedTypes(name)],
});
export const serverConfig: Config = {
  root: { fields: {}, render: ({ children }: { children: ReactNode }) => <>{children}</> },
  components: Object.fromEntries(
    DOCUMENT_COMPONENT_NAMES.map((name) => [
      name,
      {
        render: componentRenderers[name],
        ...(hasDocumentContentSlot(name) ? { fields: { [SLOT_PROP]: slotField(name) } } : {}),
      },
    ])
  ),
};
