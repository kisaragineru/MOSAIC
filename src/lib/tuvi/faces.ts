import type { MainStarId } from "./stars";

/**
 * Where each face sits in a type illustration (both people in each picture), so a picture can be
 * made from one in a tap. In the full-size illustration: the circle's centre (0–1 of the width
 * and of the height) and its radius (0–1 of the width). Set by hand on /settings/faces.
 */
export interface FaceCrop {
  cx: number;
  cy: number;
  r: number;
}
export type FaceWho = "m" | "f";

export const TYPE_FACES: Partial<Record<MainStarId, Partial<Record<FaceWho, FaceCrop>>>> = {};

/** The full-size illustration's size (px). */
export const TYPE_IMAGE = { w: 600, h: 1188 } as const;

/** The square of the illustration a crop covers, in its pixels. */
export function faceRect(c: FaceCrop, w: number = TYPE_IMAGE.w, h: number = TYPE_IMAGE.h) {
  const size = 2 * c.r * w;
  return { sx: c.cx * w - size / 2, sy: c.cy * h - size / 2, size };
}
