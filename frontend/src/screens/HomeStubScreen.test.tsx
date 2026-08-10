import { render, screen } from "@testing-library/react-native";
import { HomeStubScreen } from "./HomeStubScreen";

test("renders the phase-1-complete placeholder", async () => {
  await render(<HomeStubScreen />);
  expect(screen.getByText("You're in.")).toBeTruthy();
});
