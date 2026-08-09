import { render, screen } from "@testing-library/react-native";
import { SuccessCheck } from "./SuccessCheck";

test("defaults to an 88x88 box", async () => {
  await render(<SuccessCheck />);
  expect(screen.getByTestId("success-check")).toHaveStyle({ width: 88, height: 88 });
});

test("respects a custom size", async () => {
  await render(<SuccessCheck size={104} />);
  expect(screen.getByTestId("success-check")).toHaveStyle({ width: 104, height: 104 });
});
