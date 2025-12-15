import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { usePathname, useSegments } from 'expo-router';
import screenTrackingService from '../services/ScreenTrackingService';
import { ScreenTrackingOptions } from '../services/ScreenTrackingService';

/**
 * Custom hook to automatically track screen views in Expo Router
 * 
 * @example
 * ```tsx
 * // In your root layout or any component
 * useScreenTracking();
 * 
 * // With custom options
 * useScreenTracking({
 *   debounce: true,
 *   debounceDelay: 500,
 *   transformRouteName: (name) => name.toUpperCase()
 * });
 * ```
 */
export const useScreenTracking = (options?: ScreenTrackingOptions) => {
  const pathname = usePathname();
  const segments = useSegments();
  const previousPathname = useRef<string | null>(null);

  useEffect(() => {
    // Initialize with options if provided
    if (options) {
      screenTrackingService.initialize(options);
    }

    // Track screen view when pathname changes
    if (pathname && pathname !== previousPathname.current) {
      // Build a more descriptive screen name from segments
      const screenName = segments.length > 0 
        ? segments.join('/') 
        : pathname;

      screenTrackingService.trackPathname(screenName, {
        pathname: pathname,
        segments: segments.join('/'),
        platform: Platform.OS,
      });

      previousPathname.current = pathname;
    }

    // Cleanup on unmount
    return () => {
      screenTrackingService.cleanup();
    };
  }, [pathname, segments]);

  return {
    trackScreenView: screenTrackingService.trackScreenView.bind(screenTrackingService),
    setEnabled: screenTrackingService.setEnabled.bind(screenTrackingService),
    isEnabled: screenTrackingService.isEnabled.bind(screenTrackingService),
  };
};

