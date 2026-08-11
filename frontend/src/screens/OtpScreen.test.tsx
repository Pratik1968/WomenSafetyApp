import { render, screen, fireEvent, act, cleanup } from "@testing-library/react-native";
import { OtpScreen } from "./OtpScreen";

afterEach(() => {
  cleanup();
});

test("counts the resend timer down and offers a resend button at zero", async () => {
  jest.useFakeTimers();
  await render(<OtpScreen state="empty" />);
  expect(screen.getByText(/Resend code in/)).toBeTruthy();
  expect(screen.getByText("0:28")).toBeTruthy();

  await act(async () => {
    jest.advanceTimersByTime(5000);
  });
  expect(screen.getByText("0:23")).toBeTruthy();

  await act(async () => {
    jest.advanceTimersByTime(23000);
  });
  const resend = screen.getByText("Resend code");
  await act(async () => {
    fireEvent.press(resend);
  });
  expect(screen.getByText("0:28")).toBeTruthy();
  jest.useRealTimers();
});

test("verifies a correct autofilled code and calls onVerified after the success screen", async () => {
  jest.useFakeTimers();
  const onVerified = jest.fn();
  await render(<OtpScreen state="autofill" onVerified={onVerified} />);

  await act(async () => {
    fireEvent.press(screen.getByText("Verify"));
  });
  await act(async () => {
    jest.advanceTimersByTime(900);
  });
  expect(screen.getByText("Number verified")).toBeTruthy();
  expect(onVerified).not.toHaveBeenCalled();

  await act(async () => {
    jest.advanceTimersByTime(1400);
  });
  expect(onVerified).toHaveBeenCalledTimes(1);
  jest.useRealTimers();
});

test("shows an error for a wrong code and clears it once the user edits the code", async () => {
  jest.useFakeTimers();
  await render(<OtpScreen state="empty" />);

  await act(async () => {
    fireEvent.changeText(screen.getByTestId("otp-hidden-input"), "111111");
  });
  await act(async () => {
    fireEvent.press(screen.getByText("Verify"));
  });
  await act(async () => {
    jest.advanceTimersByTime(900);
  });
  expect(screen.getByText("That code isn't right. Check the message and try again.")).toBeTruthy();

  await act(async () => {
    fireEvent.changeText(screen.getByTestId("otp-hidden-input"), "482913");
  });
  expect(screen.queryByText("That code isn't right. Check the message and try again.")).toBeNull();
  jest.useRealTimers();
});
