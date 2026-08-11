import { render, screen, cleanup } from "@testing-library/react-native";
import { AssistantScreen } from "./AssistantScreen";

afterEach(() => {
  cleanup();
});

describe("AssistantScreen", () => {
  it("renders assistant header and conversation messages", async () => {
    await render(<AssistantScreen />);
    expect(screen.getByText("Ask Aegis")).toBeTruthy();
    expect(screen.getByText("Hi Aisha, I'm Aegis. I monitor safety data and keep an eye on your surroundings. How can I help right now?")).toBeTruthy();
  });

  it("renders empty state when state prop is empty", async () => {
    await render(<AssistantScreen state="empty" />);
    expect(screen.getByText("No conversations yet")).toBeTruthy();
  });

  it("renders quick prompt suggestion chips", async () => {
    await render(<AssistantScreen />);
    expect(screen.getByText("Safe way home?")).toBeTruthy();
    expect(screen.getByText("Check nearby police")).toBeTruthy();
  });
});
