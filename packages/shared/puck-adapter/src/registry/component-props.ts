import type { JsonObject } from '@frontend/ui-document';
/** Remove runtime bookkeeping before validating/inspecting public component props. */
export function componentPublicProps(props: JsonObject): JsonObject {
  return Object.fromEntries(
    Object.entries(props).filter(([key]) => key !== 'id' && key !== 'content')
  );
}
