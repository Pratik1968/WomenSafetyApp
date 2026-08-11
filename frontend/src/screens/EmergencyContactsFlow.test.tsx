import React from "react";
import { render, fireEvent, act, cleanup } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Contacts from "expo-contacts/legacy";
import { SetupContactsScreen } from "./SetupScreens";
import { contactStorageService } from "../services/contactStorageService";

jest.mock("expo-contacts/legacy", () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getContactsAsync: jest.fn(),
  presentContactPickerAsync: jest.fn(),
  Fields: { PhoneNumbers: "phoneNumbers" },
}));

describe("Emergency Contacts Flow", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  test("Storage Service saves and retrieves contacts cleanly from AsyncStorage", async () => {
    const testContacts = [
      { id: "c1", name: "Amma", initials: "AM", phone: "+91 98450 11234", relation: "Mother" },
      { id: "c2", name: "Sirisha Reddy", initials: "SR", phone: "+91 99012 44871", relation: "Sister" },
    ];

    await contactStorageService.saveEmergencyContacts(testContacts);
    const retrieved = await contactStorageService.getStoredEmergencyContacts();
    expect(retrieved).toEqual(testContacts);

    await contactStorageService.clearEmergencyContacts();
    const emptyList = await contactStorageService.getStoredEmergencyContacts();
    expect(emptyList).toEqual([]);
  });

  test("SetupContactsScreen displays explanation and 'Select Emergency Contacts' button initially without requesting permission automatically", async () => {
    (Contacts.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: "undetermined" });

    const view = await render(<SetupContactsScreen />);

    expect(
      view.getAllByText("Choose trusted emergency contacts who will be notified during an emergency.").length
    ).toBeGreaterThan(0);
    expect(view.getByText("Select Emergency Contacts")).toBeTruthy();

    expect(Contacts.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  test("Pressing 'Select Emergency Contacts' requests permission and shows selection when granted", async () => {
    (Contacts.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: "undetermined" });
    (Contacts.requestPermissionsAsync as jest.Mock).mockResolvedValue({ status: "granted" });
    (Contacts.presentContactPickerAsync as jest.Mock).mockResolvedValue({
      id: "p1",
      name: "Priya Sharma",
      phoneNumbers: [{ number: "+91 98765 43210" }],
    });

    const view = await render(<SetupContactsScreen />);

    await act(async () => {
      fireEvent.press(view.getByText("Select Emergency Contacts"));
    });

    expect(Contacts.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(await view.findByText("Contact details")).toBeTruthy();
    expect(view.getByText("Priya Sharma")).toBeTruthy();

    await act(async () => {
      fireEvent.press(view.getByText("Add contact"));
    });

    expect(await view.findByText("Priya Sharma")).toBeTruthy();
    expect(view.getByText("1/5 contacts added")).toBeTruthy();

    const saved = await contactStorageService.getStoredEmergencyContacts();
    expect(saved.length).toBe(1);
    expect(saved[0].name).toBe("Priya Sharma");
    expect(saved[0].relation).toBe("FRIEND");
    expect(saved[0].priority).toBe(1);
  });

  test("Shows friendly explanation with 'Try Again' and 'Skip for Now' options when permission is denied", async () => {
    (Contacts.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: "undetermined" });
    (Contacts.requestPermissionsAsync as jest.Mock).mockResolvedValue({ status: "denied" });

    const onSkip = jest.fn();
    const view = await render(<SetupContactsScreen onSkip={onSkip} />);

    await act(async () => {
      fireEvent.press(view.getByText("Select Emergency Contacts"));
    });

    expect(Contacts.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(view.getByText("Permission denied")).toBeTruthy();
    expect(
      view.getByText("Contacts permission is required to select emergency contacts for SOS alerts.")
    ).toBeTruthy();
    expect(view.getByText("Try Again")).toBeTruthy();
    expect(view.getByText("Skip for Now")).toBeTruthy();

    await act(async () => {
      fireEvent.press(view.getByText("Skip for Now"));
    });
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  test("Pressing 'Try Again' on denied view re-requests Contacts permission", async () => {
    (Contacts.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: "denied" });
    (Contacts.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: "denied" });

    const view = await render(<SetupContactsScreen />);

    await act(async () => {
      fireEvent.press(view.getByText("Select Emergency Contacts"));
    });

    expect(view.getByText("Permission denied")).toBeTruthy();

    (Contacts.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: "granted" });
    (Contacts.presentContactPickerAsync as jest.Mock).mockResolvedValueOnce({
      id: "p2",
      name: "Rahul Kumar",
      phoneNumbers: [{ number: "+91 91234 56789" }],
    });

    await act(async () => {
      fireEvent.press(view.getByText("Try Again"));
    });

    expect(Contacts.requestPermissionsAsync).toHaveBeenCalledTimes(2);
    expect(await view.findByText("Contact details")).toBeTruthy();

    await act(async () => {
      fireEvent.press(view.getByText("Add contact"));
    });

    expect(await view.findByText("Rahul Kumar")).toBeTruthy();
  });
});
