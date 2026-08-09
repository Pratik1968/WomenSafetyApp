import { render, screen, fireEvent, act, cleanup } from "@testing-library/react-native";
import { BottomNav } from "./BottomNav";

afterEach(() => {
  cleanup();
});

test("calls onSelect with the tapped tab's key", async () => {
  const onSelect = jest.fn();
  await render(<BottomNav active="home" onSelect={onSelect} />);

  await act(async () => {
    fireEvent.press(screen.getByText("Safety"));
  });
  expect(onSelect).toHaveBeenCalledWith("safety");

  await act(async () => {
    fireEvent.press(screen.getByText("Profile"));
  });
  expect(onSelect).toHaveBeenCalledWith("profile");
});

test("calls onSos when the SOS button is pressed", async () => {
  const onSos = jest.fn();
  await render(<BottomNav active="home" onSos={onSos} />);
  await act(async () => {
    fireEvent.press(screen.getByLabelText("Press and hold to send SOS"));
  });
  expect(onSos).toHaveBeenCalledTimes(1);
});

test("hides the SOS button when sos is false", async () => {
  await render(<BottomNav active="home" sos={false} />);
  expect(screen.queryByLabelText("Press and hold to send SOS")).toBeNull();
});

test("calls onAssistant when the assistant FAB is pressed", async () => {
  const onAssistant = jest.fn();
  await render(<BottomNav active="home" onAssistant={onAssistant} />);
  await act(async () => {
    fireEvent.press(screen.getByLabelText("Open AI assistant"));
  });
  expect(onAssistant).toHaveBeenCalledTimes(1);
});
