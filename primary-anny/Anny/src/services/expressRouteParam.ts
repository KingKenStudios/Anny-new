/**
 * Normalize route parameters from Express 4 and Express 5 path-array typing.
 * Array-valued parameters use the first match; missing values fail closed.
 */
export function normalizeExpressRouteParam(value: string | string[] | undefined): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value[0] ?? '';
  return '';
}
