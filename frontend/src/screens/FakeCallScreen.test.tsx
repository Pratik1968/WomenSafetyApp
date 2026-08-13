import { render, screen, fireEvent, act } from "@testing-library/react-native";
import { FakeCallScreen } from "./FakeCallScreen";

test("renders Fake Call Settings title and Delay options", async () => {
  await render(<FakeCallScreen />);
  expect(screen.getByText("Fake Call Settings")).toBeTruthy();
  expect(screen.getByText("Instant")).toBeTruthy();
  expect(screen.getByText("1m")).toBeTruthy();
});
