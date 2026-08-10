import { render, screen, fireEvent, act, cleanup } from "@testing-library/react-native";
import { PermissionScreen, PERMISSIONS } from "./PermissionScreens";

afterEach(() => {
  cleanup();
});

test("shows the permission for the given index", async () => {
  await render(<PermissionScreen index={1} />);
  expect(screen.getByText(PERMISSIONS[1].title)).toBeTruthy();
  expect(screen.getByText("Permission 2 of 6")).toBeTruthy();
});

test("Allow requests native permission and calls onAllow when granted", async () => {
  const onAllow = jest.fn();
  await render(<PermissionScreen index={0} onAllow={onAllow} />);

  await act(async () => {
    fireEvent.press(screen.getByText("Allow"));
  });

  expect(onAllow).toHaveBeenCalledTimes(1);
  expect(screen.getByText("Thank you")).toBeTruthy();
});

test("Shows 'Open settings' when permission state is denied", async () => {
  await render(<PermissionScreen index={0} state="denied" />);
  expect(screen.getByText("Open settings")).toBeTruthy();
});

test("Not now calls onSkip", async () => {
  const onSkip = jest.fn();
  await render(<PermissionScreen index={0} onSkip={onSkip} />);
  await act(async () => {
    fireEvent.press(screen.getByText("Not now"));
  });
  expect(onSkip).toHaveBeenCalledTimes(1);
});

test("Allowing notifications fetches the device push token and registers it with the backend", async () => {
  const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 201, json: async () => ({}) });
  (globalThis as any).fetch = fetchMock;

  const onAllow = jest.fn();
  await render(<PermissionScreen index={1} onAllow={onAllow} />);

  await act(async () => {
    fireEvent.press(screen.getByText("Allow"));
  });

  expect(onAllow).toHaveBeenCalledTimes(1);
  expect(fetchMock).toHaveBeenCalledWith(
    expect.stringContaining("/devices/register"),
    expect.objectContaining({
      method: "POST",
      body: expect.stringContaining("mock-fcm-token"),
    })
  );
});
