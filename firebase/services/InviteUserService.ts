import {
  collection,
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../config";
import type { InviteUser } from "../types";

export interface CreateInviteUserData {
  name: string;
  email: string;
  type: string; // e.g., "waiter", "manager", "admin", etc.
    restaurantId: string;
    password: string;

}

export default class InviteUserService {
  static readonly COLLECTION_NAME = "invite";

  /**
   * Create a new invited user document
   */
  static async createInviteUser(
    userId: string,
    data: CreateInviteUserData
  ): Promise<Partial<InviteUser>> {
    const docRef = doc(collection(db, this.COLLECTION_NAME), `${userId}-${Math.random().toString(36).substring(2, 20)}`);

    const inviteData = {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(docRef, inviteData);

    return {
      id: userId,
      ...inviteData,
    } as Partial<InviteUser>;
  }
}
