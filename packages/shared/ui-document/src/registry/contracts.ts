import type { ContentData } from '../document/types.js';
import type { JsonObject } from '../json/snapshot.js';

export interface PropsIssue {
  readonly path: readonly string[];
  readonly message: string;
}

export type PropsValidator = (props: JsonObject) => readonly PropsIssue[];

export interface SlotContract {
  /** Exact path relative to props. No inference from arbitrary business arrays. */
  readonly path: readonly string[];
  readonly allowedTypes?: readonly string[];
}

export interface NodeContract {
  /** Whether this renderer contributes content besides its registered children.
   * Called only after resolution/validation. Omit to conservatively retain a custom renderer.
   * Return false for a purely structural wrapper; descendants are still inspected.
   */
  readonly hasOwnContent?: (props: JsonObject) => boolean;
  /** URLs actually consumed by this renderer, after props validation and binding resolution. */
  readonly mediaSources?: (props: JsonObject) => readonly string[];
  readonly slots?: readonly SlotContract[];
  /** Receives the full props, including Puck id and declared slot data. */
  readonly validateProps: PropsValidator;
  /** The caller derives this allowlist from its schema. Core also protects IDs and slots. */
  readonly isBindingTarget: (path: readonly string[]) => boolean;
}

export interface ContentRegistry {
  readonly nodes: Readonly<Record<string, NodeContract>>;
  /** Without a root validator, only empty root props are accepted. */
  readonly validateRootProps?: PropsValidator;
  /** Cross-node rules run only after every resolved node has valid props.
   * Paths are relative to data, not the document envelope. */
  readonly validateData?: (data: ContentData) => readonly PropsIssue[];
}
