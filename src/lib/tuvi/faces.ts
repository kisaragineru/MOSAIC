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

// Set by hand on /settings/faces.
export const TYPE_FACES: Partial<Record<MainStarId, Partial<Record<FaceWho, FaceCrop>>>> = {
  tu_vi: { m: { cx: 0.5, cy: 0.241, r: 0.5 }, f: { cx: 0.5, cy: 0.228, r: 0.5 } },
  thien_co: { m: { cx: 0.5, cy: 0.228, r: 0.5 }, f: { cx: 0.5, cy: 0.215, r: 0.5 } },
  thai_duong: { m: { cx: 0.5, cy: 0.235, r: 0.5 }, f: { cx: 0.5, cy: 0.222, r: 0.5 } },
  vu_khuc: { m: { cx: 0.5, cy: 0.216, r: 0.5 }, f: { cx: 0.5, cy: 0.205, r: 0.5 } },
  thien_dong: { m: { cx: 0.5, cy: 0.271, r: 0.5 }, f: { cx: 0.5, cy: 0.208, r: 0.5 } },
  liem_trinh: { m: { cx: 0.5, cy: 0.228, r: 0.5 }, f: { cx: 0.5, cy: 0.215, r: 0.5 } },
  thien_phu: { m: { cx: 0.5, cy: 0.236, r: 0.5 }, f: { cx: 0.5, cy: 0.223, r: 0.5 } },
  thai_am: { m: { cx: 0.5, cy: 0.248, r: 0.5 }, f: { cx: 0.5, cy: 0.255, r: 0.5 } },
  tham_lang: { m: { cx: 0.5, cy: 0.229, r: 0.5 }, f: { cx: 0.5, cy: 0.241, r: 0.5 } },
  cu_mon: { m: { cx: 0.5, cy: 0.236, r: 0.5 }, f: { cx: 0.5, cy: 0.248, r: 0.5 } },
  thien_tuong: { m: { cx: 0.5, cy: 0.217, r: 0.5 }, f: { cx: 0.5, cy: 0.229, r: 0.5 } },
  thien_luong: { m: { cx: 0.5, cy: 0.221, r: 0.5 }, f: { cx: 0.5, cy: 0.232, r: 0.5 } },
  that_sat: { m: { cx: 0.5, cy: 0.25, r: 0.5 }, f: { cx: 0.5, cy: 0.241, r: 0.5 } },
  pha_quan: { m: { cx: 0.5, cy: 0.237, r: 0.5 }, f: { cx: 0.5, cy: 0.249, r: 0.5 } },
};

/** The square of a picture (w × h px) a crop covers, in its pixels. */
export function faceRect(c: FaceCrop, w: number, h: number) {
  const size = 2 * c.r * w;
  return { sx: c.cx * w - size / 2, sy: c.cy * h - size / 2, size };
}
