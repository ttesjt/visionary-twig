import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { demoIdentitySchema } from '../../../../../../../../workspace/demo/demo-record';
export default async function ResourceLayout({
  children,
  params,
}: {
  readonly children: ReactNode;
  readonly params: Promise<{ readonly pageId: string }>;
}) {
  if (!demoIdentitySchema.safeParse((await params).pageId).success) notFound();
  return children;
}
