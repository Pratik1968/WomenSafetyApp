jest.mock("./incidentSyncService", () => ({
  syncIncidentEvent: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("./contactStorageService", () => ({
  contactStorageService: {
    getStoredEmergencyContacts: jest.fn().mockResolvedValue([{ phone: "+919999999999" }]),
  },
}));
jest.mock("./sosNativeService", () => ({
  sendSilentSms: jest.fn().mockResolvedValue(true),
  makeSilentCall: jest.fn().mockResolvedValue(true),
}));
jest.mock("./firebaseConfig", () => ({
  auth: { currentUser: { uid: "uid-test-1" } },
}));

import AsyncStorage from "@react-native-async-storage/async-storage";
import { syncIncidentEvent } from "./incidentSyncService";
import { triggerSOS, cancelSOS, getIncidentById } from "./sosOrchestratorService";

const mockedSync = syncIncidentEvent as jest.Mock;

describe("sosOrchestratorService backend sync", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    mockedSync.mockClear();
    mockedSync.mockResolvedValue(undefined);
  });

  it("syncs the SOS_TRIGGERED step when an incident starts", async () => {
    const incidentId = await triggerSOS("BUTTON");

    expect(mockedSync).toHaveBeenCalledWith(
      expect.objectContaining({ clientIncidentId: incidentId, firebaseUid: "uid-test-1", step: "SOS_TRIGGERED" })
    );
  });

  it("syncs subsequent pipeline steps (e.g. SMS_SENT) as they happen", async () => {
    const incidentId = await triggerSOS("BUTTON");

    expect(mockedSync).toHaveBeenCalledWith(
      expect.objectContaining({ clientIncidentId: incidentId, step: "SMS_SENT" })
    );
  });

  it("syncs the SOS_ENDED step with the resolved status on cancelSOS", async () => {
    const incidentId = await triggerSOS("BUTTON");
    mockedSync.mockClear();

    await cancelSOS(incidentId, "resolved");

    expect(mockedSync).toHaveBeenCalledWith(
      expect.objectContaining({ clientIncidentId: incidentId, step: "SOS_ENDED", status: "resolved" })
    );
  });

  it("does not throw or block the pipeline when sync fails", async () => {
    mockedSync.mockRejectedValue(new Error("network down"));

    await expect(triggerSOS("BUTTON")).resolves.toEqual(expect.any(String));
  });

  it("skips syncing when no user is signed in, without throwing", async () => {
    jest.requireMock("./firebaseConfig").auth.currentUser = null;

    await expect(triggerSOS("BUTTON")).resolves.toEqual(expect.any(String));
    expect(mockedSync).not.toHaveBeenCalled();

    jest.requireMock("./firebaseConfig").auth.currentUser = { uid: "uid-test-1" };
  });

  it("getIncidentById returns the matching locally stored incident", async () => {
    const incidentId = await triggerSOS("SHAKE");

    const found = await getIncidentById(incidentId);

    expect(found?.id).toBe(incidentId);
    expect(found?.source).toBe("SHAKE");
  });

  it("getIncidentById returns undefined for an unknown id", async () => {
    const found = await getIncidentById("does-not-exist");
    expect(found).toBeUndefined();
  });

  it("does not wait on a slow/hanging backend sync call before resolving", async () => {
    // Simulate poor connectivity: the sync call never resolves (worse than a
    // slow one — proves triggerSOS truly doesn't await it, not just that it
    // tolerates a long-but-finite delay).
    mockedSync.mockImplementation(() => new Promise(() => {}));

    const start = Date.now();
    const incidentId = await triggerSOS("BUTTON");
    const elapsed = Date.now() - start;

    expect(incidentId).toEqual(expect.any(String));
    // The pipeline itself has a deliberate ~800ms delay between SMS and call
    // steps, but nothing else should add meaningful latency. 5s is a very
    // generous ceiling — if triggerSOS were awaiting the hanging sync call,
    // this would blow past Jest's default 5s test timeout instead.
    expect(elapsed).toBeLessThan(5000);
  });
});
