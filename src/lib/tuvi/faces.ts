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

// A first pass, placed from the pictures; refine on /settings/faces and paste the result here.
export const TYPE_FACES: Partial<Record<MainStarId, Partial<Record<FaceWho, FaceCrop>>>> = {
  tu_vi: { m: { cx: 0.38, cy: 0.096, r: 0.19 }, f: { cx: 0.45, cy: 0.63, r: 0.19 } },
  thien_co: { m: { cx: 0.51, cy: 0.121, r: 0.19 }, f: { cx: 0.58, cy: 0.671, r: 0.19 } },
  thai_duong: { m: { cx: 0.46, cy: 0.096, r: 0.19 }, f: { cx: 0.48, cy: 0.661, r: 0.19 } },
  vu_khuc: { m: { cx: 0.38, cy: 0.096, r: 0.19 }, f: { cx: 0.46, cy: 0.661, r: 0.19 } },
  thien_dong: { m: { cx: 0.51, cy: 0.096, r: 0.19 }, f: { cx: 0.46, cy: 0.635, r: 0.19 } },
  liem_trinh: { m: { cx: 0.46, cy: 0.096, r: 0.19 }, f: { cx: 0.49, cy: 0.641, r: 0.19 } },
  thien_phu: { m: { cx: 0.45, cy: 0.121, r: 0.19 }, f: { cx: 0.45, cy: 0.651, r: 0.19 } },
  thai_am: { m: { cx: 0.44, cy: 0.14, r: 0.19 }, f: { cx: 0.38, cy: 0.54, r: 0.19 } },
  tham_lang: { m: { cx: 0.5, cy: 0.121, r: 0.19 }, f: { cx: 0.45, cy: 0.555, r: 0.19 } },
  cu_mon: { m: { cx: 0.43, cy: 0.121, r: 0.19 }, f: { cx: 0.52, cy: 0.535, r: 0.19 } },
  thien_tuong: { m: { cx: 0.41, cy: 0.115, r: 0.19 }, f: { cx: 0.53, cy: 0.52, r: 0.19 } },
  thien_luong: { m: { cx: 0.44, cy: 0.131, r: 0.19 }, f: { cx: 0.52, cy: 0.525, r: 0.19 } },
  that_sat: { m: { cx: 0.28, cy: 0.108, r: 0.19 }, f: { cx: 0.62, cy: 0.515, r: 0.19 } },
  pha_quan: { m: { cx: 0.49, cy: 0.137, r: 0.19 }, f: { cx: 0.46, cy: 0.52, r: 0.19 } },
};

/** The full-size illustration's size (px). */
export const TYPE_IMAGE = { w: 600, h: 1188 } as const;

/** The square of the illustration a crop covers, in its pixels. */
export function faceRect(c: FaceCrop, w: number = TYPE_IMAGE.w, h: number = TYPE_IMAGE.h) {
  const size = 2 * c.r * w;
  return { sx: c.cx * w - size / 2, sy: c.cy * h - size / 2, size };
}
