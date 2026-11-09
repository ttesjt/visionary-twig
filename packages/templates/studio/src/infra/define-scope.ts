/** One immutable declaration shared by server, client and resource-specific planners. */
export function defineScope<
  const S extends {
    id: string;
    text: readonly string[];
    config: readonly string[];
    content: readonly string[];
  },
>(value: S) {
  return Object.freeze({
    ...value,
    text: Object.freeze(value.text),
    config: Object.freeze(value.config),
    content: Object.freeze(value.content),
  });
}
