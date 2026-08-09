import { render, screen, fireEvent } from "@testing-library/react-native";
import { SelectRow } from "./SelectRow";

test("renders label and description", async () => {
  await render(<SelectRow label="Female" description="Personalises guidance" />);
  expect(screen.getByText("Female")).toBeTruthy();
  expect(screen.getByText("Personalises guidance")).toBeTruthy();
});

test("calls onPress when tapped", async () => {
  const onPress = jest.fn();
  await render(<SelectRow label="Female" onPress={onPress} />);
  fireEvent.press(screen.getByText("Female"));
  expect(onPress).toHaveBeenCalledTimes(1);
});
