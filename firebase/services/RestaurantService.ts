import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  arrayUnion,
  DocumentSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../config';
import type { Restaurant } from '../types';

export interface CreateRestaurantData {
  name: string;
  address: string;
  gst_number?: string;
  gst_percentage: number;
  service_charge: number;
  description?: string;
  photoURL?: string;
  userId: string;
  // Add other fields as needed
}

export default class RestaurantService {
  static readonly COLLECTION_NAME: string = 'restaurants';

  /**
   * Create a new restaurant profile in Firestore
   */
  static async createRestaurant(
    restaurantId: string,
    restaurantData: CreateRestaurantData
  ): Promise<Partial<Restaurant>> {
    const restaurantDocRef = doc(collection(db, this.COLLECTION_NAME), restaurantId);
    
    // Filter out undefined values to prevent Firebase errors
    const filteredRestaurantData = Object.fromEntries(
      Object.entries(restaurantData).filter(([_, value]) => value !== undefined)
    );
    
    const restaurantProfile = {
      ...filteredRestaurantData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(restaurantDocRef, restaurantProfile);
    return { id: restaurantId, ...restaurantProfile } as Partial<Restaurant>;
  }

  /**
   * Query function to get a restaurant profile by id
   */
  static async fetchRestaurant(restaurantId: string): Promise<Restaurant> {
    const restaurantDocRef = doc(collection(db, this.COLLECTION_NAME), restaurantId);
    const snap = await getDoc(restaurantDocRef);
    if (!snap.exists()) throw new Error('Restaurant not found');
    const data = snap.data() || {};
    return { id: snap.id, ...data } as Restaurant;
  }

  /**
   * Update a restaurant's profile
   */
  static async updateRestaurant(restaurantId: string, data: Partial<Restaurant>): Promise<void> {
    const restaurantDocRef = doc(collection(db, this.COLLECTION_NAME), restaurantId);
    
    // Filter out undefined values to prevent Firebase errors
    const filteredData = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => value !== undefined)
    );
    
    await updateDoc(restaurantDocRef, {
      ...filteredData,
      updatedAt: serverTimestamp(),
    });
  }

  /**
   * Subscribe to a restaurant's profile document
   */
  static subscribeToRestaurant(restaurantId: string, callback: (restaurant: Restaurant) => void): Unsubscribe {
    const restaurantDocRef = doc(collection(db, this.COLLECTION_NAME), restaurantId);
    return onSnapshot(
      restaurantDocRef,
      (snap: DocumentSnapshot) => {
        if (snap.exists()) {
          const data = snap.data() || {};
          callback({ id: snap.id, ...data } as Restaurant);
        }
      }
    );
  }

  /**
   * Upload a legal document (PDF/JPG/PNG)
   * Returns the file download URL
   */
  static async uploadLegalDocument(restaurantId: string, fileUri: string): Promise<string> {
    try {
      const fileName = fileUri.substring(fileUri.lastIndexOf('/') + 1);
      const storageRef = ref(storage, `restaurants/${restaurantId}/legal_docs/${fileName}`);
      // Assuming fileUri is a blob or file; adjust as needed for actual upload
      const response = await fetch(fileUri);
      const blob = await response.blob();
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);

      // Add this URL to the restaurant's legal_docs array
      const restaurantDocRef = doc(collection(db, this.COLLECTION_NAME), restaurantId);
      await updateDoc(restaurantDocRef, {
        legal_docs: arrayUnion(downloadURL),
        updatedAt: serverTimestamp(),
      });

      return downloadURL;
    } catch (error) {
      console.error('Error uploading legal document:', error);
      throw error;
    }
  }

  /**
   * Get all restaurants
   */
  static async getAllRestaurants(): Promise<Restaurant[]> {
    try {
      const querySnapshot = await getDocs(collection(db, this.COLLECTION_NAME));
      return querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Restaurant));
    } catch (error) {
      console.error('Error fetching restaurants:', error);
      throw error;
    }
  }

  /**
   * Delete a restaurant's profile document from Firestore.
   */
  static async deleteRestaurant(restaurantId: string): Promise<void> {
    const restaurantDocRef = doc(collection(db, this.COLLECTION_NAME), restaurantId);
    await deleteDoc(restaurantDocRef);
  }
}
