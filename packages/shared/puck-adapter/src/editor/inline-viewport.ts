import type { UiState } from '@puckeditor/core';

/** With iframe disabled the canvas is full-width. A numeric virtual viewport
 * incorrectly auto-zooms to zero while a retained editor is hidden, then divides
 * zero height by zero zoom. Match the actual inline layout instead.
 */
export const INLINE_EDITOR_UI: Pick<UiState, 'viewports'> = {
  viewports: {
    current: { width: '100%', height: 'auto' },
    controlsVisible: false,
    options: [],
  },
};
