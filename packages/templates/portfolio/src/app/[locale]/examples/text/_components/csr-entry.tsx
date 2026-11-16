'use client';
import dynamic from 'next/dynamic';
import { RESOURCE_STARTUP_TEXT } from '../../../../../infra/resources';
const ClientText = dynamic(() => import('./text-demo-page').then((module) => module.TextDemoPage), {
  ssr: false,
  loading: () => <p role="status">{RESOURCE_STARTUP_TEXT.pending}</p>,
});
export function CsrTextEntry() {
  return <ClientText mode="CSR" />;
}
