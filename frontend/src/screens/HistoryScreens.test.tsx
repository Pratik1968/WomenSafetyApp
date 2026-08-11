jest.mock("../services/contactStorageService", () => ({
  contactStorageService: {
    getStoredEmergencyContacts: jest.fn().mockResolvedValue([{ phone: "+919999999999" }]),
  },
}));

import { render, screen, cleanup } from "@testing-library/react-native";
import { HistoryScreen, IncidentDetailScreen } from "./HistoryScreens";

afterEach(() => {
  cleanup();
});

describe("HistoryScreens", () => {
  it("renders HistoryScreen dashboard and list", async () => {
    await render(<HistoryScreen />);
    expect(screen.getAllByText("History")[0]).toBeTruthy();
    expect(screen.getAllByText("History")[0]).toBeTruthy();
    expect(screen.getByText("Monitored walk")).toBeTruthy();
  });

  it("calls onOpen with the tapped incident's id", async () => {
    const onOpen = jest.fn();
    await render(<HistoryScreen onOpen={onOpen} />);

    // MOCK_INCIDENTS' first journey entry has id "mock-1"
    const { fireEvent } = require("@testing-library/react-native");
    fireEvent.press(screen.getByText("Monitored walk"));

    expect(onOpen).toHaveBeenCalledWith("mock-1");
  });

  it("renders empty history state when state is empty", async () => {
    await render(<HistoryScreen state="empty" />);
    expect(screen.getByText("Nothing here yet")).toBeTruthy();
  });

  it("renders IncidentDetailScreen with a real incident's timeline", async () => {
    const { triggerSOS } = require("../services/sosOrchestratorService");
    const incidentId = await triggerSOS("BUTTON");

    await render(<IncidentDetailScreen incidentId={incidentId} />);

    expect(await screen.findByText("Incident details")).toBeTruthy();
    expect(screen.getByText(/SOS — Button trigger/)).toBeTruthy();
    expect(screen.getByText("Contacts notified")).toBeTruthy();
    expect(screen.queryByText("Danger score")).toBeNull();
    expect(screen.queryByText("What Aegis noticed")).toBeNull();
  });

  it("renders a not-found state for an unknown incidentId", async () => {
    await render(<IncidentDetailScreen incidentId="does-not-exist" />);
    expect(await screen.findByText("Incident not found")).toBeTruthy();
  });
});
