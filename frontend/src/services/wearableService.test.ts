/**
 * Module 14: Wearable Device Integration Service - API call site tests
 *
 * Verifies that WearableService talks to the consolidated axios `apiClient`
 * (frontend/src/api/apiClient.ts) with the correct HTTP method/URL/body and
 * correctly unwraps the AxiosResponse `.data` envelope, per Task 3 of the
 * auth-config-consolidation plan (removal of the fetch-based
 * `frontend/src/utils/apiClient.ts`).
 */

jest.mock('../api/apiClient', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

import { apiClient } from '../api/apiClient';
import { wearableService } from './wearableService';

const mockedGet = apiClient.get as jest.Mock;
const mockedPost = apiClient.post as jest.Mock;
const mockedDelete = apiClient.delete as jest.Mock;

describe('WearableService API call sites (consolidated axios apiClient)', () => {
  beforeEach(() => {
    mockedGet.mockReset();
    mockedPost.mockReset();
    mockedDelete.mockReset();
  });

  it('pairDevice: POSTs to /wearables/pair with the pairing params and unwraps response.data', async () => {
    const apiBody = {
      success: true,
      data: {
        id: 'dev-1',
        name: 'Aegis Ring',
        deviceType: 'SMART_RING',
        batteryLevel: 90,
        lastConnectedTimestamp: null,
        isPrimarySOSDevice: true,
      },
      message: 'ok',
      timestamp: '2026-08-07T00:00:00.000Z',
    };
    mockedPost.mockResolvedValueOnce({ data: apiBody });

    const result = await wearableService.pairDevice({ deviceId: 'dev-1' });

    expect(mockedPost).toHaveBeenCalledWith('/wearables/pair', { deviceId: 'dev-1' });
    expect(result).toEqual(apiBody);
  });

  it('getPairedDevices: GETs /wearables/paired and returns the unwrapped device list', async () => {
    const devices = [
      {
        id: 'dev-1',
        name: 'Aegis Ring',
        deviceType: 'SMART_RING',
        batteryLevel: 90,
        lastConnectedTimestamp: null,
        isPrimarySOSDevice: true,
      },
    ];
    mockedGet.mockResolvedValueOnce({
      data: { success: true, data: devices, timestamp: '2026-08-07T00:00:00.000Z' },
    });

    const result = await wearableService.getPairedDevices();

    expect(mockedGet).toHaveBeenCalledWith('/wearables/paired');
    expect(result).toEqual(devices);
  });

  it('syncTelemetry: POSTs to /wearables/telemetry with the telemetry payload and unwraps response.data', async () => {
    const telemetry = { deviceId: 'dev-1', batteryLevel: 80, timestamp: '2026-08-07T00:00:00.000Z' };
    const apiBody = { success: true, data: true, timestamp: '2026-08-07T00:00:00.000Z' };
    mockedPost.mockResolvedValueOnce({ data: apiBody });

    const result = await wearableService.syncTelemetry(telemetry);

    expect(mockedPost).toHaveBeenCalledWith('/wearables/telemetry', telemetry);
    expect(result).toEqual(apiBody);
  });

  it('syncTelemetry: rethrows on failure so the telemetry queue loop can pause', async () => {
    const formattedError = { code: 'NETWORK_ERROR', message: 'offline', isNetworkError: true, isTimeout: false };
    mockedPost.mockRejectedValueOnce(formattedError);

    await expect(
      wearableService.syncTelemetry({ deviceId: 'dev-1', batteryLevel: 80, timestamp: '2026-08-07T00:00:00.000Z' })
    ).rejects.toEqual(formattedError);
  });

  it('sendWearableSOS: POSTs to /wearables/sos-alert with the alert payload and unwraps response.data', async () => {
    const alert = {
      alertId: 'sos-1',
      deviceId: 'dev-1',
      triggerType: 'MANUAL_BUTTON' as const,
      latitude: 12.9,
      longitude: 77.5,
      batteryLevel: 80,
      timestamp: '2026-08-07T00:00:00.000Z',
    };
    const apiBody = { success: true, data: { incidentId: 'inc-1' }, timestamp: '2026-08-07T00:00:00.000Z' };
    mockedPost.mockResolvedValueOnce({ data: apiBody });

    const result = await wearableService.sendWearableSOS(alert);

    expect(mockedPost).toHaveBeenCalledWith('/wearables/sos-alert', alert);
    expect(result).toEqual(apiBody);
  });

  it('sendWearableSOS: falls back to a stub response gracefully on failure (no throw)', async () => {
    mockedPost.mockRejectedValueOnce({ code: 'NOT_FOUND', message: 'not found', isNetworkError: false, isTimeout: false });

    const result = await wearableService.sendWearableSOS({
      alertId: 'sos-1',
      deviceId: 'dev-1',
      triggerType: 'MANUAL_BUTTON',
      latitude: 12.9,
      longitude: 77.5,
      batteryLevel: 80,
      timestamp: '2026-08-07T00:00:00.000Z',
    });

    expect(result.success).toBe(true);
    expect(result.data.incidentId).toEqual(expect.any(String));
  });

  it('disconnectDevice: DELETEs /wearables/{deviceId} and unwraps response.data', async () => {
    const apiBody = { success: true, data: true, timestamp: '2026-08-07T00:00:00.000Z' };
    mockedDelete.mockResolvedValueOnce({ data: apiBody });

    const result = await wearableService.disconnectDevice('dev-1');

    expect(mockedDelete).toHaveBeenCalledWith('/wearables/dev-1');
    expect(result).toEqual(apiBody);
  });

  it('disconnectDevice: falls back to a stub response gracefully on failure (no throw)', async () => {
    mockedDelete.mockRejectedValueOnce({ code: 'NETWORK_ERROR', message: 'offline', isNetworkError: true, isTimeout: false });

    const result = await wearableService.disconnectDevice('dev-1');

    expect(result).toEqual({
      success: true,
      data: true,
      message: 'Device disconnected',
      timestamp: expect.any(String),
    });
  });
});
