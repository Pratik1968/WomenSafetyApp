import { render, screen } from "@testing-library/react-native";
import { PagerDots } from "./PagerDots";

test("renders one dot per count, widening the active one", async () => {
  await render(<PagerDots count={3} active={1} />);
  expect(screen.getByTestId("pager-dot-0")).toHaveStyle({ width: 8 });
  expect(screen.getByTestId("pager-dot-1")).toHaveStyle({ width: 28 });
  expect(screen.getByTestId("pager-dot-2")).toHaveStyle({ width: 8 });
});
