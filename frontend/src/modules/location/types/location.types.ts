/**
 * Location Module Type Definitions
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
  altitude?: number | null;
  accuracy?: number | null;
}

export interface AddressDetails {
  street?: string | null;
  city?: string | null;
  region?: string | null;
  postalCode?: string | null;
  country?: string | null;
  formattedAddress: string;
}

export interface LocationData {
  coordinates: Coordinates;
  address?: AddressDetails;
  timestamp: string;
}

export interface NearbyFacility {
  id: string;
  name: string;
  type: 'POLICE' | 'HOSPITAL';
  distanceKm: number;
  latitude: number;
  longitude: number;
  address: string;
  phone: string;
}

export interface LocationContextPayload {
  gps?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  nearestPoliceStation?: {
    name: string;
    distanceKm: number;
    phone?: string;
  };
  nearestHospital?: {
    name: string;
    distanceKm: number;
    phone?: string;
  };
}
