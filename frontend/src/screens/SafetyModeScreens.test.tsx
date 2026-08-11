import { render, screen, cleanup } from "@testing-library/react-native";
import {
  JourneyDestinationScreen,
  JourneyTransportScreen,
  JourneyContactsScreen,
  JourneyConsentScreen,
  JourneyActiveScreen,
  JourneySummaryScreen,
} from "./SafetyModeScreens";

jest.mock("../hooks/useEmergencyContacts", () => ({
  useEmergencyContacts: () => ({
    contacts: [{ id: "c1", name: "Amma", relation: "MOTHER", phone: "9999999999", initials: "AM" }],
  }),
}));

afterEach(() => {
  cleanup();
});

describe("SafetyModeScreens", () => {
  it("renders JourneyDestinationScreen correctly", async () => {
    await render(<JourneyDestinationScreen />);
    expect(screen.getByText("Where are you headed?")).toBeTruthy();
    expect(screen.getByText("Home")).toBeTruthy();
  });

  it("renders JourneyTransportScreen and handles selection", async () => {
    await render(<JourneyTransportScreen />);
    expect(screen.getByText("How are you travelling?")).toBeTruthy();
    expect(screen.getByText("Cab / Auto")).toBeTruthy();
  });

  it("renders JourneyContactsScreen correctly", async () => {
    await render(<JourneyContactsScreen />);
    expect(screen.getByText("Who should know?")).toBeTruthy();
    expect(screen.getByText("Amma")).toBeTruthy();
  });

  it("renders JourneyConsentScreen correctly", async () => {
    await render(<JourneyConsentScreen />);
    expect(screen.getByText("We're here")).toBeTruthy();
    expect(screen.getByText("Start monitored journey")).toBeTruthy();
  });

  it("renders JourneyActiveScreen with metrics", async () => {
    await render(<JourneyActiveScreen />);
    expect(screen.getByText("Office — Home")).toBeTruthy();
    expect(screen.getByText("9:36 PM")).toBeTruthy();
    expect(screen.getByText("62%")).toBeTruthy();
  });

  it("renders JourneySummaryScreen correctly", async () => {
    await render(<JourneySummaryScreen />);
    expect(screen.getByText("You're home safe.")).toBeTruthy();
    expect(screen.getByText("8.4 km")).toBeTruthy();
  });
});
