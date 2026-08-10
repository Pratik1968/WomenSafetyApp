import { render, screen } from "@testing-library/react-native";
import { RootStack } from "./RootStack";

// Cut the Supabase data layer so the stack renders without network/native deps.
jest.mock("../data/evidence", () => ({
  listEvidence: jest.fn().mockResolvedValue([]),
  getEvidence: jest.fn(),
  getAccessLog: jest.fn(),
  deleteEvidence: jest.fn(),
  uploadEvidenceFile: jest.fn(),
}));
jest.mock("../data/incidents", () => ({
  listIncidents: jest.fn().mockResolvedValue([]),
  createIncident: jest.fn(),
}));
jest.mock("../data/admin", () => ({
  getOverview: jest.fn(),
  getIncidentAnalytics: jest.fn(),
  getHotspots: jest.fn(),
  getHealth: jest.fn(),
  listUsers: jest.fn(),
  updateUser: jest.fn(),
}));

test("renders the Splash placeholder as the initial route", async () => {
  await render(<RootStack />);
  expect(await screen.findByText("Get started")).toBeTruthy();
});
