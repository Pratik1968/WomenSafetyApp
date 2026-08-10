import { render, screen } from "@testing-library/react-native";
import { SplashScreen } from "./SplashScreen";

test("renders the wordmark, tagline, and loading caption", async () => {
  await render(<SplashScreen />);
  expect(screen.getByText("Aegis")).toBeTruthy();
  expect(screen.getByText("Safety that stays with you")).toBeTruthy();
  expect(screen.getByText("Securing your session")).toBeTruthy();
});
