import { render, screen, cleanup } from "@testing-library/react-native";
import { NotificationsScreen } from "./NotificationsScreen";

afterEach(() => {
  cleanup();
});

describe("NotificationsScreen", () => {
  it("renders notifications screen and list items", async () => {
    await render(<NotificationsScreen />);
    expect(screen.getByText("Notifications")).toBeTruthy();
    expect(screen.getByText("Area safety update")).toBeTruthy();
    expect(screen.getByText("Amma started watching")).toBeTruthy();
  });

  it("renders empty state when state is empty", async () => {
    await render(<NotificationsScreen state="empty" />);
    expect(screen.getByText("Nothing needs you")).toBeTruthy();
  });
});
