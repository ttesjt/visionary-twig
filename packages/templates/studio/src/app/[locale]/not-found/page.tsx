import { notFound } from 'next/navigation';
/** A real route keeps Proxy's invalid-locale response in the normal 404 pipeline. */
export default function NotFoundPage() {
  notFound();
}
