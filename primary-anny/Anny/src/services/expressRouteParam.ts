/**
 * Normalize Express route parameters to a stable string across Express 4 and 5 typings.
 * Express 5 may type a parameter as string|string[]; single-segment routes use the first
 * array item defensively. Missing or empty values normalize to an empty string.
 */
export function normalizeExpressRouteParam(value: string | string[] | undefined): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value[0] ?? '';
  return '';
}
