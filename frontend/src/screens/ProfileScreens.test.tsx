import { render, screen, cleanup } from "@testing-library/react-native";
import { ProfileScreen, SettingsScreen, DataPrivacyScreen } from "./ProfileScreens";

afterEach(() => {
  cleanup();
});

describe("ProfileScreens", () => {
  it("renders ProfileScreen user info and safety profile", async () => {
    await render(<ProfileScreen />);
    expect(screen.getAllByText("Profile")[0]).toBeTruthy();
    expect(screen.getByText("Aisha Patel")).toBeTruthy();
    expect(screen.getByText("Safety profile")).toBeTruthy();
  });

  it("renders SettingsScreen options", async () => {
    await render(<SettingsScreen />);
    expect(screen.getByText("Settings")).toBeTruthy();
    expect(screen.getByText("Dark mode")).toBeTruthy();
  });

  it("renders DataPrivacyScreen information", async () => {
    await render(<DataPrivacyScreen />);
    expect(screen.getByText("Data & privacy")).toBeTruthy();
    expect(screen.getByText("Your data is yours. Only yours.")).toBeTruthy();
  });
});
