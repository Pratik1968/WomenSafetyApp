import { render, screen, fireEvent } from "@testing-library/react-native";
import { Text } from "react-native";
import { BottomSheet } from "./BottomSheet";

test("renders nothing when closed", async () => {
  await render(
    <BottomSheet open={false} onClose={jest.fn()} title="Select country">
      <Text>Body</Text>
    </BottomSheet>,
  );
  expect(screen.queryByText("Select country")).toBeNull();
});

test("renders title and children when open", async () => {
  await render(
    <BottomSheet open={true} onClose={jest.fn()} title="Select country">
      <Text>Body</Text>
    </BottomSheet>,
  );
  expect(screen.getByText("Select country")).toBeTruthy();
  expect(screen.getByText("Body")).toBeTruthy();
});

test("calls onClose when the backdrop is pressed", async () => {
  const onClose = jest.fn();
  await render(
    <BottomSheet open={true} onClose={onClose} title="Select country">
      <Text>Body</Text>
    </BottomSheet>,
  );
  fireEvent.press(screen.getByLabelText("Close"));
  expect(onClose).toHaveBeenCalledTimes(1);
});
