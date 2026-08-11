jest.mock('../api/apiClient', () => ({
  apiClient: {
    post: jest.fn(),
    get: jest.fn(),
  },
}));

import { apiClient } from '../api/apiClient';
import { syncIncidentEvent, fetchIncidentHistory } from './incidentSyncService';

const mockedPost = apiClient.post as jest.Mock;
const mockedGet = apiClient.get as jest.Mock;

describe('incidentSyncService', () => {
  beforeEach(() => {
    mockedPost.mockReset();
    mockedGet.mockReset();
  });

  it('syncIncidentEvent POSTs the payload to /emergency/incidents/sync', async () => {
    mockedPost.mockResolvedValueOnce({ data: { success: true, data: { incidentId: 'inc-1' } } });

    const payload = {
      clientIncidentId: 'sos-1000-abc',
      firebaseUid: 'uid-1',
      source: 'BUTTON' as const,
      status: 'active' as const,
      startedAt: 1000,
      location: { lat: 12.9, lon: 77.5, timestamp: 1000, accurate: true },
      step: 'SOS_TRIGGERED',
      stepData: { source: 'BUTTON' },
      occurredAt: 1000,
    };

    await syncIncidentEvent(payload);

    expect(mockedPost).toHaveBeenCalledWith('/api/v1/emergency/incidents/sync', payload);
  });

  it('syncIncidentEvent rethrows on failure so callers can decide how to handle it', async () => {
    mockedPost.mockRejectedValueOnce(new Error('network down'));

    await expect(
      syncIncidentEvent({
        clientIncidentId: 'sos-1000-abc',
        firebaseUid: 'uid-1',
        source: 'BUTTON',
        status: 'active',
        startedAt: 1000,
        location: null,
        step: 'SOS_TRIGGERED',
        occurredAt: 1000,
      })
    ).rejects.toThrow('network down');
  });

  it('fetchIncidentHistory GETs history for the given firebaseUid and unwraps data', async () => {
    const incidents = [{ id: 'inc-1', clientIncidentId: 'sos-1000-abc', source: 'BUTTON', status: 'active', startedAt: '2026-01-01T00:00:00Z' }];
    mockedGet.mockResolvedValueOnce({ data: { success: true, data: incidents } });

    const result = await fetchIncidentHistory('uid-1');

    expect(mockedGet).toHaveBeenCalledWith('/api/v1/emergency/incidents/history', { params: { firebaseUid: 'uid-1' } });
    expect(result).toEqual(incidents);
  });

  it('fetchIncidentHistory returns an empty array on failure rather than throwing', async () => {
    mockedGet.mockRejectedValueOnce(new Error('network down'));

    const result = await fetchIncidentHistory('uid-1');

    expect(result).toEqual([]);
  });
});
