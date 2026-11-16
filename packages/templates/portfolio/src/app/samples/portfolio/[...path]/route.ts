import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { projectMediaKeySchema } from '@frontend/portfolio/identity';
import { PROJECT_PUBLIC_DIRECTORY } from '../../../../site/project-data';

export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const key = projectMediaKeySchema.safeParse('samples/portfolio/' + path.join('/'));
  if (!key.success || !/\.(?:jpg|jpeg)$/iu.test(key.data))
    return new Response(null, { status: 404 });
  try {
    const bytes = await readFile(resolve(PROJECT_PUBLIC_DIRECTORY, key.data));
    return new Response(bytes, { headers: { 'Content-Type': 'image/jpeg' } });
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT')
      return new Response(null, { status: 404 });
    throw error;
  }
}
