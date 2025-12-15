import { useCallback } from 'react';
import AnalyticsService from '../services/AnalyticsService';

/**
 * Hook for using Firebase Analytics
 * Provides easy access to analytics methods
 */
export function useAnalytics() {
  const logEvent = useCallback(
    (eventName: string, params?: Record<string, any>) => {
      return AnalyticsService.logEvent(eventName, params);
    },
    []
  );

  const logScreenView = useCallback(
    (screenName: string, screenClass?: string) => {
      return AnalyticsService.logScreenView(screenName, screenClass);
    },
    []
  );

  const setUserId = useCallback((userId: string | null) => {
    return AnalyticsService.setUserId(userId);
  }, []);

  const setUserProperties = useCallback((properties: Record<string, any>) => {
    return AnalyticsService.setUserProperties(properties);
  }, []);

  const logLogin = useCallback((method?: string) => {
    return AnalyticsService.logLogin(method);
  }, []);

  const logSignUp = useCallback((method?: string) => {
    return AnalyticsService.logSignUp(method);
  }, []);

  const logPurchase = useCallback(
    (
      value: number,
      currency?: string,
      items?: Array<{ item_id: string; item_name: string; price: number; quantity: number }>
    ) => {
      return AnalyticsService.logPurchase(value, currency, items);
    },
    []
  );

  const logAddToCart = useCallback(
    (itemId: string, itemName: string, value: number, currency?: string) => {
      return AnalyticsService.logAddToCart(itemId, itemName, value, currency);
    },
    []
  );

  const logViewItem = useCallback(
    (
      itemId: string,
      itemName: string,
      itemCategory?: string,
      value?: number,
      currency?: string
    ) => {
      return AnalyticsService.logViewItem(itemId, itemName, itemCategory, value, currency);
    },
    []
  );

  const resetAnalyticsData = useCallback(() => {
    return AnalyticsService.resetAnalyticsData();
  }, []);

  return {
    logEvent,
    logScreenView,
    setUserId,
    setUserProperties,
    logLogin,
    logSignUp,
    logPurchase,
    logAddToCart,
    logViewItem,
    resetAnalyticsData,
  };
}

