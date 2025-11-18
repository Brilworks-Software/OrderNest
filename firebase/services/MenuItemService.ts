import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  setDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  DocumentSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../config';
import type { MenuItem } from '../types';

/**
 * Type used for creating a new menu item
 */
export interface CreateMenuItemData {
  restaurant_id: string;
  name: string;
  category: string;
  description?: string;
  price: number;
  image_url?: string;
  available?: boolean;
}

export default class MenuItemService {
  static readonly COLLECTION_NAME: string = 'menu_items';

  /**
   * Create a new menu item
   */
  static async createMenuItem(
    menuItemId: string,
    data: CreateMenuItemData
  ): Promise<Partial<MenuItem>> {
    const menuItemDocRef = doc(collection(db, this.COLLECTION_NAME), menuItemId);

    // Filter out undefined to avoid Firebase errors
    const filteredData = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => value !== undefined)
    );

    const itemProfile = {
      ...filteredData,
      available: filteredData.available ?? true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(menuItemDocRef, itemProfile);
    return { id: menuItemId, ...itemProfile } as Partial<MenuItem>;
  }

  /**
   * Fetch a menu item by ID
   */
  static async fetchMenuItem(menuItemId: string): Promise<MenuItem> {
    const docRef = doc(collection(db, this.COLLECTION_NAME), menuItemId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Menu item not found');
    return { id: snap.id, ...snap.data() } as MenuItem;
  }

  /**
   * Update a menu item
   */
  static async updateMenuItem(menuItemId: string, data: Partial<MenuItem>): Promise<void> {
    const docRef = doc(collection(db, this.COLLECTION_NAME), menuItemId);
    const filteredData = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => value !== undefined)
    );
    await updateDoc(docRef, {
      ...filteredData,
      updatedAt: serverTimestamp(),
    });
  }

  /**
   * Delete a menu item
   */
  static async deleteMenuItem(menuItemId: string): Promise<void> {
    const docRef = doc(collection(db, this.COLLECTION_NAME), menuItemId);
    await deleteDoc(docRef);
  }

  /**
   * Get all menu items for a specific restaurant
   */
  static async getMenuItemsByRestaurant(restaurantId: string): Promise<MenuItem[]> {
    const q = query(
      collection(db, this.COLLECTION_NAME),
      where('restaurant_id', '==', restaurantId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as MenuItem[];
  }

  /**
   * Subscribe to all menu items for a restaurant
   */
  static subscribeToMenuItems(
    restaurantId: string,
    callback: (menuItems: MenuItem[]) => void
  ): Unsubscribe {
    const q = query(
      collection(db, this.COLLECTION_NAME),
      where('restaurant_id', '==', restaurantId)
    );

    return onSnapshot(q, snapshot => {
      const items = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as MenuItem[];
      callback(items);
    });
  }

  /**
   * Upload a menu item image to Firebase Storage and return the download URL
   */
  static async uploadMenuImage(restaurantId: string, fileUri: string): Promise<string> {
    try {
      const fileName = fileUri.substring(fileUri.lastIndexOf('/') + 1);
      const storageRef = ref(storage, `restaurants/${restaurantId}/menu/${fileName}`);

      // Convert file URI to blob
      const response = await fetch(fileUri);
      const blob = await response.blob();

      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);

      return downloadURL;
    } catch (error) {
      console.error('Error uploading menu item image:', error);
      throw error;
    }
  }
}
