import { render, screen, fireEvent } from "@testing-library/react-native";
import { Text } from "react-native";
import { Dialog } from "./Dialog";

test("renders nothing when closed", async () => {
  await render(<Dialog open={false} onClose={jest.fn()} title="Allow access" body="..." actions={<Text>Allow</Text>} />);
  expect(screen.queryByText("Allow access")).toBeNull();
});

test("renders title, body, and actions when open", async () => {
  await render(<Dialog open={true} onClose={jest.fn()} title="Allow access" body="Details here" actions={<Text>Allow</Text>} />);
  expect(screen.getByText("Allow access")).toBeTruthy();
  expect(screen.getByText("Details here")).toBeTruthy();
  expect(screen.getByText("Allow")).toBeTruthy();
});

test("calls onClose when the backdrop is pressed", async () => {
  const onClose = jest.fn();
  await render(<Dialog open={true} onClose={onClose} title="Allow access" body="..." actions={<Text>Allow</Text>} />);
  fireEvent.press(screen.getByLabelText("Close"));
  expect(onClose).toHaveBeenCalledTimes(1);
});
