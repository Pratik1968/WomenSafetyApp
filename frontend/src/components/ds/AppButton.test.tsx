import { render, screen, fireEvent } from "@testing-library/react-native";
import { AppButton } from "./AppButton";

test("renders its label and calls onPress when tapped", async () => {
  const onPress = jest.fn();
  await render(<AppButton onPress={onPress}>Continue</AppButton>);
  fireEvent.press(screen.getByText("Continue"));
  expect(onPress).toHaveBeenCalledTimes(1);
});

test("does not call onPress when disabled", async () => {
  const onPress = jest.fn();
  await render(
    <AppButton onPress={onPress} disabled>
      Continue
    </AppButton>,
  );
  fireEvent.press(screen.getByText("Continue"));
  expect(onPress).not.toHaveBeenCalled();
});

test("shows 'Please wait' and blocks onPress while loading", async () => {
  const onPress = jest.fn();
  await render(
    <AppButton onPress={onPress} loading>
      Continue
    </AppButton>,
  );
  expect(screen.getByText("Please wait")).toBeTruthy();
  expect(screen.queryByText("Continue")).toBeNull();
  fireEvent.press(screen.getByText("Please wait"));
  expect(onPress).not.toHaveBeenCalled();
});
