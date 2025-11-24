import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  DocumentSnapshot,
  Unsubscribe,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from '../config';
import type { User } from '../types';

export interface CreateUserData {
  email: string;
  type: 'manager' | 'staff' | 'chef';
}

export default class UsersService {
  static readonly COLLECTION_NAME: string = 'users';

  /**
   * Create a new user profile in Firestore
   */
  static async createUser(
    userId: string,
    userData: CreateUserData
  ): Promise<Partial<User>> {
    const userDocRef = doc(collection(db, this.COLLECTION_NAME), userId);
    
    // Filter out undefined values to prevent Firebase errors
    const filteredUserData = Object.fromEntries(
      Object.entries(userData).filter(([_, value]) => value !== undefined)
    );
    
    const userProfile = {
      ...filteredUserData,
      isOnboarded: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(userDocRef, userProfile);
    return { id: userId, ...userProfile } as Partial<User>;
  }

  /**
   * Query function to get a user profile by id
   */
  static async fetchUser(userId: string): Promise<User> {
    const userDocRef = doc(collection(db, this.COLLECTION_NAME), userId);
    const snap = await getDoc(userDocRef);
    if (!snap.exists()) throw new Error('User not found');
    const data = snap.data() || {};
    return { id: snap.id, ...data } as User;
  }

  /**
   * Update a user's profile
   */
  static async updateUser(userId: string, data: Partial<User>): Promise<void> {
    const userDocRef = doc(collection(db, this.COLLECTION_NAME), userId);
    
    // Filter out undefined values to prevent Firebase errors
    const filteredData = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => value !== undefined)
    );
    
    await updateDoc(userDocRef, {
      ...filteredData,
      updatedAt: serverTimestamp(),
    });
  }

  /**
   * Subscribe to a user's profile document
   */
  static subscribeToUser(userId: string, callback: (user: User) => void): Unsubscribe {
    const userDocRef = doc(collection(db, this.COLLECTION_NAME), userId);
    return onSnapshot(
      userDocRef,
      (snap: DocumentSnapshot) => {
        if (snap.exists()) {
          const data = snap.data() || {};
          callback({ id: snap.id, ...data } as User);
        }
      }
    );
  }

  /**
   * Add FCM token to user's token list
   */
  static async addFCMToken(userId: string, token: string): Promise<void> {
    const userDocRef = doc(collection(db, this.COLLECTION_NAME), userId);
    const userSnap = await getDoc(userDocRef);
    
    if (!userSnap.exists()) {
      throw new Error('User not found');
    }
    
    const userData = userSnap.data();
    const currentTokens = userData.fcmToken || [];
    
    // Only add token if it doesn't already exist
    if (!currentTokens.includes(token)) {
      await updateDoc(userDocRef, {
        fcmToken: [...currentTokens, token],
        updatedAt: serverTimestamp(),
      });
    }
  }

  /**
   * Remove FCM token from user's token list
   */
  static async removeFCMToken(userId: string, token: string): Promise<void> {
    const userDocRef = doc(collection(db, this.COLLECTION_NAME), userId);
    const userSnap = await getDoc(userDocRef);
    
    if (!userSnap.exists()) {
      throw new Error('User not found');
    }
    
    const userData = userSnap.data();
    const currentTokens = userData.fcmToken || [];
    
    // Remove the token from the list
    const updatedTokens = currentTokens.filter((t: string) => t !== token);
    
    await updateDoc(userDocRef, {
      fcmToken: updatedTokens,
      updatedAt: serverTimestamp(),
    });
  }

  /**
   * Clear all FCM tokens for a user (useful for signout)
   */
  static async clearFCMTokens(userId: string): Promise<void> {
    const userDocRef = doc(collection(db, this.COLLECTION_NAME), userId);
    await updateDoc(userDocRef, {
      fcmToken: [],
      updatedAt: serverTimestamp(),
    });
  }

  /**
   * Get user's FCM tokens
   */
  static async getFCMTokens(userId: string): Promise<string[]> {
    const userDocRef = doc(collection(db, this.COLLECTION_NAME), userId);
    const userSnap = await getDoc(userDocRef);
    
    if (!userSnap.exists()) {
      throw new Error('User not found');
    }
    
    const userData = userSnap.data();
    return userData.fcmToken || [];
  }

  /**
   * Delete a user's profile document from Firestore.
   * This is best-effort and will throw if deletion fails.
   */
  static async deleteUser(userId: string): Promise<void> {
    const userDocRef = doc(collection(db, this.COLLECTION_NAME), userId);
    await deleteDoc(userDocRef);
  }


  static async fetchAllUsersByRestaurant(restaurantId: string, userId: string): Promise<User[]> {
    const usersQuery = query(
      collection(db, this.COLLECTION_NAME),
      where('restaurantId', '==', restaurantId),
    );
    const querySnapshot = await getDocs(usersQuery);
    const users: User[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data() || {};
      users.push({ id: doc.id, ...data } as User);
    });
    return users.filter(user => user.id !== userId);
  }

  /**
   * Subscribe to all users by restaurant with real-time updates
   */
  static subscribeToUsersByRestaurant(
    restaurantId: string,
    userId: string,
    callback: (users: User[]) => void
  ): Unsubscribe {
    const usersQuery = query(
      collection(db, this.COLLECTION_NAME),
      where('restaurantId', '==', restaurantId),
    );
    return onSnapshot(usersQuery, (querySnapshot) => {
      const users: User[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data() || {};
        users.push({ id: doc.id, ...data } as User);
      });
      // Filter out the current user
      const filteredUsers = users.filter(user => user.id !== userId);
      callback(filteredUsers);
    });
  }
}