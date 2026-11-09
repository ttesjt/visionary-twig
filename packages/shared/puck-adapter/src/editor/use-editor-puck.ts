import { createUsePuck, type PuckApi } from '@puckeditor/core';

/** Subscribe only to the native state required by each control. */
export const useEditorPuck: <T>(selector: (state: PuckApi) => T) => T = createUsePuck();
