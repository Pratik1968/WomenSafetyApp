import { render, screen, fireEvent, act, cleanup } from "@testing-library/react-native";
import { RootStack } from "./RootStack";

afterEach(() => {
  cleanup();
});

test("walks Splash (auto-advance) -> Onboarding (skip) -> Welcome -> Phone", async () => {
  jest.setTimeout(20000);
  jest.useFakeTimers();
  try {
    await render(<RootStack />);

    expect(screen.getByText("Securing your session")).toBeTruthy();

    await act(async () => {
      jest.advanceTimersByTime(2600);
    });
    expect(await screen.findByText("Your personal safety companion")).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByText("Skip"));
    });
    expect(await screen.findByText("Continue with phone number")).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByText("Continue with phone number"));
    });
    expect(await screen.findByText("What's your number?")).toBeTruthy();
  } finally {
    jest.useRealTimers();
  }
}, 20000);
