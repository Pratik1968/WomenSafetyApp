import { render, screen, cleanup } from "@testing-library/react-native";
import { RootStack } from "./RootStack";

afterEach(() => {
  cleanup();
});

test("renders the initial placeholder route", async () => {
  await render(<RootStack />);
  expect(await screen.findByTestId("placeholder-screen")).toBeTruthy();
});
