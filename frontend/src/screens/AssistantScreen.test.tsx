import { render, screen, cleanup } from "@testing-library/react-native";
import { AssistantScreen } from "./AssistantScreen";

afterEach(() => {
  cleanup();
});

describe("AssistantScreen", () => {
  it("renders assistant header", async () => {
    await render(<AssistantScreen />);
    expect(screen.getByText("Ask Aegis")).toBeTruthy();
  });

  it("renders welcome state with greeting when no messages", async () => {
    await render(<AssistantScreen />);
    expect(screen.getByText("How can I help you?")).toBeTruthy();
  });

  it("renders suggestion chips on welcome screen", async () => {
    await render(<AssistantScreen />);
    expect(screen.getByText("Safe Route")).toBeTruthy();
    expect(screen.getByText("Nearby Police")).toBeTruthy();
    expect(screen.getByText("Emergency Help")).toBeTruthy();
  });
});
