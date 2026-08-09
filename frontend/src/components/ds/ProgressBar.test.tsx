import { render, screen } from "@testing-library/react-native";
import { ProgressBar } from "./ProgressBar";

test("renders fill width proportional to value", async () => {
  await render(<ProgressBar value={0.5} />);
  expect(screen.getByTestId("progress-fill")).toHaveStyle({ width: "50%" });
});

test("clamps values above 1 to 100%", async () => {
  await render(<ProgressBar value={1.5} />);
  expect(screen.getByTestId("progress-fill")).toHaveStyle({ width: "100%" });
});

test("clamps values below 0 to 0%", async () => {
  await render(<ProgressBar value={-0.5} />);
  expect(screen.getByTestId("progress-fill")).toHaveStyle({ width: "0%" });
});
