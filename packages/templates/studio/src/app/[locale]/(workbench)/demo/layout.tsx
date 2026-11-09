import type { ReactNode } from 'react';
import { DemoLayout } from '../../../../workspace/demo/demo-layout';
export default function ResourceLayout({ children }: { readonly children: ReactNode }) {
  return <DemoLayout>{children}</DemoLayout>;
}
