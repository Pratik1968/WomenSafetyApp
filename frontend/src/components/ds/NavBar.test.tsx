import { render, screen, fireEvent } from "@testing-library/react-native";
import { NavBar } from "./NavBar";

test("renders the title", async () => {
  await render(<NavBar title="Permissions" />);
  expect(screen.getByText("Permissions")).toBeTruthy();
});

test("calls onBack when the back button is pressed", async () => {
  const onBack = jest.fn();
  await render(<NavBar title="Permissions" onBack={onBack} />);
  fireEvent.press(screen.getByLabelText("Back"));
  expect(onBack).toHaveBeenCalledTimes(1);
});

test("does not render a back button when onBack is not provided", async () => {
  await render(<NavBar title="Permissions" />);
  expect(screen.queryByLabelText("Back")).toBeNull();
});
