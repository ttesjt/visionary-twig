import type { Metadata } from 'next';
import { TrackingPageContent } from './_components/event-tracking-page';
export const metadata: Metadata = { robots: { index: false, follow: false } };
export default function TrackingPage() {
  return <TrackingPageContent />;
}
