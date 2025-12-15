import { Platform } from 'react-native';
import { analytics } from '../config';
import { logEvent, setUserId, setUserProperties, setAnalyticsCollectionEnabled } from 'firebase/analytics';
import analyticsModule from '@react-native-firebase/analytics';

/**
 * AnalyticsService - Unified service for Firebase Analytics
 * Supports both web (firebase/analytics) and mobile (@react-native-firebase/analytics)
 */
class AnalyticsService {
  private isWeb = Platform.OS === 'web';
  private isMobile = Platform.OS === 'ios' || Platform.OS === 'android';

  /**
   * Log a custom event
   * @param eventName - Name of the event
   * @param params - Optional event parameters
   */
  async logEvent(eventName: string, params?: Record<string, any>): Promise<void> {
    try {
      if (this.isWeb && analytics) {
        logEvent(analytics, eventName, params);
      } else if (this.isMobile) {
        await analyticsModule().logEvent(eventName, params);
      }
    } catch (error) {
      console.error('Analytics logEvent error:', error);
    }
  }

  /**
   * Set the user ID for analytics
   * @param userId - User ID to set
   */
  async setUserId(userId: string | null): Promise<void> {
    try {
      if (this.isWeb && analytics) {
        setUserId(analytics, userId);
      } else if (this.isMobile) {
        // Mobile analytics accepts string | null, convert undefined to null
        const mobileUserId = userId === undefined ? null : userId;
        await analyticsModule().setUserId(mobileUserId);
      }
    } catch (error) {
      console.error('Analytics setUserId error:', error);
    }
  }

  /**
   * Set user properties
   * @param properties - User properties object
   */
  async setUserProperties(properties: Record<string, any>): Promise<void> {
    try {
      if (this.isWeb && analytics) {
        setUserProperties(analytics, properties);
      } else if (this.isMobile) {
        // For mobile, set properties individually
        for (const [key, value] of Object.entries(properties)) {
          await analyticsModule().setUserProperty(key, String(value));
        }
      }
    } catch (error) {
      console.error('Analytics setUserProperties error:', error);
    }
  }

  /**
   * Log a screen view
   * Uses logEvent with 'screen_view' event name (recommended approach, replaces deprecated logScreenView)
   * @param screenName - Name of the screen
   * @param screenClass - Optional screen class
   */
  async logScreenView(screenName: string, screenClass?: string): Promise<void> {
    try {
      // Use logEvent with 'screen_view' event name for both platforms (non-deprecated approach)
      await this.logEvent('screen_view', {
        screen_name: screenName,
        screen_class: screenClass || screenName,
      });
    } catch (error) {
      console.error('Analytics logScreenView error:', error);
    }
  }

  /**
   * Enable or disable analytics collection
   * @param enabled - Whether to enable analytics collection
   */
  async setAnalyticsCollectionEnabled(enabled: boolean): Promise<void> {
    try {
      if (this.isWeb && analytics) {
        setAnalyticsCollectionEnabled(analytics, enabled);
      } else if (this.isMobile) {
        await analyticsModule().setAnalyticsCollectionEnabled(enabled);
      }
    } catch (error) {
      console.error('Analytics setAnalyticsCollectionEnabled error:', error);
    }
  }

  /**
   * Reset analytics data (useful for logout)
   */
  async resetAnalyticsData(): Promise<void> {
    try {
      if (this.isMobile) {
        await analyticsModule().resetAnalyticsData();
      }
      // Web doesn't have a reset method, but we can clear user ID
      if (this.isWeb && analytics) {
        setUserId(analytics, null);
      }
    } catch (error) {
      console.error('Analytics resetAnalyticsData error:', error);
    }
  }

  /**
   * Log a login event
   * @param method - Login method used
   */
  async logLogin(method?: string): Promise<void> {
    await this.logEvent('login', method ? { method } : undefined);
  }

  /**
   * Log a signup event
   * @param method - Signup method used
   */
  async logSignUp(method?: string): Promise<void> {
    await this.logEvent('sign_up', method ? { method } : undefined);
  }

  /**
   * Log a purchase event
   * @param value - Purchase value
   * @param currency - Currency code (e.g., 'USD')
   * @param items - Array of purchased items
   */
  async logPurchase(
    value: number,
    currency: string = 'USD',
    items?: Array<{ item_id: string; item_name: string; price: number; quantity: number }>
  ): Promise<void> {
    await this.logEvent('purchase', {
      value,
      currency,
      items,
    });
  }

  /**
   * Log an add to cart event
   * @param itemId - Item ID
   * @param itemName - Item name
   * @param value - Item value
   * @param currency - Currency code
   */
  async logAddToCart(
    itemId: string,
    itemName: string,
    value: number,
    currency: string = 'USD'
  ): Promise<void> {
    await this.logEvent('add_to_cart', {
      item_id: itemId,
      item_name: itemName,
      value,
      currency,
    });
  }

  /**
   * Log a view item event
   * @param itemId - Item ID
   * @param itemName - Item name
   * @param itemCategory - Item category
   * @param value - Item value
   * @param currency - Currency code
   */
  async logViewItem(
    itemId: string,
    itemName: string,
    itemCategory?: string,
    value?: number,
    currency: string = 'USD'
  ): Promise<void> {
    await this.logEvent('view_item', {
      item_id: itemId,
      item_name: itemName,
      item_category: itemCategory,
      value,
      currency,
    });
  }
}

export default new AnalyticsService();

