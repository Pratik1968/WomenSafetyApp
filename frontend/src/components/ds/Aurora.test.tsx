import { render, screen } from "@testing-library/react-native";
import { Aurora } from "./Aurora";

test("soft intensity maps to 0.18 opacity", async () => {
  await render(<Aurora intensity="soft" />);
  expect(screen.getByTestId("aurora")).toHaveStyle({ opacity: 0.18 });
});

test("medium intensity maps to 0.28 opacity", async () => {
  await render(<Aurora intensity="medium" />);
  expect(screen.getByTestId("aurora")).toHaveStyle({ opacity: 0.28 });
});

test("strong intensity maps to 0.38 opacity", async () => {
  await render(<Aurora intensity="strong" />);
  expect(screen.getByTestId("aurora")).toHaveStyle({ opacity: 0.38 });
});

test("defaults to soft", async () => {
  await render(<Aurora />);
  expect(screen.getByTestId("aurora")).toHaveStyle({ opacity: 0.18 });
});
