import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useScreenTracking } from '@/firebase/hooks/useScreenTracking';
import { useUserTracking } from '@/firebase/hooks/useUserTracking';
import { Platform } from 'react-native';
import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-react-native';
import { useScreenTracking as PostHogScreenTracking } from '@/posthog/useScreenTracking';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

function AppContent() {
  useUserTracking();
  useScreenTracking({
    enabled: true,
    debounce: false, 
  });

  PostHogScreenTracking();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(manager)" />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

// Fixed Provider to prevent Build-time loops
const PostHogUniversalProvider = ({ children }: { children: React.ReactNode }) => {
  // 1. Web initialization guard
  if (Platform.OS === 'web') {
    // ONLY run in browser (window exists) and ONLY if not already loaded
    if (typeof window !== 'undefined' && !posthog.__loaded) {
      posthog.init(process.env.EXPO_PUBLIC_POST_HOG_API_KEY || "", {
        api_host: 'https://us.i.posthog.com',
        autocapture: true,
        capture_pageview: false,
      });
    }
    return <>{children}</>;
  }

  // 2. Mobile initialization
  return (
    <PostHogProvider
      apiKey={process.env.EXPO_PUBLIC_POST_HOG_API_KEY || ""}
      options={{ host: 'https://us.i.posthog.com' }}
    >
      {children}
    </PostHogProvider>
  );
};

export default function RootLayout() {
  useFrameworkReady();

  return (
    <PostHogUniversalProvider>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AppContent />
          <StatusBar style="dark" />
        </QueryClientProvider>
      </SafeAreaProvider>
    </PostHogUniversalProvider>
  );
}