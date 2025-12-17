import { useEffect } from 'react';
import { Platform } from 'react-native';
import { usePathname, useSegments } from 'expo-router';
import posthogWeb from 'posthog-js';
import { usePostHog } from 'posthog-react-native';

function getScreenName(pathname: string, segments: string[]) {
  if (pathname === '/' || segments.length === 0) return 'Home';

  return segments.filter((s) => !s.startsWith('(')).join('_');
}

export function useScreenTracking() {
  const pathname = usePathname();
  const posthogNative = Platform.OS !== 'web' ? usePostHog() : null;
  const segments = useSegments();
  const screenName = getScreenName(pathname, segments);
  
  useEffect(() => {
    if (!pathname) return;

    // 🌐 WEB
    if (Platform.OS === 'web') {
      posthogWeb.capture('$pageview', {
        path: pathname,
      });
    }

    // 📱 MOBILE
    if (Platform.OS !== 'web' && posthogNative) {
      posthogNative.capture('screen_view', {
        screen: pathname,
        platform: Platform.OS,
        $screen_name: screenName,
      });
    }
  }, [pathname]);
}
