import { colors, radii, gradientBrand } from "./tokens";

const EXPECTED_COLOR_KEYS = [
  "background", "foreground", "card", "cardForeground", "popover", "popoverForeground",
  "primary", "primaryForeground", "secondary", "secondaryForeground", "muted", "mutedForeground",
  "accent", "accentForeground", "destructive", "destructiveForeground", "border", "input", "ring",
  "brandBlue", "brandIndigo", "brandViolet", "brandPink", "emergency", "emergencyForeground",
  "success", "successForeground", "warning", "warningForeground", "surface",
];

test("every expected color key is present and a valid hex string", () => {
  for (const key of EXPECTED_COLOR_KEYS) {
    expect(colors).toHaveProperty(key);
    expect((colors as Record<string, string>)[key]).toMatch(/^#[0-9a-f]{6}$/);
  }
});

test("background is white and primaryForeground is white (both oklch(1 0 0))", () => {
  expect(colors.background).toBe("#ffffff");
  expect(colors.primaryForeground).toBe("#ffffff");
});

test("radii follow the 16px base scale from styles.css", () => {
  expect(radii).toEqual({ sm: 12, md: 14, lg: 16, xl: 20, xl2: 24, xl3: 28, xl4: 32 });
});

test("gradientBrand has 4 stops matching the brand colors in order", () => {
  expect(gradientBrand).toEqual([colors.brandBlue, colors.brandIndigo, colors.brandViolet, colors.brandPink]);
});
