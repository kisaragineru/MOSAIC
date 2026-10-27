import type { MainStarId } from "./stars";

/**
 * Each type's colours, taken from its illustration: a deep base, two soft lights, the stars,
 * the halo round the picture and the accent for the number and the star's name.
 */
export const TYPE_THEME: Record<MainStarId, { bg: string; glow1: string; glow2: string; star: string; halo: string; accent: string }> = {
  tu_vi: { bg: "bg-[#0e1430]", glow1: "bg-[#2b3f8f]", glow2: "bg-[#a8843c]", star: "bg-amber-100", halo: "shadow-[0_0_48px_rgba(214,182,110,0.35)]", accent: "text-amber-200" },
  thien_co: { bg: "bg-[#0b1d1c]", glow1: "bg-[#1f6b62]", glow2: "bg-[#8a7a3e]", star: "bg-emerald-100", halo: "shadow-[0_0_48px_rgba(120,200,180,0.3)]", accent: "text-emerald-200" },
  thai_duong: { bg: "bg-[#24120a]", glow1: "bg-[#c2621f]", glow2: "bg-[#e0a33a]", star: "bg-amber-100", halo: "shadow-[0_0_48px_rgba(255,190,110,0.38)]", accent: "text-amber-200" },
  vu_khuc: { bg: "bg-[#0f121b]", glow1: "bg-[#2c3a5c]", glow2: "bg-[#7d6a3c]", star: "bg-sky-100", halo: "shadow-[0_0_48px_rgba(170,190,230,0.28)]", accent: "text-amber-100" },
  thien_dong: { bg: "bg-[#0f1c17]", glow1: "bg-[#4f8a6e]", glow2: "bg-[#8cc7b4]", star: "bg-emerald-50", halo: "shadow-[0_0_48px_rgba(170,225,200,0.32)]", accent: "text-emerald-100" },
  liem_trinh: { bg: "bg-[#1e0b10]", glow1: "bg-[#8e2235]", glow2: "bg-[#b0703a]", star: "bg-rose-100", halo: "shadow-[0_0_48px_rgba(230,120,130,0.3)]", accent: "text-rose-200" },
  thien_phu: { bg: "bg-[#16170b]", glow1: "bg-[#5e6a2c]", glow2: "bg-[#a88a3a]", star: "bg-amber-50", halo: "shadow-[0_0_48px_rgba(214,190,120,0.32)]", accent: "text-amber-200" },
  thai_am: { bg: "bg-[#0e1024]", glow1: "bg-[#3d4a8c]", glow2: "bg-[#9a8fd0]", star: "bg-indigo-50", halo: "shadow-[0_0_48px_rgba(200,200,255,0.35)]", accent: "text-indigo-100" },
  tham_lang: { bg: "bg-[#0d1a1d]", glow1: "bg-[#1f7480]", glow2: "bg-[#d0707c]", star: "bg-rose-50", halo: "shadow-[0_0_48px_rgba(240,160,170,0.32)]", accent: "text-rose-200" },
  cu_mon: { bg: "bg-[#120e1f]", glow1: "bg-[#40306e]", glow2: "bg-[#6f5a9e]", star: "bg-violet-100", halo: "shadow-[0_0_48px_rgba(190,170,240,0.3)]", accent: "text-violet-200" },
  thien_tuong: { bg: "bg-[#0b1526]", glow1: "bg-[#24527e]", glow2: "bg-[#a48a48]", star: "bg-sky-100", halo: "shadow-[0_0_48px_rgba(150,190,235,0.32)]", accent: "text-sky-200" },
  thien_luong: { bg: "bg-[#0d1910]", glow1: "bg-[#3e6b35]", glow2: "bg-[#8a9a52]", star: "bg-lime-50", halo: "shadow-[0_0_48px_rgba(190,220,150,0.3)]", accent: "text-lime-100" },
  that_sat: { bg: "bg-[#170a0c]", glow1: "bg-[#7a1c22]", glow2: "bg-[#3a2a33]", star: "bg-rose-100", halo: "shadow-[0_0_48px_rgba(220,110,110,0.3)]", accent: "text-rose-200" },
  pha_quan: { bg: "bg-[#130d24]", glow1: "bg-[#5b3aa0]", glow2: "bg-[#9a7fe0]", star: "bg-violet-50", halo: "shadow-[0_0_48px_rgba(200,170,255,0.38)]", accent: "text-violet-200" },
};
