import { render, screen, fireEvent, act, cleanup } from "@testing-library/react-native";
import { ProfileScreen, SettingsScreen, DataPrivacyScreen } from "./ProfileScreens";

jest.mock("../services/profileService", () => ({
  getMyProfile: jest.fn().mockResolvedValue({
    id: "user-1",
    firebase_uid: "uid-1",
    full_name: "Rama Krishna",
    blood_group: "O+",
    medical_notes: "Allergies: Penicillin · Conditions: Asthma",
  }),
  saveProfile: jest.fn().mockResolvedValue({
    id: "user-1",
    firebase_uid: "uid-1",
    full_name: "Rama Krishna",
    medical_notes: "Allergies: Peanuts",
  }),
  parseMedicalNotes: jest.requireActual("../services/profileService").parseMedicalNotes,
  formatMedicalNotes: jest.requireActual("../services/profileService").formatMedicalNotes,
}));

jest.mock("../services/firebaseConfig", () => ({
  auth: { currentUser: { phoneNumber: "+91 98765 43210" }, signOut: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock("../hooks/useEmergencyContacts", () => ({
  useEmergencyContacts: () => ({ contacts: [] }),
}));

jest.mock("../services/contactStorageService", () => ({
  contactStorageService: { clearEmergencyContacts: jest.fn().mockResolvedValue(undefined) },
}));

afterEach(() => {
  cleanup();
  jest.clearAllMocks();
});

describe("ProfileScreens", () => {
  it("renders ProfileScreen user info and safety profile", async () => {
    await render(<ProfileScreen />);
    expect(screen.getAllByText("Profile")[0]).toBeTruthy();
    expect(screen.getByText("Rama Krishna")).toBeTruthy();
    expect(screen.getByText("Safety profile")).toBeTruthy();
  });

  it("opens medical editor from the medical information row", async () => {
    await render(<ProfileScreen />);
    await act(async () => {
      fireEvent.press(screen.getByText("Medical information"));
    });
    expect(screen.getByText("Save medical info")).toBeTruthy();
    expect(screen.getByDisplayValue("Penicillin")).toBeTruthy();
    expect(screen.getByDisplayValue("Asthma")).toBeTruthy();
  });

  it("shows logout confirmation dialog", async () => {
    await render(<ProfileScreen />);
    await act(async () => {
      fireEvent.press(screen.getByText("Log out"));
    });
    expect(screen.getByText("Log out of Aegis?")).toBeTruthy();
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
