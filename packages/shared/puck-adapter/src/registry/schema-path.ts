import { z } from 'zod';

/** Path approval comes from the same schemas as props validation, including unions and arrays. */
export function schemaAllowsPath(schema: z.ZodType, path: readonly string[]): boolean {
  if (path.length === 0) return true;
  if (
    schema instanceof z.ZodOptional ||
    schema instanceof z.ZodNullable ||
    schema instanceof z.ZodReadonly ||
    schema instanceof z.ZodDefault
  ) {
    const inner: unknown = schema.unwrap();
    return inner instanceof z.ZodType && schemaAllowsPath(inner, path);
  }
  if (schema instanceof z.ZodLazy) {
    const inner: unknown = schema.unwrap();
    return inner instanceof z.ZodType && schemaAllowsPath(inner, path);
  }
  const [key, ...rest] = path;
  if (key === undefined) return false;
  if (schema instanceof z.ZodObject) {
    const shape: Readonly<Record<string, unknown>> = schema.shape;
    const child = Object.hasOwn(shape, key) ? shape[key] : undefined;
    return child instanceof z.ZodType && schemaAllowsPath(child, rest);
  }
  if (schema instanceof z.ZodRecord) {
    const value: unknown = schema.valueType;
    const keyType: unknown = schema.keyType;
    return (
      keyType instanceof z.ZodType &&
      keyType.safeParse(key).success &&
      value instanceof z.ZodType &&
      schemaAllowsPath(value, rest)
    );
  }
  if (schema instanceof z.ZodArray) {
    const element: unknown = schema.element;
    return (
      /^(0|[1-9]\d*)$/.test(key) && element instanceof z.ZodType && schemaAllowsPath(element, rest)
    );
  }
  if (schema instanceof z.ZodUnion) {
    return schema.options.some(
      (option: unknown) => option instanceof z.ZodType && schemaAllowsPath(option, path)
    );
  }
  return false;
}
