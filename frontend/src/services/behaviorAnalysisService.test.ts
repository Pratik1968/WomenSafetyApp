jest.mock("../data/supabase", () => ({
  isSupabaseConfigured: true,
  ensureSession: jest.fn().mockResolvedValue(undefined),
  supabase: {
    from: jest.fn(),
  },
}));

import {
  pushLocation,
  reset,
  getBuffer,
  computeMovementSignals,
  lookupZoneRisk,
  evaluate,
  BehaviorPoint,
} from "./behaviorAnalysisService";
import { supabase } from "../data/supabase";

const mockedFrom = supabase.from as jest.Mock;

// Mimics the real Supabase PostgrestFilterBuilder: .select()/.gte()/.lte() are all
// chainable (return `this`), and the chain itself is thenable so `await` on it
// resolves with { data, error } regardless of how many .gte()/.lte() calls precede it.
function thenableChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {
    select: jest.fn(() => chain),
    gte: jest.fn(() => chain),
    lte: jest.fn(() => chain),
    then: (resolve: (v: unknown) => unknown) => resolve(result),
  };
  return chain;
}

function mockHotspotQuery(rows: Array<{ lat: number; lng: number; risk_level: string }>) {
  const chain = thenableChain({ data: rows, error: null });
  mockedFrom.mockReturnValue(chain);
  return chain;
}

describe("behaviorAnalysisService — ring buffer", () => {
  beforeEach(() => {
    reset();
  });

  it("starts empty", () => {
    expect(getBuffer()).toEqual([]);
  });

  it("accumulates pushed points in order", () => {
    pushLocation({ lat: 1, lon: 1, timestampMs: 1000 });
    pushLocation({ lat: 2, lon: 2, timestampMs: 2000 });

    expect(getBuffer()).toEqual([
      { lat: 1, lon: 1, timestampMs: 1000 },
      { lat: 2, lon: 2, timestampMs: 2000 },
    ]);
  });

  it("caps the buffer at the last 5 points", () => {
    for (let i = 0; i < 8; i++) {
      pushLocation({ lat: i, lon: i, timestampMs: i * 1000 });
    }

    const buffer = getBuffer();
    expect(buffer).toHaveLength(5);
    expect(buffer[0]).toEqual({ lat: 3, lon: 3, timestampMs: 3000 });
    expect(buffer[4]).toEqual({ lat: 7, lon: 7, timestampMs: 7000 });
  });

  it("reset() empties the buffer", () => {
    pushLocation({ lat: 1, lon: 1, timestampMs: 1000 });
    reset();
    expect(getBuffer()).toEqual([]);
  });
});

describe("behaviorAnalysisService — computeMovementSignals: sudden stop", () => {
  it("flags a sudden stop when speed drops sharply between the last two intervals", () => {
    // ~28m in 10s ≈ 2.8 m/s (brisk) then ~1m in 10s ≈ 0.1 m/s (stopped)
    const buffer: BehaviorPoint[] = [
      { lat: 12.9716, lon: 77.5946, timestampMs: 0 },
      { lat: 12.97185, lon: 77.5946, timestampMs: 10_000 },
      { lat: 12.971859, lon: 77.5946, timestampMs: 20_000 },
    ];

    const signals = computeMovementSignals(buffer, 20_000 + 12 * 3600 * 1000); // noon, not night
    expect(signals.suddenStop).toBe(true);
  });

  it("does not flag a sudden stop for steady walking pace", () => {
    const buffer: BehaviorPoint[] = [
      { lat: 12.9716, lon: 77.5946, timestampMs: 0 },
      { lat: 12.97185, lon: 77.5946, timestampMs: 10_000 },
      { lat: 12.972, lon: 77.5946, timestampMs: 20_000 },
    ];

    const signals = computeMovementSignals(buffer, 20_000 + 12 * 3600 * 1000);
    expect(signals.suddenStop).toBe(false);
  });

  it("does not flag a sudden stop with fewer than 3 points", () => {
    const buffer: BehaviorPoint[] = [{ lat: 12.9716, lon: 77.5946, timestampMs: 0 }];
    const signals = computeMovementSignals(buffer, 12 * 3600 * 1000);
    expect(signals.suddenStop).toBe(false);
  });
});

describe("behaviorAnalysisService — computeMovementSignals: prolonged inactivity", () => {
  it("flags prolonged inactivity when a full 5-point buffer barely moves", () => {
    const buffer: BehaviorPoint[] = [
      { lat: 12.97160, lon: 77.59460, timestampMs: 0 },
      { lat: 12.97161, lon: 77.59460, timestampMs: 10_000 },
      { lat: 12.97160, lon: 77.59461, timestampMs: 20_000 },
      { lat: 12.97161, lon: 77.59461, timestampMs: 30_000 },
      { lat: 12.97160, lon: 77.59460, timestampMs: 40_000 },
    ];

    const signals = computeMovementSignals(buffer, 40_000 + 12 * 3600 * 1000);
    expect(signals.prolongedInactivity).toBe(true);
  });

  it("does not flag prolonged inactivity with fewer than 5 points", () => {
    const buffer: BehaviorPoint[] = [
      { lat: 12.9716, lon: 77.5946, timestampMs: 0 },
      { lat: 12.9716, lon: 77.5946, timestampMs: 10_000 },
    ];
    const signals = computeMovementSignals(buffer, 10_000 + 12 * 3600 * 1000);
    expect(signals.prolongedInactivity).toBe(false);
  });

  it("does not flag prolonged inactivity when the buffer actually spans real distance", () => {
    const buffer: BehaviorPoint[] = [
      { lat: 12.9716, lon: 77.5946, timestampMs: 0 },
      { lat: 12.9720, lon: 77.5946, timestampMs: 10_000 },
      { lat: 12.9724, lon: 77.5946, timestampMs: 20_000 },
      { lat: 12.9728, lon: 77.5946, timestampMs: 30_000 },
      { lat: 12.9732, lon: 77.5946, timestampMs: 40_000 },
    ];
    const signals = computeMovementSignals(buffer, 40_000 + 12 * 3600 * 1000);
    expect(signals.prolongedInactivity).toBe(false);
  });
});

describe("behaviorAnalysisService — computeMovementSignals: night travel", () => {
  it("flags night travel at 23:00 local time", () => {
    const now = new Date();
    now.setHours(23, 0, 0, 0);
    const signals = computeMovementSignals([], now.getTime());
    expect(signals.nightTravel).toBe(true);
  });

  it("flags night travel at 03:00 local time", () => {
    const now = new Date();
    now.setHours(3, 0, 0, 0);
    const signals = computeMovementSignals([], now.getTime());
    expect(signals.nightTravel).toBe(true);
  });

  it("does not flag night travel at 14:00 local time", () => {
    const now = new Date();
    now.setHours(14, 0, 0, 0);
    const signals = computeMovementSignals([], now.getTime());
    expect(signals.nightTravel).toBe(false);
  });

  it("does not flag night travel exactly at 05:00 local time (boundary)", () => {
    const now = new Date();
    now.setHours(5, 0, 0, 0);
    const signals = computeMovementSignals([], now.getTime());
    expect(signals.nightTravel).toBe(false);
  });
});

describe("behaviorAnalysisService — lookupZoneRisk", () => {
  beforeEach(() => {
    mockedFrom.mockReset();
  });

  it("returns null when Supabase is not configured", async () => {
    jest.requireMock("../data/supabase").isSupabaseConfigured = false;
    const risk = await lookupZoneRisk(12.9716, 77.5946);
    expect(risk).toBeNull();
    jest.requireMock("../data/supabase").isSupabaseConfigured = true;
  });

  it("returns null when no hotspots are nearby", async () => {
    mockHotspotQuery([]);
    const risk = await lookupZoneRisk(12.9716, 77.5946);
    expect(risk).toBeNull();
  });

  it("returns the risk_level of a nearby hotspot within 2km", async () => {
    mockHotspotQuery([{ lat: 12.9716, lng: 77.5946, risk_level: "high" }]);
    const risk = await lookupZoneRisk(12.9716, 77.5946);
    expect(risk).toBe("high");
  });

  it("ignores a hotspot row further than 2km away even if the bounding box matched", async () => {
    // ~0.03 deg lat ≈ 3.3km — inside the bounding box but outside the 2km radius filter
    mockHotspotQuery([{ lat: 12.9716 + 0.03, lng: 77.5946, risk_level: "hotspot" }]);
    const risk = await lookupZoneRisk(12.9716, 77.5946);
    expect(risk).toBeNull();
  });

  it("returns the highest risk_level when multiple hotspots are nearby", async () => {
    mockHotspotQuery([
      { lat: 12.9716, lng: 77.5946, risk_level: "low" },
      { lat: 12.9717, lng: 77.5947, risk_level: "hotspot" },
      { lat: 12.9715, lng: 77.5945, risk_level: "moderate" },
    ]);
    const risk = await lookupZoneRisk(12.9716, 77.5946);
    expect(risk).toBe("hotspot");
  });

  it("returns null (never throws) when the Supabase query errors", async () => {
    mockedFrom.mockReturnValue(thenableChain({ data: null, error: { message: "boom" } }));
    const risk = await lookupZoneRisk(12.9716, 77.5946);
    expect(risk).toBeNull();
  });

  it("returns null (never throws) when the Supabase client rejects", async () => {
    mockedFrom.mockImplementation(() => {
      throw new Error("network down");
    });
    await expect(lookupZoneRisk(12.9716, 77.5946)).resolves.toBeNull();
  });
});

describe("behaviorAnalysisService — evaluate (alert decision)", () => {
  beforeEach(() => {
    reset();
    mockedFrom.mockReset();
  });

  it("returns null when no signals fire and the zone is unknown", async () => {
    mockHotspotQuery([]);
    const now = new Date();
    now.setHours(14, 0, 0, 0);

    const alert = await evaluate({ lat: 12.9716, lon: 77.5946, timestampMs: now.getTime() });
    expect(alert).toBeNull();
  });

  it("returns an AI_WARNING for exactly one signal in a non-high-risk zone", async () => {
    mockHotspotQuery([{ lat: 12.9716, lng: 77.5946, risk_level: "low" }]);
    const now = new Date();
    now.setHours(23, 0, 0, 0); // night travel only

    const alert = await evaluate({ lat: 12.9716, lon: 77.5946, timestampMs: now.getTime() });

    expect(alert).not.toBeNull();
    expect(alert!.eventType).toBe("AI_WARNING");
    expect(alert!.title).toBe("AI Pre-Warning Triggered");
    expect(alert!.detail).toContain("late-night");
  });

  it("returns AI_RISK_DETECTED when 2+ signals fire", async () => {
    mockHotspotQuery([]);
    const now = new Date();
    now.setHours(23, 0, 0, 0);
    const nowMs = now.getTime();

    // Prime the buffer with 5 stationary points ending "now" -> prolongedInactivity + nightTravel
    reset();
    for (let i = 0; i < 5; i++) {
      pushLocation({ lat: 12.9716, lon: 77.5946, timestampMs: nowMs - (4 - i) * 10_000 });
    }

    const alert = await evaluate({ lat: 12.9716, lon: 77.5946, timestampMs: nowMs });

    expect(alert).not.toBeNull();
    expect(alert!.eventType).toBe("AI_RISK_DETECTED");
    expect(alert!.title).toBe("AI Threat Detected");
    expect(alert!.detail).toContain("late-night");
    expect(alert!.detail).toContain("No significant movement");
  });

  it("returns AI_RISK_DETECTED for exactly one signal in a high-risk zone", async () => {
    mockHotspotQuery([{ lat: 12.9716, lng: 77.5946, risk_level: "hotspot" }]);
    const now = new Date();
    now.setHours(23, 0, 0, 0); // night travel only, but zone is a hotspot

    const alert = await evaluate({ lat: 12.9716, lon: 77.5946, timestampMs: now.getTime() });

    expect(alert).not.toBeNull();
    expect(alert!.eventType).toBe("AI_RISK_DETECTED");
    expect(alert!.detail).toContain("Current area risk level: hotspot");
  });

  it("pushes the evaluated point into the buffer as a side effect", async () => {
    mockHotspotQuery([]);
    reset();
    const now = new Date();
    now.setHours(14, 0, 0, 0);

    await evaluate({ lat: 1, lon: 1, timestampMs: now.getTime() });

    expect(getBuffer()).toHaveLength(1);
  });
});
