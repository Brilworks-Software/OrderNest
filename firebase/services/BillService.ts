import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../config';
import type { Bill } from '../types';

/**
 * Input type for creating a bill
 */
export interface CreateBillData {
  order_id: string;
  total: number;
  gst: number;
  discount?: number;
  payment_status?: string; // "Pending" | "Paid" | "Failed"
}

export default class BillService {
  static readonly COLLECTION_NAME = 'bills';

  /**
   * Helper: calculate grand total
   */
  private static calculateGrandTotal(
    total: number,
    gst: number,
    discount: number
  ): number {
    return total + gst - discount;
  }

  /**
   * Create new bill
   */
  static async createBill(billId: string, data: CreateBillData): Promise<Bill> {
    const discount = data.discount ?? 0;
    const payment_status = data.payment_status ?? 'Pending';
    const grand_total = this.calculateGrandTotal(data.total, data.gst, discount);

    const docRef = doc(collection(db, this.COLLECTION_NAME), billId);
    const billData = {
      order_id: data.order_id,
      total: data.total,
      gst: data.gst,
      discount,
      grand_total,
      payment_status,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(docRef, billData);
    return { id: billId, ...billData } as Bill;
  }

  /**
   * Fetch bill by ID
   */
  static async fetchBill(billId: string): Promise<Bill> {
    const docRef = doc(collection(db, this.COLLECTION_NAME), billId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Bill not found');
    return { id: snap.id, ...snap.data() } as Bill;
  }

  /**
   * Update existing bill (e.g., payment status)
   */
  static async updateBill(billId: string, data: Partial<Bill>): Promise<void> {
    const docRef = doc(collection(db, this.COLLECTION_NAME), billId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  }

  /**
   * Delete bill
   */
  static async deleteBill(billId: string): Promise<void> {
    const docRef = doc(collection(db, this.COLLECTION_NAME), billId);
    await deleteDoc(docRef);
  }

  /**
   * Get bills for a specific order
   */
  static async getBillsByOrder(orderId: string): Promise<Bill[]> {
    const q = query(collection(db, this.COLLECTION_NAME), where('order_id', '==', orderId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as Bill[];
  }

  /**
   * Subscribe to real-time bill updates for a given order
   */
  static subscribeToBillsByOrder(
    orderId: string,
    callback: (bills: Bill[]) => void
  ): Unsubscribe {
    const q = query(collection(db, this.COLLECTION_NAME), where('order_id', '==', orderId));
    return onSnapshot(q, snapshot => {
      const bills = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as Bill[];
      callback(bills);
    });
  }

  /**
   * Mark a bill as paid
   */
  static async markAsPaid(billId: string): Promise<void> {
    const docRef = doc(collection(db, this.COLLECTION_NAME), billId);
    await updateDoc(docRef, {
      payment_status: 'Paid',
      updatedAt: serverTimestamp(),
    });
  }
}
