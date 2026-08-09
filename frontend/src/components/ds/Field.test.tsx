import { render, screen, fireEvent, act } from "@testing-library/react-native";
import { AppInput, FieldLabel } from "./Field";
import { colors } from "../../theme/tokens";

test("FieldLabel renders its text", async () => {
  await render(<FieldLabel>Full name</FieldLabel>);
  expect(screen.getByText("Full name")).toBeTruthy();
});

test("AppInput calls onChangeText as the user types", async () => {
  const onChangeText = jest.fn();
  await render(<AppInput value="" onChangeText={onChangeText} placeholder="Rama Krishna" />);
  fireEvent.changeText(screen.getByPlaceholderText("Rama Krishna"), "Rama");
  expect(onChangeText).toHaveBeenCalledWith("Rama");
});

test("shows the hint text in the emergency color when invalid", async () => {
  await render(<AppInput value="98123" onChangeText={jest.fn()} invalid hint="That number doesn't look complete." />);
  expect(screen.getByText("That number doesn't look complete.")).toHaveStyle({ color: colors.emergency });
});

test("shows the hint text in the muted color when valid", async () => {
  await render(<AppInput value="9876543210" onChangeText={jest.fn()} hint="10/10 digits" />);
  expect(screen.getByText("10/10 digits")).toHaveStyle({ color: colors.mutedForeground });
});

test("border turns primary-colored on focus and reverts on blur", async () => {
  await render(<AppInput value="" onChangeText={jest.fn()} placeholder="00000 00000" />);
  const input = screen.getByPlaceholderText("00000 00000");
  await act(async () => {
    fireEvent(input, "onFocus");
  });
  expect(screen.getByTestId("app-input-container")).toHaveStyle({ borderColor: colors.primary });
  await act(async () => {
    fireEvent(input, "onBlur");
  });
  expect(screen.getByTestId("app-input-container")).toHaveStyle({ borderColor: colors.border });
});
