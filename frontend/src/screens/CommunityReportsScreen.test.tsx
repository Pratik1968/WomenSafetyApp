import { render, screen, fireEvent, act, cleanup, waitFor } from "@testing-library/react-native";
import { CommunityReportsScreen } from "./CommunityReportsScreen";
import { fetchMyReports, fetchNearbyReports } from "../data/reports";

jest.mock("../data/reports", () => ({
  fetchNearbyReports: jest.fn(),
  fetchMyReports: jest.fn(),
}));
jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
  getCurrentPositionAsync: jest.fn(() => Promise.resolve({ coords: { latitude: 12.9716, longitude: 77.5946 } })),
}));

const mockedFetchNearby = fetchNearbyReports as jest.Mock;
const mockedFetchMine = fetchMyReports as jest.Mock;

const NEARBY_REPORT = {
  id: "r1",
  report_type: "harassment",
  description: "Someone followed me from the metro exit.",
  lat: 12.9716,
  lng: 77.5946,
  address: "100 Ft Road, Indiranagar",
  media: [],
  status: "pending",
  created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
};

const MY_REPORT = {
  id: "r2",
  report_type: "theft",
  description: null,
  lat: 12.9,
  lng: 77.6,
  address: "5th Cross",
  media: [],
  status: "reviewed",
  created_at: new Date().toISOString(),
};

afterEach(() => {
  cleanup();
  jest.clearAllMocks();
});

describe("CommunityReportsScreen", () => {
  it("loads and renders nearby reports by default", async () => {
    mockedFetchNearby.mockResolvedValue([NEARBY_REPORT]);
    await render(<CommunityReportsScreen />);

    await waitFor(() => expect(screen.getByText("Harassment")).toBeTruthy());
    expect(screen.getByText("Someone followed me from the metro exit.")).toBeTruthy();
    expect(mockedFetchNearby).toHaveBeenCalledWith(12.9716, 77.5946, 5);
  });

  it("shows a friendly empty state when there are no nearby reports", async () => {
    mockedFetchNearby.mockResolvedValue([]);
    await render(<CommunityReportsScreen />);

    await waitFor(() => expect(screen.getByText("No reports nearby")).toBeTruthy());
  });

  it("switches to 'Mine' tab and loads the user's own reports", async () => {
    mockedFetchNearby.mockResolvedValue([]);
    mockedFetchMine.mockResolvedValue([MY_REPORT]);
    await render(<CommunityReportsScreen />);

    await waitFor(() => expect(screen.getByText("No reports nearby")).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByText("Mine"));
    });

    await waitFor(() => expect(screen.getByText("Theft")).toBeTruthy());
    expect(mockedFetchMine).toHaveBeenCalledTimes(1);
    expect(screen.getByText("reviewed")).toBeTruthy();
  });

  it("shows an empty state with a CTA when the user has no reports of their own", async () => {
    mockedFetchNearby.mockResolvedValue([]);
    mockedFetchMine.mockResolvedValue([]);
    await render(<CommunityReportsScreen />);
    await waitFor(() => expect(screen.getByText("No reports nearby")).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByText("Mine"));
    });

    await waitFor(() => expect(screen.getByText("You haven't reported anything yet")).toBeTruthy());
  });

  it("shows an error state with retry when loading fails", async () => {
    mockedFetchNearby.mockRejectedValue(new Error("network unavailable"));
    await render(<CommunityReportsScreen />);

    await waitFor(() => expect(screen.getByText("network unavailable")).toBeTruthy());

    mockedFetchNearby.mockResolvedValue([NEARBY_REPORT]);
    await act(async () => {
      fireEvent.press(screen.getByText("Try again"));
    });
    await waitFor(() => expect(screen.getByText("Harassment")).toBeTruthy());
  });

  it("calls onReportNew when the report CTA is pressed", async () => {
    mockedFetchNearby.mockResolvedValue([]);
    const onReportNew = jest.fn();
    await render(<CommunityReportsScreen onReportNew={onReportNew} />);
    await waitFor(() => expect(screen.getByText("No reports nearby")).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByText("Report an unsafe area"));
    });
    expect(onReportNew).toHaveBeenCalledTimes(1);
  });
});
