import { render, screen, fireEvent } from "@testing-library/react-native";
import { Chip } from "./Chip";

test("renders label and calls onPress", async () => {
  const onPress = jest.fn();
  await render(<Chip onPress={onPress}>All</Chip>);
  fireEvent.press(screen.getByText("All"));
  expect(onPress).toHaveBeenCalledTimes(1);
});
