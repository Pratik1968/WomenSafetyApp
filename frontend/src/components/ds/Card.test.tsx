import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { Card } from "./Card";

test("renders children", async () => {
  await render(
    <Card>
      <Text>Inside card</Text>
    </Card>,
  );
  expect(screen.getByText("Inside card")).toBeTruthy();
});
