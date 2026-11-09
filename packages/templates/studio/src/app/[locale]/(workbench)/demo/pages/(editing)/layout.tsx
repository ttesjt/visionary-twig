import { Suspense, type ReactNode } from 'react';
import { DemoEditorRoute } from '../../../../../../workspace/demo/pages/editor-route';
import '@frontend/studio/editor.css';
import '@frontend/styles/studio.css';
export default function EditingLayout({ children }: { readonly children: ReactNode }) {
  return (
    <Suspense>
      <DemoEditorRoute>{children}</DemoEditorRoute>
    </Suspense>
  );
}
