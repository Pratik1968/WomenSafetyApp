import { Platform } from "react-native";
import { render, screen } from "@testing-library/react-native";

// Force the web branch before importing RootStack.
(Platform as { OS: string }).OS = "web";

jest.mock("../data/evidence", () => ({ listEvidence: jest.fn(), getEvidence: jest.fn(), getAccessLog: jest.fn(), deleteEvidence: jest.fn(), uploadEvidenceFile: jest.fn() }));
jest.mock("../data/incidents", () => ({ listIncidents: jest.fn(), createIncident: jest.fn() }));
jest.mock("../data/admin", () => ({
  getOverview: jest.fn().mockResolvedValue(null),
  getIncidentAnalytics: jest.fn().mockResolvedValue({ daily: [], by_type: [], avg_response_seconds: 0 }),
  getHotspots: jest.fn().mockResolvedValue([]),
  getHealth: jest.fn().mockResolvedValue([]),
  listUsers: jest.fn(), updateUser: jest.fn(),
}));
jest.mock("../data/supabase", () => ({ ensureSession: jest.fn().mockResolvedValue(undefined), supabase: {}, isSupabaseConfigured: false }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { RootStack } = require("./RootStack");

// The post-sign-in navigator isn't asserted here: react-navigation's web renderer calls
// getBoundingClientRect on real DOM nodes, which the native jest preset doesn't provide. This
// covers the requirement that matters — on web the app opens on the admin auth gate, and none of
// the mobile safety routes are reachable.
test("on web, the app opens on the admin sign-in gate — not the mobile app", async () => {
  await render(<RootStack />);
  // The gate first restores any persisted session (async) before deciding what to show.
  expect(await screen.findByText("Admin console")).toBeTruthy();
  expect(screen.getByText("Sign in")).toBeTruthy();
  expect(screen.queryByText("Get started")).toBeNull(); // mobile splash is never mounted on web
});
