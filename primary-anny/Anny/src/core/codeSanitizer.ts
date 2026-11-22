/**
 * Compatibility boundary for older callers.
 *
 * Previous versions attempted to rewrite JavaScript/TypeScript declarations with
 * a text parser. That could corrupt valid syntax, especially nested expressions,
 * generics, JSX and object literals. Source code must never be modified by a
 * regex-based repair pass. Real compiler diagnostics and targeted repairs belong
 * in the build/repair pipeline.
 */
export function sanitizeConstDeclarations(code: string): string {
  return code;
}
