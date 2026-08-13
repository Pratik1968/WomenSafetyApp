import { render, screen } from "@testing-library/react-native";
import { IncidentsScreen } from "./IncidentsScreen";
import { listIncidents } from "../data/incidents";

jest.mock("../data/incidents", () => ({ listIncidents: jest.fn() }));

const fixture = [
  { id: "i1", user_id: "u1", type: "sos", status: "active", severity: 78, lat: null, lng: null, address: "100 Ft Road", started_at: "2026-08-01T10:00:00Z", resolved_at: null, response_time_seconds: null },
];

test("lists incidents after loading", async () => {
  (listIncidents as jest.Mock).mockResolvedValue(fixture);
  await render(<IncidentsScreen />);
  expect(await screen.findByText("100 Ft Road")).toBeTruthy();
  expect(screen.getByText("Active")).toBeTruthy();
});

test("shows empty state when there are no incidents", async () => {
  (listIncidents as jest.Mock).mockResolvedValue([]);
  await render(<IncidentsScreen />);
  expect(await screen.findByText("No incidents yet")).toBeTruthy();
});
