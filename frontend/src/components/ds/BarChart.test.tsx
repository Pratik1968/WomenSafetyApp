import { render, screen } from "@testing-library/react-native";
import { BarChart } from "./BarChart";

test("renders a bar chart container with labels", async () => {
  await render(<BarChart data={[{ label: "sos", value: 4 }, { label: "alert", value: 2 }]} />);
  expect(screen.getByTestId("bar-chart")).toBeTruthy();
  expect(screen.getByText("sos")).toBeTruthy();
});
