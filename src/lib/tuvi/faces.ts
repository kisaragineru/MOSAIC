import type { MainStarId } from "./stars";

/**
 * Where each face sits in each person's picture (every type has a man and a woman, each in a
 * picture of their own: personImage), so a profile picture can be made from one in a tap: the
 * circle's centre (0–1 of the width and of the height) and its radius (0–1 of the width).
 * Set on /settings/faces.
 */
export interface FaceCrop {
  cx: number;
  cy: number;
  r: number;
}
export type FaceWho = "m" | "f";

/** One person of a type, alone (cut from the type sheets, enlarged). */
export const personImage = (id: string, who: FaceWho) => `/tuvi-types/people/${id}-${who}.webp`;

// A first guess (near the top); set by hand on /settings/faces.
export const TYPE_FACES: Partial<Record<MainStarId, Partial<Record<FaceWho, FaceCrop>>>> = {
  tu_vi: { m: { cx: 0.5, cy: 0.15, r: 0.3 }, f: { cx: 0.5, cy: 0.15, r: 0.3 } },
  thien_co: { m: { cx: 0.5, cy: 0.15, r: 0.3 }, f: { cx: 0.5, cy: 0.15, r: 0.3 } },
  thai_duong: { m: { cx: 0.5, cy: 0.15, r: 0.3 }, f: { cx: 0.5, cy: 0.15, r: 0.3 } },
  vu_khuc: { m: { cx: 0.5, cy: 0.15, r: 0.3 }, f: { cx: 0.5, cy: 0.15, r: 0.3 } },
  thien_dong: { m: { cx: 0.5, cy: 0.15, r: 0.3 }, f: { cx: 0.5, cy: 0.15, r: 0.3 } },
  liem_trinh: { m: { cx: 0.5, cy: 0.15, r: 0.3 }, f: { cx: 0.5, cy: 0.15, r: 0.3 } },
  thien_phu: { m: { cx: 0.5, cy: 0.15, r: 0.3 }, f: { cx: 0.5, cy: 0.15, r: 0.3 } },
  thai_am: { m: { cx: 0.5, cy: 0.15, r: 0.3 }, f: { cx: 0.5, cy: 0.15, r: 0.3 } },
  tham_lang: { m: { cx: 0.5, cy: 0.15, r: 0.3 }, f: { cx: 0.5, cy: 0.15, r: 0.3 } },
  cu_mon: { m: { cx: 0.5, cy: 0.15, r: 0.3 }, f: { cx: 0.5, cy: 0.15, r: 0.3 } },
  thien_tuong: { m: { cx: 0.5, cy: 0.15, r: 0.3 }, f: { cx: 0.5, cy: 0.15, r: 0.3 } },
  thien_luong: { m: { cx: 0.5, cy: 0.15, r: 0.3 }, f: { cx: 0.5, cy: 0.15, r: 0.3 } },
  that_sat: { m: { cx: 0.5, cy: 0.15, r: 0.3 }, f: { cx: 0.5, cy: 0.15, r: 0.3 } },
  pha_quan: { m: { cx: 0.5, cy: 0.15, r: 0.3 }, f: { cx: 0.5, cy: 0.15, r: 0.3 } },
};

/** The square of a picture (w × h px) a crop covers, in its pixels. */
export function faceRect(c: FaceCrop, w: number, h: number) {
  const size = 2 * c.r * w;
  return { sx: c.cx * w - size / 2, sy: c.cy * h - size / 2, size };
}
