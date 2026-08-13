import { NativeModules, DeviceEventEmitter, Platform } from "react-native";
import {
  sendSilentSms,
  makeSilentCall,
  startShakeDetection,
  stopShakeDetection,
  addShakeTriggerListener,
} from "./sosNativeService";

describe("sosNativeService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Fallback behavior (Native modules absent in test environment)", () => {
    it("handles sendSilentSms gracefully and returns false", async () => {
      const result = await sendSilentSms(["+919999999999"], "Emergency SOS!");
      expect(result).toBe(false);
    });

    it("handles makeSilentCall gracefully and returns false", async () => {
      const result = await makeSilentCall("+919999999999");
      expect(result).toBe(false);
    });

    it("handles startShakeDetection gracefully and returns false", async () => {
      const result = await startShakeDetection();
      expect(result).toBe(false);
    });

    it("handles stopShakeDetection gracefully and returns false", async () => {
      const result = await stopShakeDetection();
      expect(result).toBe(false);
    });

    it("attaches shake trigger listener via DeviceEventEmitter", () => {
      const callback = jest.fn();
      const subscription = addShakeTriggerListener(callback);
      
      DeviceEventEmitter.emit("onShakeTriggered");
      expect(callback).toHaveBeenCalledTimes(1);

      subscription.remove();
    });
  });

  describe("Native Android module execution", () => {
    const mockSendSilentSms = jest.fn().mockResolvedValue(true);
    const mockMakeSilentCall = jest.fn().mockResolvedValue(true);
    const mockStartShakeDetection = jest.fn().mockResolvedValue(true);
    const mockStopShakeDetection = jest.fn().mockResolvedValue(true);

    beforeAll(() => {
      Platform.OS = "android";
      (NativeModules as any).SOSModule = {
        sendSilentSms: mockSendSilentSms,
        makeSilentCall: mockMakeSilentCall,
      };
      (NativeModules as any).ShakeModule = {
        startShakeDetection: mockStartShakeDetection,
        stopShakeDetection: mockStopShakeDetection,
      };
    });

    afterAll(() => {
      delete (NativeModules as any).SOSModule;
      delete (NativeModules as any).ShakeModule;
    });

    it("invokes SOSModule.sendSilentSms when native module is available", async () => {
      const result = await sendSilentSms(["+919876543210"], "HELP SOS");
      expect(mockSendSilentSms).toHaveBeenCalledWith(["+919876543210"], "HELP SOS");
      expect(result).toBe(true);
    });

    it("invokes SOSModule.makeSilentCall when native module is available", async () => {
      const result = await makeSilentCall("+919876543210");
      expect(mockMakeSilentCall).toHaveBeenCalledWith("+919876543210");
      expect(result).toBe(true);
    });

    it("invokes ShakeModule.startShakeDetection when native module is available", async () => {
      const result = await startShakeDetection();
      expect(mockStartShakeDetection).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it("invokes ShakeModule.stopShakeDetection when native module is available", async () => {
      const result = await stopShakeDetection();
      expect(mockStopShakeDetection).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });
});
