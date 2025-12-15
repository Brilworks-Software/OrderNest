import { useEffect } from 'react';
import { Platform } from 'react-native';
import { usePathname } from 'expo-router';
import posthogWeb from 'posthog-js';
import { usePostHog } from 'posthog-react-native';

export function useScreenTracking() {
  const pathname = usePathname();
  const posthogNative = Platform.OS !== 'web' ? usePostHog() : null;

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
      });
    }
  }, [pathname]);
}
