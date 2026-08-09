import { render, screen, fireEvent } from "@testing-library/react-native";
import { Toggle } from "./Toggle";

test("calls onChange with true when pressed while off", async () => {
  const onChange = jest.fn();
  await render(<Toggle on={false} onChange={onChange} />);
  fireEvent.press(screen.getByRole("switch"));
  expect(onChange).toHaveBeenCalledWith(true);
});

test("calls onChange with false when pressed while on", async () => {
  const onChange = jest.fn();
  await render(<Toggle on={true} onChange={onChange} />);
  fireEvent.press(screen.getByRole("switch"));
  expect(onChange).toHaveBeenCalledWith(false);
});
