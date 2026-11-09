import { connection } from 'next/server';
import { CsrTextEntry } from '../_components/csr-entry';
export default async function CsrTextPage() {
  await connection();
  return <CsrTextEntry />;
}
