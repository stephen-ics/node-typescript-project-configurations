import { expect, it } from 'vitest';
import { readLabel } from './example.js';

it('accepts strings after validation and rejects non-string input', () => {
  expect(readLabel(' example ')).toBe('example');
  expect(() => readLabel(null)).toThrow(TypeError);
});
