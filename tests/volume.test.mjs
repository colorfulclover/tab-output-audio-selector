import assert from 'node:assert/strict';
import { test } from 'vitest';

import {
  VOLUME_DEFAULT,
  VOLUME_MAX,
  VOLUME_MIN,
  clampVolume,
} from '../src/utils/volume.ts';

test('clampVolume keeps values within 0 to 5', () => {
  assert.equal(clampVolume(-1), VOLUME_MIN);
  assert.equal(clampVolume(0), 0);
  assert.equal(clampVolume(VOLUME_DEFAULT), VOLUME_DEFAULT);
  assert.equal(clampVolume(2.5), 2.5);
  assert.equal(clampVolume(VOLUME_MAX), VOLUME_MAX);
  assert.equal(clampVolume(10), VOLUME_MAX);
  assert.equal(clampVolume(Number.NaN), VOLUME_DEFAULT);
});
