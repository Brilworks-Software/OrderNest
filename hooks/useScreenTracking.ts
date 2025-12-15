import { useEffect, useRef } from 'react';
import { usePathname, useSegments } from 'expo-router';
import AnalyticsService from '@/firebase/services/AnalyticsService';

/**
 * Hook to automatically track screen views in Expo Router
 * Tracks screen navigation automatically when the pathname changes
 */
export function useScreenTracking() {
  const pathname = usePathname();
  const segments = useSegments();
  const previousPathname = useRef<string | null>(null);

  useEffect(() => {
    // Skip if pathname hasn't changed
    if (pathname === previousPathname.current) {
      return;
    }

    // Skip initial mount if pathname is null or empty
    if (!pathname) {
      return;
    }

    // Update the previous pathname
    previousPathname.current = pathname;

    // Format screen name from segments or pathname
    const screenName = formatScreenName(pathname, segments);

    // Log the screen view
    AnalyticsService.logScreenView(screenName).catch((error) => {
      console.error('Failed to log screen view:', error);
    });
  }, [pathname, segments]);
}

/**
 * Format the screen name from pathname and segments
 * @param pathname - Current pathname
 * @param segments - Current route segments
 * @returns Formatted screen name
 */
function formatScreenName(pathname: string, segments: string[]): string {
  // Remove leading slash and format
  let screenName = pathname.replace(/^\//, '');

  // If empty, use segments
  if (!screenName && segments.length > 0) {
    screenName = segments.join('/');
  }

  // If still empty, use 'home' or 'index'
  if (!screenName) {
    screenName = 'index';
  }

  // Replace slashes with underscores for better readability in analytics
  screenName = screenName.replace(/\//g, '_');

  // Capitalize first letter of each segment
  screenName = screenName
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');

  return screenName || 'Unknown Screen';
}

