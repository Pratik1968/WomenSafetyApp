import { render, screen, fireEvent, act, cleanup, waitFor } from "@testing-library/react-native";
import { PhoneScreen } from "./PhoneScreen";

afterEach(() => {
  cleanup();
});

test("continue is disabled until the number reaches the country's digit length, then calls onContinue", async () => {
  const onContinue = jest.fn();
  await render(<PhoneScreen onContinue={onContinue} />);

  const input = screen.getByPlaceholderText("00000 00000");
  await act(async () => {
    fireEvent.press(screen.getByText("Continue"));
  });
  expect(onContinue).not.toHaveBeenCalled();

  await act(async () => {
    fireEvent.changeText(input, "9876543210");
  });
  await act(async () => {
    fireEvent.press(screen.getByText("Continue"));
  });
  
  await waitFor(() => {
    expect(onContinue).toHaveBeenCalledWith("+91 9876543210", expect.anything());
  });
});

test("shows an error hint and disables continue when the number is too long for the country", async () => {
  const onContinue = jest.fn();
  await render(<PhoneScreen onContinue={onContinue} />);

  await act(async () => {
    fireEvent.changeText(screen.getByPlaceholderText("00000 00000"), "987654321099");
  });
  expect(screen.getByText("That number doesn't look complete.")).toBeTruthy();

  await act(async () => {
    fireEvent.press(screen.getByText("Continue"));
  });
  expect(onContinue).not.toHaveBeenCalled();
});

test("filters the country list by search query in the bottom sheet", async () => {
  await render(<PhoneScreen />);
  await act(async () => {
    fireEvent.press(screen.getByText("+91"));
  });
  await act(async () => {
    fireEvent.changeText(screen.getByPlaceholderText("Search"), "united");
  });
  expect(screen.getByText("United States")).toBeTruthy();
  expect(screen.getByText("United Kingdom")).toBeTruthy();
  expect(screen.queryByText("India")).toBeNull();
});

test("selecting a country updates the dial code and closes the sheet", async () => {
  await render(<PhoneScreen />);
  await act(async () => {
    fireEvent.press(screen.getByText("+91"));
  });
  await act(async () => {
    fireEvent.changeText(screen.getByPlaceholderText("Search"), "united states");
  });
  await act(async () => {
    fireEvent.press(screen.getByText("United States"));
  });
  expect(screen.getByText("+1")).toBeTruthy();
  expect(screen.queryByPlaceholderText("Search")).toBeNull();
});
