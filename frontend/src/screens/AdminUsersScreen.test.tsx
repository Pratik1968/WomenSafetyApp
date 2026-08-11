import { render, screen } from "@testing-library/react-native";
import { AdminUsersContent, AdminUsersScreen } from "./AdminUsersScreen";
import { listUsers } from "../data/admin";

jest.mock("../data/admin", () => ({
  listUsers: jest.fn(),
  updateUser: jest.fn(),
}));

test("content lists users", async () => {
  (listUsers as jest.Mock).mockResolvedValue([
    { id: "u1", full_name: "Asha K", phone: "+91 90000 00000", blood_group: null, is_admin: false, status: "active", created_at: "2026-07-01T00:00:00Z", last_active_at: null },
  ]);
  await render(<AdminUsersContent />);
  expect(await screen.findByText("Asha K")).toBeTruthy();
});

test("native wrapper shows the web-only notice", async () => {
  await render(<AdminUsersScreen />);
  expect(screen.getByText("Open on the web")).toBeTruthy();
});
