import type { MainStarId } from "./stars";

/**
 * Where each face sits in a type illustration (both people in each picture), so a picture can be
 * made from one in a tap. In the full-size illustration: the circle's centre (0–1 of the width
 * and of the height) and its radius (0–1 of the width). Set on /settings/faces.
 */
export interface FaceCrop {
  cx: number;
  cy: number;
  r: number;
}
export type FaceWho = "m" | "f";

// Set by hand on /settings/faces.
export const TYPE_FACES: Partial<Record<MainStarId, Partial<Record<FaceWho, FaceCrop>>>> = {
  tu_vi: { m: { cx: 0.361, cy: 0.182, r: 0.355 }, f: { cx: 0.502, cy: 0.704, r: 0.46 } },
  thien_co: { m: { cx: 0.533, cy: 0.201, r: 0.4 }, f: { cx: 0.574, cy: 0.679, r: 0.425 } },
  thai_duong: { m: { cx: 0.486, cy: 0.209, r: 0.415 }, f: { cx: 0.515, cy: 0.712, r: 0.47 } },
  vu_khuc: { m: { cx: 0.487, cy: 0.191, r: 0.38 }, f: { cx: 0.566, cy: 0.693, r: 0.435 } },
  thien_dong: { m: { cx: 0.554, cy: 0.21, r: 0.415 }, f: { cx: 0.5, cy: 0.717, r: 0.415 } },
  liem_trinh: { m: { cx: 0.433, cy: 0.176, r: 0.345 }, f: { cx: 0.51, cy: 0.706, r: 0.45 } },
  thien_phu: { m: { cx: 0.497, cy: 0.218, r: 0.43 }, f: { cx: 0.503, cy: 0.713, r: 0.43 } },
  thai_am: { m: { cx: 0.349, cy: 0.177, r: 0.345 }, f: { cx: 0.518, cy: 0.58, r: 0.43 } },
  tham_lang: { m: { cx: 0.54, cy: 0.211, r: 0.415 }, f: { cx: 0.538, cy: 0.621, r: 0.45 } },
  cu_mon: { m: { cx: 0.454, cy: 0.207, r: 0.405 }, f: { cx: 0.507, cy: 0.598, r: 0.475 } },
  thien_tuong: { m: { cx: 0.391, cy: 0.19, r: 0.37 }, f: { cx: 0.564, cy: 0.563, r: 0.43 } },
  thien_luong: { m: { cx: 0.44, cy: 0.219, r: 0.435 }, f: { cx: 0.505, cy: 0.567, r: 0.48 } },
  that_sat: { m: { cx: 0.342, cy: 0.177, r: 0.335 }, f: { cx: 0.604, cy: 0.581, r: 0.39 } },
  pha_quan: { m: { cx: 0.516, cy: 0.184, r: 0.355 }, f: { cx: 0.486, cy: 0.568, r: 0.375 } },
};

/** The full-size illustration's size (px). */
export const TYPE_IMAGE = { w: 600, h: 1188 } as const;

/** The square of the illustration a crop covers, in its pixels. */
export function faceRect(c: FaceCrop, w: number = TYPE_IMAGE.w, h: number = TYPE_IMAGE.h) {
  const size = 2 * c.r * w;
  return { sx: c.cx * w - size / 2, sy: c.cy * h - size / 2, size };
}
