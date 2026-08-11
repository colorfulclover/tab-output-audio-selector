/**
 * Detect Chrome's "no receiver" error when an Offscreen Document is gone.
 */
export function isReceivingEndMissing(error: unknown): boolean {
  const text = error instanceof Error ? error.message : String(error);
  return text.includes('Receiving end does not exist');
}

/**
 * Send a message once; on missing receiver, recreate the target and retry once.
 */
export async function sendWithOffscreenRetry<T>(
  send: () => Promise<T>,
  recreate: () => Promise<void>,
): Promise<T> {
  try {
    return await send();
  } catch (error) {
    if (!isReceivingEndMissing(error)) {
      throw error;
    }
    await recreate();
    return await send();
  }
}
