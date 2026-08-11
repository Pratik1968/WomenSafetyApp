import { render, screen, fireEvent, act, cleanup } from "@testing-library/react-native";
import { HomeScreen } from "./HomeScreen";

afterEach(() => {
  cleanup();
});

describe("HomeScreen", () => {
  it("renders user greeting and status pill correctly", async () => {
    await render(<HomeScreen />);
    expect(screen.getByText("Good evening,")).toBeTruthy();
    expect(screen.getByText("User")).toBeTruthy();
    expect(screen.getByText("You're in a safe area")).toBeTruthy();
  });

  it("triggers onNotifications callback when bell is pressed", async () => {
    const onNotifications = jest.fn();
    await render(<HomeScreen onNotifications={onNotifications} />);
    await act(async () => {
      fireEvent.press(screen.getByLabelText("Notifications"));
    });
    expect(onNotifications).toHaveBeenCalledTimes(1);
  });

  it("triggers SOS countdown when SOS hero button is pressed", async () => {
    const onSos = jest.fn();
    await render(<HomeScreen onSos={onSos} />);
    await act(async () => {
      fireEvent.press(screen.getByLabelText("Press and hold to send SOS"));
    });
    expect(screen.getByText("SOS activating…")).toBeTruthy();
  });

  it("renders quick actions grid items", async () => {
    await render(<HomeScreen />);
    expect(screen.getByText("Safe Route")).toBeTruthy();
    expect(screen.getByText("Nearby Police")).toBeTruthy();
    expect(screen.getByText("Hospitals")).toBeTruthy();
    expect(screen.getByText("AI Assistant")).toBeTruthy();
  });

  it("triggers onQuickAction callback when an action item is pressed", async () => {
    const onQuickAction = jest.fn();
    await render(<HomeScreen onQuickAction={onQuickAction} />);
    await act(async () => {
      fireEvent.press(screen.getByText("Safe Route"));
    });
    expect(onQuickAction).toHaveBeenCalledWith("Safe Route");
  });
});

