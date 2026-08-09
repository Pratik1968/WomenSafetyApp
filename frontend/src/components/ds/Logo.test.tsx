import { render, screen } from "@testing-library/react-native";
import { AegisMark, AegisWordmark } from "./Logo";

test("AegisMark defaults to a 72x72 image", async () => {
  await render(<AegisMark />);
  expect(screen.getByTestId("aegis-mark")).toHaveStyle({ width: 72, height: 72 });
});

test("AegisMark respects a custom size", async () => {
  await render(<AegisMark size={112} />);
  expect(screen.getByTestId("aegis-mark")).toHaveStyle({ width: 112, height: 112 });
});

test("AegisWordmark renders the wordmark text", async () => {
  await render(<AegisWordmark />);
  expect(screen.getByText("Aegis")).toBeTruthy();
});
