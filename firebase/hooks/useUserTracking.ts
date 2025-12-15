import { useEffect } from 'react';
import { useAuth } from './useAuth';
import { useUser } from './useUsers';
import analyticsService from '../services/AnalyticsService';

/**
 * Hook to automatically sync user properties with Firebase Analytics
 * Call this hook in your root layout or main app component to automatically
 * track user properties when user data changes
 * 
 * @example
 * ```tsx
 * // In app/_layout.tsx or main component
 * useUserTracking();
 * ```
 */
export const useUserTracking = () => {
  const { currentUser } = useAuth();
  // Only fetch user data if we have a user ID
  const userId = currentUser?.uid || '';
  const { data: userData } = useUser(userId);

  useEffect(() => {
    if (!currentUser || !userData) {
      return;
    }

    // Sync user properties with analytics
    const syncUserProperties = async () => {
      try {
        // Set user ID
        await analyticsService.setUserId(currentUser.uid);

        // Set user properties from user data
        if (userData.email) {
          await analyticsService.setUserProperty('email', userData.email);
          const emailDomain = userData.email.split('@')[1];
          if (emailDomain) {
            await analyticsService.setUserProperty('email_domain', emailDomain);
          }
        }

        if (userData.name) {
          await analyticsService.setUserProperty('name', userData.name);
        }


        if (userData.isOnboarded !== undefined) {
          await analyticsService.setUserProperty(
            'is_onboarded',
            userData.isOnboarded ? 'true' : 'false'
          );
        }

        // Track user creation date (days since signup)
        if (userData.createdAt) {
          const createdAt = userData.createdAt.toDate
            ? userData.createdAt.toDate()
            : new Date(userData.createdAt);
          const daysSinceSignup = Math.floor(
            (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
          );
          await analyticsService.setUserProperty(
            'days_since_signup',
            daysSinceSignup.toString()
          );
        }
      } catch (error) {
        console.error('Error syncing user properties:', error);
      }
    };

    syncUserProperties();
  }, [currentUser, userData]);
};

/**
 * Helper function to convert age to age range
 */
function getAgeRange(age: number): string {
  if (age < 18) return 'under_18';
  if (age < 25) return '18_24';
  if (age < 35) return '25_34';
  if (age < 45) return '35_44';
  if (age < 55) return '45_54';
  if (age < 65) return '55_64';
  return '65_plus';
}

