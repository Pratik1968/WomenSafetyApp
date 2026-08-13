import { useEffect } from "react";
import {
  addShakeTriggerListener,
  startShakeDetection,
  stopShakeDetection,
} from "../services/sosNativeService";

type Options = {
  threshold?: number;
  windowMs?: number;
  requiredCount?: number;
};

/**
 * Hook to listen for shake trigger events from native ShakeModule / ShakeDetectionService.
 */
export function useShakeDetector(onShake: () => void, _opts: Options = {}) {
  useEffect(() => {
    void startShakeDetection();
    const sub = addShakeTriggerListener(() => {
      try {
        onShake();
      } catch (err) {
        console.warn("[useShakeDetector] onShake callback error:", err);
      }
    });

    return () => {
      sub.remove();
      void stopShakeDetection();
    };
  }, [onShake]);
}
