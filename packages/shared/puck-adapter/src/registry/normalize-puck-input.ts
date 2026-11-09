import { z } from 'zod';
const inputSchema = z
  .object({
    root: z.object({ props: z.record(z.string(), z.json()).optional() }).passthrough(),
    content: z.array(z.json()),
    zones: z.record(z.string(), z.array(z.json())).optional(),
  })
  .passthrough();
/** Native Puck root bookkeeping is normalized; unsupported legacy zones remain explicit errors. */
export function normalizePuckInput(input: unknown): unknown {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return input;
  const data = parsed.data;
  const props = Object.fromEntries(
    Object.entries(data.root.props ?? {}).filter(
      ([key, value]) =>
        !(key === 'id' && (value === 'root' || value === 'puck-root')) &&
        !(key === 'title' && value === '')
    )
  );
  const { zones, ...native } = data;
  return {
    ...native,
    root: { ...data.root, props },
    ...(zones && Object.keys(zones).length ? { zones } : {}),
  };
}
