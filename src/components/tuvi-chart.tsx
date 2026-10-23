import { BRANCHES, STEMS } from "@/lib/tuvi/canchi";
import type { Chart } from "@/lib/tuvi/engine";
import { HOA_INFO, PALACE_INFO, STAR_INFO } from "@/lib/tuvi/stars";
import type { Locale } from "@/lib/i18n/locales";
import type { Dict } from "@/lib/i18n/messages/en";

// Traditional layout: Tỵ Ngọ Mùi Thân across the top, Dần Sửu Tý Hợi across the bottom.
const CELL: Record<number, string> = {
  5: "col-start-1 row-start-1", 6: "col-start-2 row-start-1", 7: "col-start-3 row-start-1", 8: "col-start-4 row-start-1",
  4: "col-start-1 row-start-2", 9: "col-start-4 row-start-2",
  3: "col-start-1 row-start-3", 10: "col-start-4 row-start-3",
  2: "col-start-1 row-start-4", 1: "col-start-2 row-start-4", 0: "col-start-3 row-start-4", 11: "col-start-4 row-start-4",
};
const HOA_SHORT = { loc: "Lộc", quyen: "Quyền", khoa: "Khoa", ky: "Kỵ" } as const;

export function TuviChart({ chart, t, locale, currentAge }: { chart: Chart; t: Dict; locale: Locale; currentAge: number | null }) {
  return (
    <div className="grid grid-cols-4 grid-rows-4 gap-px overflow-hidden rounded-xl border border-stone-300 bg-stone-300 text-[10px] leading-tight sm:text-xs" data-testid="tuvi-chart">
      {chart.palaces.map((p) => {
        const isMenh = chart.menh === p.branch;
        const now = currentAge !== null && p.daiHan && currentAge >= p.daiHan.from && currentAge <= p.daiHan.to;
        return (
          <div key={p.branch} className={`${CELL[p.branch]} min-h-28 bg-white p-1 ${isMenh ? "ring-2 ring-inset ring-teal-600" : ""} ${now ? "bg-amber-50" : ""}`}>
            <div className="flex justify-between font-semibold text-stone-800">
              <span>{p.palace ? PALACE_INFO[p.palace].vi : "—"}{p.isThan ? " (Thân)" : ""}</span>
              <span className="text-stone-500">{p.stem !== null ? `${STEMS[p.stem]} ` : ""}{BRANCHES[p.branch]}</span>
            </div>
            <ul className="mt-0.5">
              {p.mainStars.map((s) => (
                <li key={s.id} className="font-semibold text-rose-800">
                  {STAR_INFO[s.id].vi}{s.hoa && <span className="ml-0.5 rounded bg-violet-100 px-0.5 text-violet-800">{HOA_SHORT[s.hoa]}</span>}
                </li>
              ))}
            </ul>
            <p className="mt-0.5 text-stone-600">
              {p.auxStars.map((s) => `${STAR_INFO[s.id].vi}${s.hoa ? ` (${HOA_SHORT[s.hoa]})` : ""}`).join(", ")}
            </p>
            <div className="mt-0.5 text-stone-400">
              {[p.trangSinh, p.bacSi, p.thaiTue].filter(Boolean).join(" · ")}
              {chart.tuan.includes(p.branch) && <span className="ml-1 font-semibold text-stone-700">Tuần</span>}
              {chart.triet.includes(p.branch) && <span className="ml-1 font-semibold text-stone-700">Triệt</span>}
            </div>
            {p.daiHan && <div className="mt-0.5 font-semibold text-amber-800">{p.daiHan.from}–{p.daiHan.to}</div>}
          </div>
        );
      })}
      <div className="col-span-2 col-start-2 row-span-2 row-start-2 flex flex-col justify-center gap-0.5 bg-stone-50 p-2 text-center">
        <p className="text-sm font-semibold">{chart.yearPillar.name}</p>
        <p>{t.tuvi.lunarDate}: {chart.lunar.day}/{chart.lunar.month}{chart.lunar.leap ? " (nhuận)" : ""}/{chart.lunar.year}</p>
        <p>{t.tuvi.hour}: {chart.hourBranch !== null ? BRANCHES[chart.hourBranch] : "?"}</p>
        <p>{t.tuvi.napAm}: {chart.napAm.name}</p>
        {chart.cuc && <p>{t.tuvi.cuc}: {chart.cuc.number}</p>}
        {chart.yinYangSex && <p>{t.tuvi.yinYang[chart.yinYangSex]}</p>}
        <p className="text-stone-500">
          Tứ Hóa: {(["loc", "quyen", "khoa", "ky"] as const).map((h) => `${HOA_INFO[h].vi.replace("Hóa ", "")} ${STAR_INFO[chart.hoaTargets[h]].vi}`).join(" · ")}
        </p>
        {locale === "en" && <p className="text-stone-400">Mệnh = Self</p>}
      </div>
    </div>
  );
}
