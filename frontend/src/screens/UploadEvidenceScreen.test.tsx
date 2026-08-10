import { render, screen } from "@testing-library/react-native";
import { UploadEvidenceScreen } from "./UploadEvidenceScreen";

jest.mock("../data/evidence", () => ({ uploadEvidenceFile: jest.fn() }));
jest.mock("expo-document-picker", () => ({ getDocumentAsync: jest.fn() }));
jest.mock("expo-image-picker", () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));
jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));
jest.mock("react-native-webview", () => ({ WebView: () => null }));

test("renders a type-aware capture button + upload action", async () => {
  await render(<UploadEvidenceScreen incidentId="i1" />);
  expect(screen.getByText("Add evidence")).toBeTruthy();
  expect(screen.getByText("Pick a photo")).toBeTruthy(); // default type = image
  expect(screen.getByText("Upload evidence")).toBeTruthy();
});
