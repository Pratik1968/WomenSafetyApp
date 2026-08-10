import { render, screen, fireEvent, act, cleanup } from "@testing-library/react-native";
import { ReportScreen } from "./ReportScreen";

afterEach(() => {
  cleanup();
});

describe("ReportScreen", () => {
  it("renders report title and categories", async () => {
    await render(<ReportScreen />);
    expect(screen.getByText("What felt unsafe here?")).toBeTruthy();
    expect(screen.getByText("Low street lighting")).toBeTruthy();
    expect(screen.getByText("Catcalling / Harassment")).toBeTruthy();
  });

  it("renders report form inputs and submit button", async () => {
    await render(<ReportScreen state="filled" />);
    expect(screen.getByText("DESCRIPTION")).toBeTruthy();
    expect(screen.getByText("Submit report")).toBeTruthy();
  });

  it("renders success state when state prop is success", async () => {
    await render(<ReportScreen state="success" />);
    expect(screen.getByText("Thank you for speaking up")).toBeTruthy();
    expect(screen.getByText("Done")).toBeTruthy();
  });
});
