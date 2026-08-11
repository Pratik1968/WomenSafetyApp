import { render, screen, fireEvent, act, cleanup } from "@testing-library/react-native";
import { NearbyHelpScreen } from "./NearbyHelpScreen";

afterEach(() => {
  cleanup();
});

describe("NearbyHelpScreen", () => {
  it("renders nearby help header and filter chips", async () => {
    await render(<NearbyHelpScreen />);
    expect(screen.getByText("Nearby help")).toBeTruthy();
    expect(screen.getByText("All")).toBeTruthy();
    expect(screen.getByText("Police")).toBeTruthy();
    expect(screen.getByText("Hospitals")).toBeTruthy();
  });

  it("renders nearby help places", async () => {
    await render(<NearbyHelpScreen />);
    expect(screen.getByText("Indiranagar Police Station")).toBeTruthy();
    expect(screen.getByText("Manipal Hospital Emergency")).toBeTruthy();
  });

  it("renders emergency numbers section", async () => {
    await render(<NearbyHelpScreen />);
    expect(screen.getByText("EMERGENCY NUMBERS")).toBeTruthy();
    expect(screen.getByText("National Emergency")).toBeTruthy();
    expect(screen.getByText("112")).toBeTruthy();
  });

  it("toggles map view when toggle button is pressed", async () => {
    await render(<NearbyHelpScreen />);
    await act(async () => {
      fireEvent.press(screen.getByLabelText("Toggle view"));
    });
    expect(screen.getByText("Interactive Help Map")).toBeTruthy();
  });
});
