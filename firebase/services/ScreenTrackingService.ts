import analyticsService from './AnalyticsService';
import { Platform } from 'react-native';

export interface ScreenTrackingOptions {
  /**
   * Whether to enable automatic screen tracking
   * @default true
   */
  enabled?: boolean;
  
  /**
   * Whether to log screen views immediately or debounce them
   * @default false
   */
  debounce?: boolean;
  
  /**
   * Debounce delay in milliseconds (only used if debounce is true)
   * @default 300
   */
  debounceDelay?: number;
  
  /**
   * Custom function to transform route names before logging
   */
  transformRouteName?: (routeName: string) => string;
}

class ScreenTrackingService {
  private enabled: boolean = true;
  private debounce: boolean = false;
  private debounceDelay: number = 300;
  private transformRouteName?: (routeName: string) => string;
  private debounceTimer: NodeJS.Timeout | null = null;
  private lastScreenName: string | null = null;

  /**
   * Initialize screen tracking with options
   */
  initialize(options: ScreenTrackingOptions = {}) {
    this.enabled = options.enabled ?? true;
    this.debounce = options.debounce ?? false;
    this.debounceDelay = options.debounceDelay ?? 300;
    this.transformRouteName = options.transformRouteName;
  }

  /**
   * Track a screen view
   * @param screenName - The name of the screen
   * @param screenClass - Optional screen class (defaults to screenName)
   * @param additionalParams - Additional parameters to log with the screen view
   */
  async trackScreenView(
    screenName: string,
    screenClass?: string,
    additionalParams?: Record<string, any>
  ): Promise<void> {
    if (!this.enabled) {
      return;
    }

    // Skip if it's the same screen (unless debouncing)
    if (this.lastScreenName === screenName && !this.debounce) {
      return;
    }

    // Transform route name if custom transformer is provided
    const transformedName = this.transformRouteName
      ? this.transformRouteName(screenName)
      : screenName;

    // Clean up route name (remove leading slashes, replace slashes with underscores)
    const cleanScreenName = this.cleanRouteName(transformedName);
    const cleanScreenClass = screenClass ? this.cleanRouteName(screenClass) : cleanScreenName;

    const screenParams = {
      screen_name: cleanScreenName,
      screen_class: cleanScreenClass,
      ...additionalParams,
    };

    if (this.debounce) {
      // Clear existing timer
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }

      // Set new timer
      this.debounceTimer = setTimeout(async () => {
        await analyticsService.logScreenView(cleanScreenName, cleanScreenClass);
        if (additionalParams) {
          await analyticsService.logEvent('screen_view', screenParams);
        }
        this.lastScreenName = screenName;
      }, this.debounceDelay);
    } else {
      // Log immediately
      await analyticsService.logScreenView(cleanScreenName, cleanScreenClass);
      if (additionalParams) {
        await analyticsService.logEvent('screen_view', screenParams);
      }
      this.lastScreenName = screenName;
    }
  }

  /**
   * Clean route name for analytics
   * Removes leading slashes and replaces slashes with underscores
   */
  private cleanRouteName(routeName: string): string {
    return routeName
      .replace(/^\//, '') // Remove leading slash
      .replace(/\//g, '_') // Replace slashes with underscores
      .replace(/\(|\)/g, '') // Remove parentheses (for route groups)
      .replace(/_+/g, '_') // Replace multiple underscores with single
      .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
  }

  /**
   * Track screen view from Expo Router pathname
   * @param pathname - The pathname from Expo Router (e.g., "/home" or "/(tabs)/home")
   */
  async trackPathname(pathname: string, additionalParams?: Record<string, any>): Promise<void> {
    await this.trackScreenView(pathname, undefined, additionalParams);
  }

  /**
   * Enable or disable screen tracking
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Get current enabled state
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }
}

// Export a singleton instance
const screenTrackingService = new ScreenTrackingService();
export default screenTrackingService;

