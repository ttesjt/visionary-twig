/** One page registration owns its document and optional, independently loaded text. */
export interface ProjectFilePageDefinition {
  readonly slug: string;
  readonly namespace: `project-${string}`;
  readonly filename: string;
  /** Omit when the document uses literals or text already provided by the Layout. */
  readonly textNamespaces?: readonly string[];
}
