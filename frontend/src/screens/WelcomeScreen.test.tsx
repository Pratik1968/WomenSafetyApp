import { render, screen, fireEvent } from "@testing-library/react-native";
import { WelcomeScreen } from "./WelcomeScreen";

test("renders the headline and continue button", async () => {
  await render(<WelcomeScreen />);
  expect(screen.getByText("Welcome")).toBeTruthy();
  expect(screen.getByText("Continue with phone number")).toBeTruthy();
});

test("calls onContinue when the button is pressed", async () => {
  const onContinue = jest.fn();
  await render(<WelcomeScreen onContinue={onContinue} />);
  fireEvent.press(screen.getByText("Continue with phone number"));
  expect(onContinue).toHaveBeenCalledTimes(1);
});
