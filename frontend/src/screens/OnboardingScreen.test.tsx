import { render, screen, fireEvent, act, cleanup } from "@testing-library/react-native";
import { OnboardingScreen } from "./OnboardingScreen";

afterEach(() => {
  cleanup();
});

test("shows Skip and 'Continue' on a non-last step, calling the right handlers", async () => {
  const onNext = jest.fn();
  const onSkip = jest.fn();
  await render(<OnboardingScreen step={0} onNext={onNext} onSkip={onSkip} />);

  await act(async () => {
    fireEvent.press(screen.getByText("Skip"));
  });
  expect(onSkip).toHaveBeenCalledTimes(1);

  await act(async () => {
    fireEvent.press(screen.getByText("Continue"));
  });
  expect(onNext).toHaveBeenCalledTimes(1);
});

test("hides Skip and shows 'Get started' on the last step", async () => {
  const onNext = jest.fn();
  await render(<OnboardingScreen step={2} onNext={onNext} />);

  expect(screen.queryByText("Skip")).toBeNull();
  await act(async () => {
    fireEvent.press(screen.getByText("Get started"));
  });
  expect(onNext).toHaveBeenCalledTimes(1);
});
