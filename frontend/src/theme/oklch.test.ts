import { oklchToHex } from "./oklch";

test("converts achromatic white (oklch 1 0 0) to #ffffff", () => {
  expect(oklchToHex(1, 0, 0)).toBe("#ffffff");
});

test("converts achromatic black (oklch 0 0 0) to #000000", () => {
  expect(oklchToHex(0, 0, 0)).toBe("#000000");
});

test("always returns a 6-digit lowercase hex string", () => {
  const result = oklchToHex(0.5854, 0.2041, 277.12);
  expect(result).toMatch(/^#[0-9a-f]{6}$/);
});
