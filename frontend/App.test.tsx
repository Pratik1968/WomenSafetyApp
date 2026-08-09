import { render, screen } from "@testing-library/react-native";
import App from "./App";

test("renders without crashing and shows the initial screen", async () => {
  await render(<App />);
  expect(screen.getByTestId("app-root")).toBeTruthy();
});
