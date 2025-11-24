import AsyncStorage from '@react-native-async-storage/async-storage';
import { makeAutoObservable } from 'mobx';
import { User } from '../types';
import UserService from '../services/UserService';

export class UserStore {
  user: User | null = null;
  isLoading = false;
  error: string | null = null;

  constructor() {
    makeAutoObservable(this);
    this.initializeUser();
  }

  private async initializeUser() {
    try {
      this.setLoading(true);
      if (typeof window !== 'undefined') {
      let userData = await AsyncStorage.getItem('user_data');
        
      if (userData) {
        this.user = JSON.parse(userData);
      } else {
        // userData = await UserService.fetchUser();
        this.user = userData ? JSON.parse(userData) : null;
      }
      }
    } catch (error) {
      console.error('Failed to initialize user data:', error);
      this.setError('Failed to load user data');
    } finally {
      this.setLoading(false);
    }
  }

  setUser(user: User | null) {
    this.user = user;
    this.error = null;

    if (user) {
      this.persistUser(user);
    } else {
      this.clearPersistedUser();
    }
  }

  updateUser(updates: Partial<User>) {
    if (this.user) {
      this.user = { ...this.user, ...updates };
      this.persistUser(this.user);
    }
  }

  clearUser() {
    this.user = null;
    this.error = null;
    this.isLoading = false;
    this.clearPersistedUser();
  }

  setLoading(loading: boolean) {
    this.isLoading = loading;
  }

  setError(error: string | null) {
    this.error = error;
  }

  private async persistUser(user: User) {
    try {
      if (typeof window !== 'undefined') {
        await AsyncStorage.setItem('user_data', JSON.stringify(user));
        // Save user type separately
        if (user.type) {
          await AsyncStorage.setItem('user_type', user.type);
        }
      }
    } catch (error) {
      console.error('Failed to persist user data:', error);
      this.setError('Failed to save user data');
    }
  }

  private async clearPersistedUser() {
    try {
      if (typeof window !== 'undefined') {
        await AsyncStorage.removeItem('user_data');
        await AsyncStorage.removeItem('user_type');
      }
    } catch (error) {
      console.error('Failed to clear user data:', error);
    }
  }

  // Computed values
  get isUserLoaded() {
    return !this.isLoading && this.user !== null;
  }

  get userName() {
    return this.user?.name || '';
  }

  get userEmail() {
    return this.user?.email || '';
  }

  /**
   * Get user type from AsyncStorage
   */
  static async getUserType(): Promise<'manager' | 'staff' | 'chef' | null> {
    try {
      if (typeof window !== 'undefined') {
        const userType = await AsyncStorage.getItem('user_type');
        return userType as 'manager' | 'staff' | 'chef' | null;
      }
      return null;
    } catch (error) {
      console.error('Failed to get user type from AsyncStorage:', error);
      return null;
    }
  }
}

export const userStore = new UserStore();
