import { render, screen, cleanup } from "@testing-library/react-native";
import { HistoryScreen, IncidentDetailScreen } from "./HistoryScreens";

afterEach(() => {
  cleanup();
});

describe("HistoryScreens", () => {
  it("renders HistoryScreen dashboard and list", async () => {
    await render(<HistoryScreen />);
    expect(screen.getAllByText("History")[0]).toBeTruthy();
    expect(screen.getAllByText("History")[0]).toBeTruthy();
    expect(screen.getByText("Monitored walk")).toBeTruthy();
  });

  it("renders empty history state when state is empty", async () => {
    await render(<HistoryScreen state="empty" />);
    expect(screen.getByText("Nothing here yet")).toBeTruthy();
  });

  it("renders IncidentDetailScreen with danger score and timeline", async () => {
    await render(<IncidentDetailScreen />);
    expect(screen.getByText("Incident details")).toBeTruthy();
    expect(screen.getByText("SOS triggered")).toBeTruthy();
    expect(screen.getByText("Danger score")).toBeTruthy();
    expect(screen.getByText("78")).toBeTruthy();
  });
});
