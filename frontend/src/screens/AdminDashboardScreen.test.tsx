import { render, screen } from "@testing-library/react-native";
import { AdminDashboardScreen, AdminDashboardContent } from "./AdminDashboardScreen";
import { getOverview, getIncidentAnalytics, getHotspots, getHealth } from "../data/admin";

jest.mock("../data/admin", () => ({
  getOverview: jest.fn(),
  getIncidentAnalytics: jest.fn(),
  getHotspots: jest.fn(),
  getHealth: jest.fn(),
}));

beforeEach(() => {
  (getOverview as jest.Mock).mockResolvedValue({
    total_users: 128, active_users_7d: 40, suspended_users: 2, total_incidents: 57,
    active_incidents: 3, avg_response_seconds: 180, total_evidence: 12, storage_bytes_used: 52428800,
  });
  (getIncidentAnalytics as jest.Mock).mockResolvedValue({
    daily: [{ day: "2026-08-01", incident_count: 2 }], by_type: [{ type: "sos", incident_count: 4 }], avg_response_seconds: 180,
  });
  (getHotspots as jest.Mock).mockResolvedValue([{ id: "h1", name: "Alley", lat: 0, lng: 0, risk_level: "high", incident_count: 14, updated_at: "2026-08-01T00:00:00Z" }]);
  (getHealth as jest.Mock).mockResolvedValue([{ service: "emergency-service", metric: "uptime", value: 99.9, unit: "%", recorded_at: "2026-08-01T00:00:00Z" }]);
});

test("content renders KPIs and analytics", async () => {
  await render(<AdminDashboardContent />);
  expect(await screen.findByText("Total users")).toBeTruthy();
  expect(screen.getByText("128")).toBeTruthy();
  expect(screen.getByText("Incident analytics")).toBeTruthy();
});

test("native wrapper shows the web-only notice", async () => {
  // jest runs with Platform.OS !== 'web'
  await render(<AdminDashboardScreen />);
  expect(screen.getByText("Open on the web")).toBeTruthy();
});
