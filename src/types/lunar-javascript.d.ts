declare module "lunar-javascript" {
  export const Solar: {
    fromYmd(y: number, m: number, d: number): { getLunar(): { getYear(): number; getMonth(): number; getDay(): number } };
  };
}
