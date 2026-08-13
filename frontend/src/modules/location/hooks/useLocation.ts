/**
 * Custom React Hook for GPS Location Intelligence
 */

import { useState, useEffect } from 'react';
import { LocationData } from '../types/location.types';
import { locationService } from '../services/locationService';

export const useLocation = () => {
  const [location, setLocation] = useState<LocationData | null>(locationService.getLastKnownLocation());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function initLocation() {
      setIsLoading(true);
      const granted = await locationService.requestPermissions();
      if (isMounted) setPermissionGranted(granted);

      const loc = await locationService.getCurrentLocation();
      if (isMounted && loc) {
        setLocation(loc);
      }
      if (isMounted) setIsLoading(false);
    }

    initLocation();

    return () => {
      isMounted = false;
    };
  }, []);

  const refreshLocation = async (): Promise<LocationData | null> => {
    setIsLoading(true);
    const loc = await locationService.getCurrentLocation();
    if (loc) setLocation(loc);
    setIsLoading(false);
    return loc;
  };

  return {
    location,
    coordinates: location?.coordinates,
    formattedAddress: location?.address?.formattedAddress || 'Location active',
    isLoading,
    permissionGranted,
    refreshLocation,
  };
};
