export const VOLUME_MIN = 0;
export const VOLUME_DEFAULT = 1;
export const VOLUME_MAX = 5; // 500%

export function clampVolume(value: number): number {
  if (Number.isNaN(value)) return VOLUME_DEFAULT;
  return Math.min(VOLUME_MAX, Math.max(VOLUME_MIN, value));
}
