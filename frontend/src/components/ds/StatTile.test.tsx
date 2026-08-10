import { render, screen } from "@testing-library/react-native";
import { StatTile } from "./StatTile";

test("renders value, label and delta", async () => {
  await render(<StatTile label="Total users" value="128" delta="+4 (7d)" />);
  expect(screen.getByText("128")).toBeTruthy();
  expect(screen.getByText("Total users")).toBeTruthy();
  expect(screen.getByText("+4 (7d)")).toBeTruthy();
});
