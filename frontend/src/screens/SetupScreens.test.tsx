import { render, screen, fireEvent, act, cleanup } from "@testing-library/react-native";
import {
  SetupNameScreen,
  SetupGenderScreen,
  SetupBloodScreen,
  SetupDobScreen,
  SetupContactsScreen,
  SetupMedicalScreen,
  SetupCompleteScreen,
} from "./SetupScreens";

afterEach(() => {
  cleanup();
});

test("SetupNameScreen keeps Continue disabled until the name is at least 2 characters", async () => {
  const onNext = jest.fn();
  await render(<SetupNameScreen onNext={onNext} />);

  await act(async () => {
    fireEvent.press(screen.getByText("Continue"));
  });
  expect(onNext).not.toHaveBeenCalled();

  await act(async () => {
    fireEvent.changeText(screen.getByPlaceholderText("Rama Krishna"), "Ka");
  });
  await act(async () => {
    fireEvent.press(screen.getByText("Continue"));
  });
  expect(onNext).toHaveBeenCalledTimes(1);
});

test("SetupGenderScreen enables Continue once a gender is selected", async () => {
  const onNext = jest.fn();
  await render(<SetupGenderScreen onNext={onNext} />);

  await act(async () => {
    fireEvent.press(screen.getByText("Continue"));
  });
  expect(onNext).not.toHaveBeenCalled();

  await act(async () => {
    fireEvent.press(screen.getByText("Female"));
  });
  await act(async () => {
    fireEvent.press(screen.getByText("Continue"));
  });
  expect(onNext).toHaveBeenCalledTimes(1);
});

test("SetupBloodScreen enables Continue once a blood group is selected", async () => {
  const onNext = jest.fn();
  await render(<SetupBloodScreen onNext={onNext} />);

  await act(async () => {
    fireEvent.press(screen.getByText("Continue"));
  });
  expect(onNext).not.toHaveBeenCalled();

  await act(async () => {
    fireEvent.press(screen.getByText("O+"));
  });
  await act(async () => {
    fireEvent.press(screen.getByText("Continue"));
  });
  expect(onNext).toHaveBeenCalledTimes(1);
});

test("SetupDobScreen shows the initial date and Continue is always enabled", async () => {
  const onNext = jest.fn();
  await render(<SetupDobScreen onNext={onNext} />);
  expect(screen.getByText("14 Aug 1999")).toBeTruthy();

  await act(async () => {
    fireEvent.press(screen.getByText("Continue"));
  });
  expect(onNext).toHaveBeenCalledTimes(1);
});

test("SetupContactsScreen shows the 2 preselected contacts and lets you remove one", async () => {
  await render(<SetupContactsScreen state="filled" />);
  expect(screen.getByText("2/5 contacts added")).toBeTruthy();
  expect(screen.getByText("Amma")).toBeTruthy();

  await act(async () => {
    fireEvent.press(screen.getAllByLabelText("Remove contact")[0]);
  });
  expect(screen.getByText("1/5 contacts added")).toBeTruthy();
  expect(screen.queryByText("Amma")).toBeNull();
});

test("SetupContactsScreen shows the max-reached message at 5 contacts", async () => {
  await render(<SetupContactsScreen state="max" />);
  expect(screen.getByText("You've reached the maximum of 5 contacts.")).toBeTruthy();
  expect(screen.queryByText("Import from contacts")).toBeNull();
});

test("SetupMedicalScreen reflects typed input and always allows Continue", async () => {
  const onNext = jest.fn();
  await render(<SetupMedicalScreen onNext={onNext} />);
  await act(async () => {
    fireEvent.changeText(screen.getByPlaceholderText("Penicillin, peanuts"), "Penicillin");
  });
  expect(screen.getByDisplayValue("Penicillin")).toBeTruthy();

  await act(async () => {
    fireEvent.press(screen.getByText("Continue"));
  });
  expect(onNext).toHaveBeenCalledWith({ allergies: "Penicillin", conditions: "", notes: "" });
});

test("SetupCompleteScreen calls onDone when 'Go to Home' is pressed", async () => {
  const onDone = jest.fn();
  await render(<SetupCompleteScreen onDone={onDone} />);
  await act(async () => {
    fireEvent.press(screen.getByText("Go to Home"));
  });
  expect(onDone).toHaveBeenCalledTimes(1);
});
