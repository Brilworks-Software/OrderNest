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
// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function AppContent() {
  // Automatically track screen changes
  
  useUserTracking();
  useScreenTracking({
    enabled: true,
    debounce: false, // Set to true if you want to debounce rapid navigation changes
  });

  // Automatically sync user properties with analytics
  useUserTracking();
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

const PostHogUniversalProvider = ({ children }: { children: React.ReactNode }) => {
  if (Platform.OS === 'web') {
    posthog.init(process.env.EXPO_PUBLIC_POST_HOG_API_KEY || "", {
      api_host: 'https://us.i.posthog.com',
      autocapture: true,
        capture_pageview: false, // we’ll control pageview manually
    });

    return children;
  }

  return (
    <PostHogProvider
      apiKey={process.env.EXPO_PUBLIC_POST_HOG_API_KEY || ""}
      options={{ host: 'https://us.i.posthog.com' }}
    >
      {children}
    </PostHogProvider>
  );
};