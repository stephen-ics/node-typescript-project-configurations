/** A small checked fixture: validate unknown input instead of asserting its type. */
export function readLabel(value: unknown): string {
  if (typeof value !== 'string') {
    throw new TypeError('Expected a string label');
  }
  return value.trim();
}
