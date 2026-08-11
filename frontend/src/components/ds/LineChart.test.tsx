import { render, screen } from "@testing-library/react-native";
import { LineChart } from "./LineChart";

test("renders a line chart container", async () => {
  await render(<LineChart data={[1, 3, 2, 5, 4]} />);
  expect(screen.getByTestId("line-chart")).toBeTruthy();
});
