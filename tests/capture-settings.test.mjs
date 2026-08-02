import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'vitest';

import {
  hasNonDefaultAudioSettings,
  loadCaptureSettings,
} from '../src/utils/capture-settings.ts';

test('offscreen documents use the USER_MEDIA lifecycle reason', async () => {
  const source = await readFile(
    new URL('../src/entrypoints/background.ts', import.meta.url),
    'utf8',
  );

  assert.match(source, /chrome\.offscreen\.Reason\.USER_MEDIA/);
  assert.doesNotMatch(source, /chrome\.offscreen\.Reason\.AUDIO_PLAYBACK/);
});

test('capture startup restores the settings saved for the tab URL', async () => {
  let requestedUrl;
  const settings = await loadCaptureSettings(42, {
    getTab: async (tabId) => {
      assert.equal(tabId, 42);
      return { url: 'https://example.com/watch?v=1' };
    },
    getAudioSettings: async (url) => {
      requestedUrl = url;
      return {
        deviceId: null,
        volume: 0.35,
        muted: true,
        timestamp: 123,
      };
    },
  });

  assert.equal(requestedUrl, 'https://example.com/watch?v=1');
  assert.deepEqual(settings, {
    deviceId: 'default',
    volume: 0.35,
    muted: true,
  });
});

test('capture startup has no settings when the tab URL is unavailable', async () => {
  const settings = await loadCaptureSettings(42, {
    getTab: async () => ({}),
    getAudioSettings: async () => {
      throw new Error('storage should not be read without a URL');
    },
  });

  assert.equal(settings, undefined);
});

test('only non-default saved settings require capture restoration', () => {
  assert.equal(hasNonDefaultAudioSettings(null), false);
  assert.equal(hasNonDefaultAudioSettings({
    deviceId: null,
    volume: 1,
    muted: false,
  }), false);
  assert.equal(hasNonDefaultAudioSettings({
    deviceId: 'default',
    volume: 1,
    muted: false,
  }), false);
  assert.equal(hasNonDefaultAudioSettings({
    deviceId: 'sink-a',
    volume: 1,
    muted: false,
  }), true);
  assert.equal(hasNonDefaultAudioSettings({
    deviceId: 'default',
    volume: 0.5,
    muted: false,
  }), true);
  assert.equal(hasNonDefaultAudioSettings({
    deviceId: 'default',
    volume: 1,
    muted: true,
  }), true);
});
