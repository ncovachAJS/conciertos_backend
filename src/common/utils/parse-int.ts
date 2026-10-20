/**
 * Convierte un parámetro de query a entero acotado.
 * Si falta, no es un número o es menor que `min`, devuelve `fallback`
 * (en lugar de NaN, que acababa provocando errores 500 en Prisma).
 */
export function parseIntParam(
  value: string | undefined,
  fallback: number,
  { min = 1, max = Number.MAX_SAFE_INTEGER }: { min?: number; max?: number } = {},
): number {
  const n = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(n) || n < min) return fallback;
  return Math.min(n, max);
}
