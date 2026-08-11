import { render, screen } from "@testing-library/react-native";
import { IncidentDetailScreen } from "./IncidentDetailScreen";
import { listIncidents } from "../data/incidents";
import { listEvidence } from "../data/evidence";

jest.mock("../data/incidents", () => ({ listIncidents: jest.fn() }));
jest.mock("../data/evidence", () => ({ listEvidence: jest.fn() }));

test("renders incident header + evidence add action", async () => {
  (listIncidents as jest.Mock).mockResolvedValue([
    { id: "i1", user_id: "u1", type: "sos", status: "active", severity: 78, lat: null, lng: null, address: "100 Ft Road", started_at: "2026-08-01T10:00:00Z", resolved_at: null, response_time_seconds: null },
  ]);
  (listEvidence as jest.Mock).mockResolvedValue([]);
  await render(<IncidentDetailScreen id="i1" />);
  expect(await screen.findByText("100 Ft Road")).toBeTruthy();
  expect(screen.getByText("Add evidence")).toBeTruthy();
});
