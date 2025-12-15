import { Analytics, logEvent, setUserId, setUserProperties, setAnalyticsCollectionEnabled } from 'firebase/analytics';
import { analytics } from '../config';
import { Platform } from 'react-native';

// Import React Native Firebase Analytics for mobile platforms (modular API)
let nativeAnalytics: any = null;
let getAnalyticsRNFB: (() => any) | null = null;
let setUserIdRNFB: ((analytics: any, userId: string | null) => Promise<void>) | null = null;
let setUserPropertyRNFB: ((analytics: any, name: string, value: string | null) => Promise<void>) | null = null;
let logEventRNFB: ((analytics: any, eventName: string, params?: Record<string, any>) => Promise<void>) | null = null;
let setAnalyticsCollectionEnabledRNFB: ((analytics: any, enabled: boolean) => Promise<void>) | null = null;

if (Platform.OS !== 'web') {
  try {
    const analyticsModule = require('@react-native-firebase/analytics');
    // Use modular API (available in v23+)
    if (analyticsModule.getAnalytics && analyticsModule.setUserId && analyticsModule.setUserProperty && analyticsModule.logEvent) {
      getAnalyticsRNFB = analyticsModule.getAnalytics;
      setUserIdRNFB = analyticsModule.setUserId;
      setUserPropertyRNFB = analyticsModule.setUserProperty;
      logEventRNFB = analyticsModule.logEvent;
      setAnalyticsCollectionEnabledRNFB = analyticsModule.setAnalyticsCollectionEnabled;
      if (getAnalyticsRNFB) {
        nativeAnalytics = getAnalyticsRNFB();
      }
    } else {
      // Fallback to default export (deprecated but still works)
      nativeAnalytics = analyticsModule.default();
    }
  } catch (error) {
    console.warn('@react-native-firebase/analytics not available:', error);
  }
}

export interface AnalyticsService {
  logEvent: (eventName: string, params?: Record<string, any>) => Promise<void>;
  setUserId: (userId: string | null) => Promise<void>;
  setUserProperty: (name: string, value: string | null) => Promise<void>;
  setAnalyticsCollectionEnabled: (enabled: boolean) => Promise<void>;
}

class FirebaseAnalyticsService implements AnalyticsService {
  private analytics: Analytics | null;

  constructor() {
    this.analytics = analytics;
  }

  /**
   * Log a custom event
   * @param eventName - The name of the event
   * @param params - Optional parameters to attach to the event
   */
  async logEvent(eventName: string, params?: Record<string, any>): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        // Web: Use Firebase web SDK
        if (!this.analytics) {
          console.warn('Analytics is not initialized');
          return;
        }
        logEvent(this.analytics, eventName, params);
      } else {
        // Mobile: Use React Native Firebase (modular API)
        if (nativeAnalytics) {
          if (logEventRNFB && nativeAnalytics) {
            // Use modular API: logEvent(analytics, eventName, params)
            await logEventRNFB(nativeAnalytics, eventName, params || {});
          } else {
            // Fallback to deprecated instance method
            await nativeAnalytics.logEvent(eventName, params || {});
          }
        } else {
          if (__DEV__) {
            console.log('[Analytics Event]', eventName, params);
          }
        }
      }
    } catch (error) {
      console.error('Error logging analytics event:', error);
    }
  }

  /**
   * Set the user ID for analytics
   * @param userId - The user ID to set, or null to clear it
   */
  async setUserId(userId: string | null): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        // Web: Use Firebase web SDK
        if (!this.analytics) {
          console.warn('Analytics is not initialized');
          return;
        }
        setUserId(this.analytics, userId);
      } else {
        // Mobile: Use React Native Firebase (modular API)
        if (nativeAnalytics) {
          if (setUserIdRNFB && nativeAnalytics) {
            // Use modular API: setUserId(analytics, userId)
            await setUserIdRNFB(nativeAnalytics, userId);
          } else {
            // Fallback to deprecated instance method
            await nativeAnalytics.setUserId(userId);
          }
        } else {
          if (__DEV__) {
            console.log('[Analytics] Set User ID:', userId);
          }
        }
      }
    } catch (error) {
      console.error('Error setting analytics user ID:', error);
    }
  }

  /**
   * Set a user property
   * @param name - The name of the property
   * @param value - The value of the property, or null to clear it
   */
  async setUserProperty(name: string, value: string | null): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        // Web: Use Firebase web SDK
        if (!this.analytics) {
          console.warn('Analytics is not initialized');
          return;
        }
        setUserProperties(this.analytics, { [name]: value });
      } else {
        // Mobile: Use React Native Firebase (modular API)
        if (nativeAnalytics) {
          if (setUserPropertyRNFB && nativeAnalytics) {
            // Use modular API: setUserProperty(analytics, name, value)
            await setUserPropertyRNFB(nativeAnalytics, name, value);
          } else {
            // Fallback to deprecated instance method
            await nativeAnalytics.setUserProperty(name, value);
          }
        } else {
          if (__DEV__) {
            console.log('[Analytics] Set User Property:', name, value);
          }
        }
      }
    } catch (error) {
      console.error('Error setting analytics user property:', error);
    }
  }

  /**
   * Enable or disable analytics collection
   * @param enabled - Whether to enable analytics collection
   */
  async setAnalyticsCollectionEnabled(enabled: boolean): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        // Web: Use Firebase web SDK
        if (!this.analytics) {
          console.warn('Analytics is not initialized');
          return;
        }
        setAnalyticsCollectionEnabled(this.analytics, enabled);
      } else {
        // Mobile: Use React Native Firebase (modular API)
        if (nativeAnalytics) {
          if (setAnalyticsCollectionEnabledRNFB && nativeAnalytics) {
            // Use modular API: setAnalyticsCollectionEnabled(analytics, enabled)
            await setAnalyticsCollectionEnabledRNFB(nativeAnalytics, enabled);
          } else {
            // Fallback to deprecated instance method
            await nativeAnalytics.setAnalyticsCollectionEnabled(enabled);
          }
        } else {
          if (__DEV__) {
            console.log('[Analytics] Collection Enabled:', enabled);
          }
        }
      }
    } catch (error) {
      console.error('Error setting analytics collection enabled:', error);
    }
  }

  /**
   * Helper method to log screen views
   * @param screenName - The name of the screen
   * @param screenClass - Optional screen class
   */
  async logScreenView(screenName: string, screenClass?: string): Promise<void> {
    await this.logEvent('screen_view', {
      screen_name: screenName,
      screen_class: screenClass || screenName,
    });
  }

  /**
   * Helper method to log user login
   * @param method - The login method used
   */
  async logLogin(method: string): Promise<void> {
    await this.logEvent('login', { method });
  }

  /**
   * Helper method to log user signup
   * @param method - The signup method used
   */
  async logSignUp(method: string): Promise<void> {
    await this.logEvent('sign_up', { method });
  }

  /**
   * Helper method to log button clicks
   * @param buttonName - The name of the button
   * @param location - Optional location context
   */
  async logButtonClick(buttonName: string, location?: string): Promise<void> {
    await this.logEvent('button_click', {
      button_name: buttonName,
      location: location,
    });
  }
}

// Export a singleton instance
const analyticsService = new FirebaseAnalyticsService();
export default analyticsService;

