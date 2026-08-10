import { render, screen } from "@testing-library/react-native";
import { NewIncidentScreen } from "./NewIncidentScreen";

jest.mock("../data/incidents", () => ({ createIncident: jest.fn() }));

test("renders the incident form", async () => {
  await render(<NewIncidentScreen />);
  expect(screen.getByText("Report incident")).toBeTruthy();
  expect(screen.getByText("Create incident")).toBeTruthy();
  expect(screen.getByText("Severity")).toBeTruthy();
});
