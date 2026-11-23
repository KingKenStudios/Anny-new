import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeEmbeddingVector } from './aiProviderPlatform';

test('embedding normalization accepts genuine finite vectors', () => {
  assert.deepEqual(normalizeEmbeddingVector([0.1, -0.25, 0.9], 'test provider'), [0.1, -0.25, 0.9]);
});

test('embedding normalization rejects missing, empty, non-numeric and non-finite vectors', () => {
  for (const value of [undefined, null, [], '0.1,0.2', [0.1, '0.2'], [0.1, Number.NaN], [Number.POSITIVE_INFINITY]]) {
    assert.throws(
      () => normalizeEmbeddingVector(value, 'test provider'),
      /INVALID_EMBEDDING_VECTOR/
    );
  }
});
