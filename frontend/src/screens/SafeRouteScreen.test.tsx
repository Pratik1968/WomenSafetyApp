import { render, screen, fireEvent, act, cleanup } from "@testing-library/react-native";
import { SafeRouteScreen } from "./SafeRouteScreen";

afterEach(() => {
  cleanup();
});

describe("SafeRouteScreen", () => {
  it("renders search mode when state is search", async () => {
    await render(<SafeRouteScreen state="search" />);
    expect(screen.getByText("Where are you going?")).toBeTruthy();
    expect(screen.getByText("Home")).toBeTruthy();
  });

  it("renders results mode with routes list", async () => {
    await render(<SafeRouteScreen state="results" />);
    expect(screen.getByText("Lit Corridor Main Rd")).toBeTruthy();
    expect(screen.getByText("Low risk")).toBeTruthy();
    expect(screen.getByText("Start navigation")).toBeTruthy();
  });

  it("triggers onStartNavigation callback when button pressed", async () => {
    const onStartNavigation = jest.fn();
    await render(<SafeRouteScreen state="results" onStartNavigation={onStartNavigation} />);
    await act(async () => {
      fireEvent.press(screen.getByText("Start navigation"));
    });
    expect(onStartNavigation).toHaveBeenCalledTimes(1);
  });
});
