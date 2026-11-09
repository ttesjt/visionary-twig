import type { ReactNode } from 'react';
import type { SemanticFieldProps } from './semantic-field.js';
export interface EditorFieldProps extends SemanticFieldProps {
  readonly nodeId: string;
  readonly name: string;
}
/** Client injection. The Puck adapter does not know about catalogs, project files or hosts. */
export type EditorFieldRenderer = (props: EditorFieldProps) => ReactNode;
