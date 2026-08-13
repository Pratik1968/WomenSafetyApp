import { useEffect, useRef } from "react";
import { Accelerometer } from "expo-sensors";

type Options = {
  threshold?: number; // magnitude threshold to consider a strong movement
  windowMs?: number; // duration to observe strong movement
  requiredCount?: number; // number of strong samples in the window to trigger
};

/**
 * Simple shake detector using the accelerometer.
 * Triggers when `requiredCount` samples exceed `threshold` within `windowMs` milliseconds.
 */
export function useShakeDetector(onShake: () => void, opts: Options = {}) {
  const { threshold = 1.6, windowMs = 2000, requiredCount = 8 } = opts;
  const bufferRef = useRef<number[]>([]);
  const lastTriggerRef = useRef<number>(0);

  useEffect(() => {
    let mounted = true;
    Accelerometer.setUpdateInterval(100);

    const sub = Accelerometer.addListener((d) => {
      if (!mounted) return;
      const mag = Math.sqrt((d.x || 0) ** 2 + (d.y || 0) ** 2 + (d.z || 0) ** 2);
      const now = Date.now();
      // push timestamp if magnitude exceeds threshold
      if (mag > threshold) {
        bufferRef.current.push(now);
      }
      // drop old samples
      const windowStart = now - windowMs;
      bufferRef.current = bufferRef.current.filter((t) => t >= windowStart);

      if (bufferRef.current.length >= requiredCount && now - lastTriggerRef.current > 5000) {
        lastTriggerRef.current = now;
        try {
          onShake();
        } catch (err) {
          // swallow
        }
        bufferRef.current = [];
      }
    });

    return () => {
      mounted = false;
      sub.remove();
    };
  }, [onShake, threshold, windowMs, requiredCount]);
}
