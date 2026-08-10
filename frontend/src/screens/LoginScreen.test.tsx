import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react-native";
import { LoginScreen } from "./LoginScreen";

describe("LoginScreen", () => {
  it("renders correctly with headline and inputs", async () => {
    await render(<LoginScreen />);
    expect(screen.getByText("Welcome back")).toBeTruthy();
    expect(screen.getByPlaceholderText("Email or Phone number")).toBeTruthy();
    expect(screen.getByPlaceholderText("App password")).toBeTruthy();
  });

  it("triggers onUsePhoneOtp when clicked", async () => {
    const onUsePhoneOtp = jest.fn();
    await render(<LoginScreen onUsePhoneOtp={onUsePhoneOtp} />);
    fireEvent.press(screen.getByText("Sign in with Phone OTP instead"));
    expect(onUsePhoneOtp).toHaveBeenCalled();
  });

  it("allows entering credentials and submitting password login", async () => {
    const mockFetch = jest.fn().mockImplementation((url) => {
      if (url.includes("/auth/login")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ access_token: "test-token", user: { id: "1", firebase_uid: "uid1", full_name: "Test User" } }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
    global.fetch = mockFetch;

    const onLoggedIn = jest.fn();
    await render(<LoginScreen onLoggedIn={onLoggedIn} />);
    
    await act(async () => {
      fireEvent.changeText(screen.getByPlaceholderText("Email or Phone number"), "user@example.com");
      fireEvent.changeText(screen.getByPlaceholderText("App password"), "securepass123");
    });
    
    await act(async () => {
      fireEvent.press(screen.getByText("Log in with Password"));
    });
    
    await waitFor(() => {
      expect(onLoggedIn).toHaveBeenCalled();
    }, { timeout: 3000 });
  });
});
