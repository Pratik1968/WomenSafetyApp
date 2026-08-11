import { render, screen } from "@testing-library/react-native";
import { AdminIncidentsContent } from "./AdminIncidentsScreen";
import { getIncidentAnalytics } from "../data/admin";

jest.mock("../data/admin", () => ({
  getIncidentAnalytics: jest.fn(),
}));

test("content renders analytics KPIs", async () => {
  (getIncidentAnalytics as jest.Mock).mockResolvedValue({
    daily: [{ day: "2026-08-01", incident_count: 3 }],
    by_type: [{ type: "sos", incident_count: 5 }],
    avg_response_seconds: 120,
  });
  await render(<AdminIncidentsContent />);
  expect(await screen.findByText("Incidents by type")).toBeTruthy();
  expect(screen.getByText("Daily trend (30 days)")).toBeTruthy();
});
