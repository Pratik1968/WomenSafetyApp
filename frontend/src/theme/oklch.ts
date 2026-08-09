// @ts-ignore
import { formatHex, converter } from "culori";

const toRgb = converter("rgb");

/** Converts an oklch(L C H) triple (L in [0,1], H in degrees) to a 6-digit hex color. */
export function oklchToHex(l: number, c: number, h: number, alpha = 1): string {
  const rgb = toRgb({ mode: "oklch", l, c, h, alpha });
  const hex = formatHex(rgb);
  return hex;
}
