import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { ChatBubble } from "./ChatBubble";

test("aligns to the end and uses the brand gradient for the user's own messages", async () => {
  await render(
    <ChatBubble from="user">
      <Text>Hello</Text>
    </ChatBubble>,
  );
  expect(screen.getByTestId("chat-bubble-wrap")).toHaveStyle({ alignItems: "flex-end" });
});

test("aligns to the start for Aegis messages", async () => {
  await render(
    <ChatBubble from="aegis">
      <Text>Hi there</Text>
    </ChatBubble>,
  );
  expect(screen.getByTestId("chat-bubble-wrap")).toHaveStyle({ alignItems: "flex-start" });
});
