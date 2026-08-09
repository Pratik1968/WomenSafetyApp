import { render, screen, fireEvent } from "@testing-library/react-native";
import { SettingRow } from "./SettingRow";

test("renders title and subtitle", async () => {
  await render(<SettingRow title="Sign out" subtitle="Ends your session" />);
  expect(screen.getByText("Sign out")).toBeTruthy();
  expect(screen.getByText("Ends your session")).toBeTruthy();
});

test("calls onPress when tapped", async () => {
  const onPress = jest.fn();
  await render(<SettingRow title="Sign out" onPress={onPress} />);
  fireEvent.press(screen.getByText("Sign out"));
  expect(onPress).toHaveBeenCalledTimes(1);
});
