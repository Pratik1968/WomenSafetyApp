import { render, screen } from "@testing-library/react-native";
import { Heatmap } from "./Heatmap";

test("renders intensity cells", async () => {
  await render(<Heatmap cells={[{ label: "Alley", value: 14 }, { label: "Exit 3", value: 9 }]} />);
  expect(screen.getByTestId("heatmap")).toBeTruthy();
  expect(screen.getByText("14")).toBeTruthy();
  expect(screen.getByText("Alley")).toBeTruthy();
});
