import { nearbyPlacesService, NearbyPlace } from './nearbyPlacesService';

describe('NearbyPlacesService', () => {
  const mockCoords = { latitude: 12.9716, longitude: 77.5946 };

  it('calculates Haversine distance accurately', () => {
    // Distance between (12.9716, 77.5946) and (12.9750, 77.5980) ~ 0.52 km
    const dist = nearbyPlacesService.calculateDistanceKm(12.9716, 77.5946, 12.975, 77.598);
    expect(dist).toBeGreaterThan(0.3);
    expect(dist).toBeLessThan(0.8);
  });

  it('formats single police station response matching required schema', () => {
    const places: NearbyPlace[] = [
      {
        id: '101',
        name: 'Indiranagar Police Station',
        kind: 'police',
        distanceKm: 0.45,
        formattedDistance: '450 m',
        address: '100 Ft Road, Indiranagar',
        latitude: 12.975,
        longitude: 77.598,
        phone: '112',
        directionsUrl: 'https://maps.google.com/?q=12.975,77.598',
      },
    ];

    const response = nearbyPlacesService.formatPoliceResponse(places, '100 Ft Road', mockCoords);
    expect(response).toContain('POLICE INFORMATION');
    expect(response).toContain('Nearest police station:');
    expect(response).toContain('Indiranagar Police Station');
    expect(response).toContain('Distance:');
    expect(response).toContain('450 m');
    expect(response).toContain('Location:');
    expect(response).toContain('112');
  });

  it('formats multiple police stations response cleanly', () => {
    const places: NearbyPlace[] = [
      {
        id: '101',
        name: 'Indiranagar Police Station',
        kind: 'police',
        distanceKm: 0.45,
        formattedDistance: '450 m',
        address: '100 Ft Road',
        latitude: 12.975,
        longitude: 77.598,
        phone: '112',
        directionsUrl: 'https://maps.google.com/?q=12.975,77.598',
      },
      {
        id: '102',
        name: 'Ulsoor Police Station',
        kind: 'police',
        distanceKm: 1.8,
        formattedDistance: '1.8 km',
        address: 'Old Madras Road',
        latitude: 12.98,
        longitude: 77.61,
        phone: '112',
        directionsUrl: 'https://maps.google.com/?q=12.98,77.61',
      },
    ];

    const response = nearbyPlacesService.formatPoliceResponse(places);
    expect(response).toContain('POLICE INFORMATION');
    expect(response).toContain('1. Indiranagar Police Station');
    expect(response).toContain('2. Ulsoor Police Station');
    expect(response).toContain('Contact: 112');
  });

  it('formats hospital response matching required schema', () => {
    const places: NearbyPlace[] = [
      {
        id: '201',
        name: 'Manipal Hospital Emergency',
        kind: 'hospital',
        distanceKm: 1.2,
        formattedDistance: '1.2 km',
        address: 'HAL Old Airport Road',
        latitude: 12.96,
        longitude: 77.65,
        phone: '108',
        directionsUrl: 'https://maps.google.com/?q=12.96,77.65',
      },
    ];

    const response = nearbyPlacesService.formatHospitalResponse(places);
    expect(response).toContain('HOSPITAL & MEDICAL AID');
    expect(response).toContain('Nearest hospital:');
    expect(response).toContain('Manipal Hospital Emergency');
    expect(response).toContain('Distance:');
    expect(response).toContain('1.2 km');
  });

  it('handles empty places gracefully without crashing', () => {
    const policeResp = nearbyPlacesService.formatPoliceResponse([], 'Indiranagar 100 Ft Road', mockCoords);
    expect(policeResp).toContain('POLICE INFORMATION');
    expect(policeResp).toContain('112');

    const hospResp = nearbyPlacesService.formatHospitalResponse([], 'Indiranagar 100 Ft Road', mockCoords);
    expect(hospResp).toContain('HOSPITAL & MEDICAL AID');
    expect(hospResp).toContain('108');
  });
});
