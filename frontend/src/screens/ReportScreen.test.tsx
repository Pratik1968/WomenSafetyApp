import { render, screen, fireEvent, act, cleanup, waitFor } from "@testing-library/react-native";
import { ReportScreen } from "./ReportScreen";
import { submitIncidentReport } from "../data/reports";

jest.mock("../data/reports", () => ({ submitIncidentReport: jest.fn() }));
jest.mock("expo-image-picker", () => ({
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));
jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: jest.fn(() => Promise.resolve({ status: "granted" })),
  getCurrentPositionAsync: jest.fn(() => Promise.resolve({ coords: { latitude: 12.9716, longitude: 77.5946 } })),
  reverseGeocodeAsync: jest.fn(() => Promise.resolve([{ street: "5th Cross", city: "Indiranagar" }])),
}));

const mockedSubmit = submitIncidentReport as jest.Mock;

afterEach(() => {
  cleanup();
  jest.clearAllMocks();
});

async function renderReady(props: Parameters<typeof ReportScreen>[0] = {}) {
  await render(<ReportScreen {...props} />);
  await waitFor(() => expect(screen.getAllByText("5th Cross, Indiranagar").length).toBeGreaterThan(0));
}

describe("ReportScreen", () => {
  it("renders report title and all spec categories", async () => {
    await renderReady();
    expect(screen.getByText("What felt unsafe here?")).toBeTruthy();
    expect(screen.getByText("Harassment")).toBeTruthy();
    expect(screen.getByText("Theft")).toBeTruthy();
    expect(screen.getByText("Assault")).toBeTruthy();
    expect(screen.getByText("Stalking")).toBeTruthy();
    expect(screen.getByText("Suspicious person")).toBeTruthy();
    expect(screen.getByText("Unsafe location")).toBeTruthy();
  });

  it("renders report form inputs and submit button", async () => {
    await renderReady();
    expect(screen.getByText("DESCRIPTION")).toBeTruthy();
    expect(screen.getByText("Submit report")).toBeTruthy();
  });

  it("resolves the current GPS location on mount", async () => {
    await renderReady();
    expect(screen.getAllByText("5th Cross, Indiranagar").length).toBeGreaterThan(0);
  });

  it("does not submit until a category is picked", async () => {
    await renderReady();
    await act(async () => {
      fireEvent.press(screen.getByText("Submit report"));
    });
    expect(mockedSubmit).not.toHaveBeenCalled();
  });

  it("submits the selected category with GPS location and shows the success screen", async () => {
    mockedSubmit.mockResolvedValue({ id: "r1" });
    const onSubmitDone = jest.fn();
    await renderReady({ onSubmitDone });

    await act(async () => {
      fireEvent.press(screen.getByText("Harassment"));
    });
    await act(async () => {
      fireEvent.press(screen.getByText("Submit report"));
    });

    await waitFor(() => expect(screen.getByText("Thank you for speaking up")).toBeTruthy());
    expect(mockedSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        reportType: "harassment",
        lat: 12.9716,
        lng: 77.5946,
        address: "5th Cross, Indiranagar",
      }),
    );

    await act(async () => {
      fireEvent.press(screen.getByText("Done"));
    });
    expect(onSubmitDone).toHaveBeenCalledTimes(1);
  });

  it("shows an inline error and stays on the form when submission fails", async () => {
    mockedSubmit.mockRejectedValue(new Error("network unavailable"));
    await renderReady();

    await act(async () => {
      fireEvent.press(screen.getByText("Theft"));
    });
    await act(async () => {
      fireEvent.press(screen.getByText("Submit report"));
    });

    await waitFor(() => expect(screen.getByText("network unavailable")).toBeTruthy());
    expect(screen.getByText("Submit report")).toBeTruthy();
  });
});
