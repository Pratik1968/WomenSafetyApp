import { render, fireEvent, cleanup } from "@testing-library/react-native";

jest.mock("../ds/BottomSheet", () => {
  const { Text, View } = require("react-native");
  return {
    BottomSheet: ({ open, title, children }: { open: boolean; title?: string; children: React.ReactNode }) =>
      open ? (
        <View>
          {title ? <Text>{title}</Text> : null}
          {children}
        </View>
      ) : null,
  };
});

import { ContactDetailsSheet } from "./ContactDetailsSheet";
import { normalizeRelationship } from "../../hooks/useEmergencyContacts";

afterEach(() => {
  cleanup();
});

test("normalizes title-case relationships to picker values", () => {
  expect(normalizeRelationship("Father")).toBe("FATHER");
  expect(normalizeRelationship("Best friend")).toBe("FRIEND");
  expect(normalizeRelationship("prefer not real", "OTHER")).toBe("OTHER");
});

test("saves the selected relationship instead of falling back to friend", async () => {
  const onSave = jest.fn();

  const view = await render(
    <ContactDetailsSheet
      open
      onClose={jest.fn()}
      contact={{
        id: "contact-1",
        name: "Nanna",
        initials: "NA",
        phone: "+91 98860 77210",
        relation: "Friend",
        priority: 1,
      }}
      mode="edit"
      existingContacts={[]}
      onSave={onSave}
    />
  );

  fireEvent.press(await view.findByText("Father"));
  fireEvent.press(view.getByText("Save changes"));

  expect(onSave).toHaveBeenCalledWith("FATHER", 1);
});
