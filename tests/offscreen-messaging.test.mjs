import assert from 'node:assert/strict';
import { test } from 'vitest';

import {
  isReceivingEndMissing,
  sendWithOffscreenRetry,
} from '../src/utils/offscreen-messaging.ts';

test('detects Chrome missing-receiver errors', () => {
  assert.equal(
    isReceivingEndMissing(new Error('Could not establish connection. Receiving end does not exist.')),
    true,
  );
  assert.equal(isReceivingEndMissing(new Error('getUserMedia failed')), false);
});

test('retries once after recreating the offscreen document', async () => {
  const calls = { send: 0, recreate: 0 };

  const result = await sendWithOffscreenRetry(
    async () => {
      calls.send += 1;
      if (calls.send === 1) {
        throw new Error('Receiving end does not exist.');
      }
      return { status: 'active' };
    },
    async () => {
      calls.recreate += 1;
    },
  );

  assert.deepEqual(result, { status: 'active' });
  assert.equal(calls.send, 2);
  assert.equal(calls.recreate, 1);
});

test('does not recreate for unrelated send failures', async () => {
  const calls = { recreate: 0 };

  await assert.rejects(
    () => sendWithOffscreenRetry(
      async () => {
        throw new Error('permission denied');
      },
      async () => {
        calls.recreate += 1;
      },
    ),
    /permission denied/,
  );
  assert.equal(calls.recreate, 0);
});
