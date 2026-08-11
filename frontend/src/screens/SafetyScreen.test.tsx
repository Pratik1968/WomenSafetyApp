import type { ReactElement } from "react";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react-native";
import { NavigationContainer } from "@react-navigation/native";
import { SafetyScreen } from "./SafetyScreen";

afterEach(() => {
  cleanup();
});

describe("SafetyScreen", () => {
  const renderSafetyScreen = async (ui: ReactElement) => {
    return render(<NavigationContainer>{ui}</NavigationContainer>);
  };

  it("renders safety dashboard header and risk score", async () => {
    await renderSafetyScreen(<SafetyScreen />);
    expect(screen.getAllByText("Safety")[0]).toBeTruthy();
    expect(screen.getByText("Everything that keeps tonight predictable.")).toBeTruthy();
    expect(screen.getByText("22")).toBeTruthy();
    expect(screen.getByText("Low risk")).toBeTruthy();
  });

  it("renders elevated risk state when state prop is elevated", async () => {
    await renderSafetyScreen(<SafetyScreen state="elevated" />);
    expect(screen.getByText("64")).toBeTruthy();
    expect(screen.getByText("Elevated risk")).toBeTruthy();
    expect(screen.getByText("Prefer lit roads tonight")).toBeTruthy();
  });

  it("triggers onSafetyMode callback when Safety Mode banner is pressed", async () => {
    const onSafetyMode = jest.fn();
    await renderSafetyScreen(<SafetyScreen onSafetyMode={onSafetyMode} />);
    await act(async () => {
      fireEvent.press(screen.getByText("Safety Mode"));
    });
    expect(onSafetyMode).toHaveBeenCalledTimes(1);
  });

  it("triggers onSafeRoute callback when Safe route card is pressed", async () => {
    const onSafeRoute = jest.fn();
    await renderSafetyScreen(<SafetyScreen onSafeRoute={onSafeRoute} />);
    await act(async () => {
      fireEvent.press(screen.getByText("Safe route"));
    });
    expect(onSafeRoute).toHaveBeenCalledTimes(1);
  });
});
