import { useCallback } from 'react';
import analyticsService from '../services/AnalyticsService';

/**
 * Custom hook for Firebase Analytics
 * Provides easy access to analytics functions in React components
 * 
 * @example
 * ```tsx
 * const { logEvent, logScreenView, setUserId } = useAnalytics();
 * 
 * useEffect(() => {
 *   logScreenView('HomeScreen');
 * }, []);
 * 
 * const handleButtonClick = () => {
 *   logEvent('button_click', { button_name: 'submit' });
 * };
 * ```
 */
export const useAnalytics = () => {
  const logEvent = useCallback(
    (eventName: string, params?: Record<string, any>) => {
      return analyticsService.logEvent(eventName, params);
    },
    []
  );

  const logScreenView = useCallback(
    (screenName: string, screenClass?: string) => {
      return analyticsService.logScreenView(screenName, screenClass);
    },
    []
  );

  const logLogin = useCallback((method: string) => {
    return analyticsService.logLogin(method);
  }, []);

  const logSignUp = useCallback((method: string) => {
    return analyticsService.logSignUp(method);
  }, []);

  const logButtonClick = useCallback(
    (buttonName: string, location?: string) => {
      return analyticsService.logButtonClick(buttonName, location);
    },
    []
  );

  const setUserId = useCallback((userId: string | null) => {
    return analyticsService.setUserId(userId);
  }, []);

  const setUserProperty = useCallback(
    (name: string, value: string | null) => {
      return analyticsService.setUserProperty(name, value);
    },
    []
  );

  const setAnalyticsCollectionEnabled = useCallback((enabled: boolean) => {
    return analyticsService.setAnalyticsCollectionEnabled(enabled);
  }, []);

  return {
    logEvent,
    logScreenView,
    logLogin,
    logSignUp,
    logButtonClick,
    setUserId,
    setUserProperty,
    setAnalyticsCollectionEnabled,
  };
};

