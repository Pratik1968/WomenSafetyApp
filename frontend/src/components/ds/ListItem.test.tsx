import { render, screen, fireEvent } from "@testing-library/react-native";
import { ListItem } from "./ListItem";

test("renders title and subtitle", async () => {
  await render(<ListItem title="India" subtitle="+91" />);
  expect(screen.getByText("India")).toBeTruthy();
  expect(screen.getByText("+91")).toBeTruthy();
});

test("calls onPress when tapped", async () => {
  const onPress = jest.fn();
  await render(<ListItem title="India" onPress={onPress} />);
  fireEvent.press(screen.getByText("India"));
  expect(onPress).toHaveBeenCalledTimes(1);
});
