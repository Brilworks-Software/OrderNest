import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  DocumentSnapshot,
  Unsubscribe,
  or,
  orderBy,
} from 'firebase/firestore';
import { db } from '../config';
import type { Table } from '../types';

/**
 * Type used for creating a new table
 */
export interface CreateTableData {
  restaurant_id: string;
  table_number: number;
  assigned_waiter_id?: string;
  status?: string; // e.g., "Empty", "Occupied", "Billed", "Paid"
}

export default class TableService {
  static readonly COLLECTION_NAME: string = 'tables';

  /**
   * Create a new table
   */
  static async createTable(
    tableId: string,
    data: CreateTableData
  ): Promise<Partial<Table>> {
    const tableDocRef = doc(collection(db, this.COLLECTION_NAME), tableId);

    const filteredData = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => value !== undefined)
    );

    const tableData = {
      ...filteredData,
      status: filteredData.status ?? 'Empty',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(tableDocRef, tableData);
    return { id: tableId, ...tableData } as Partial<Table>;
  }

  /**
   * Fetch a table by ID
   */
  static async fetchTable(tableId: string): Promise<Table> {
    const docRef = doc(collection(db, this.COLLECTION_NAME), tableId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Table not found');
    return { id: snap.id, ...snap.data() } as Table;
  }

  /**
   * Update a table
   */
  static async updateTable(tableId: string, data: Partial<Table>): Promise<void> {
    const docRef = doc(collection(db, this.COLLECTION_NAME), tableId);
    const filteredData = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => value !== undefined)
    );
    await updateDoc(docRef, {
      ...filteredData,
      updatedAt: serverTimestamp(),
    });
  }

  /**
   * Delete a table
   */
  static async deleteTable(tableId: string): Promise<void> {
    const docRef = doc(collection(db, this.COLLECTION_NAME), tableId);
    await deleteDoc(docRef);
  }

  /**
   * Fetch all tables for a specific restaurant
   */
  static async getTablesByRestaurant(restaurantId: string): Promise<Table[]> {
    const q = query(
      collection(db, this.COLLECTION_NAME),
      where('restaurant_id', '==', restaurantId),
      orderBy('table_number', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as Table[];
  }

  /**
   * Subscribe to all tables for a restaurant (real-time)
   */
  static subscribeToTables(
    restaurantId: string,
    callback: (tables: Table[]) => void
  ): Unsubscribe {
    const q = query(
      collection(db, this.COLLECTION_NAME),
      where('restaurant_id', '==', restaurantId),
      orderBy('table_number', 'asc')
    );

    return onSnapshot(q, snapshot => {
      const tables = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as Table[];
      callback(tables);
    });
  }

  /**
   * Assign a waiter to a table
   */
  static async assignWaiter(tableId: string, waiterId: string): Promise<void> {
    const docRef = doc(collection(db, this.COLLECTION_NAME), tableId);
    await updateDoc(docRef, {
      assigned_waiter_id: waiterId,
      updatedAt: serverTimestamp(),
    });
  }

  /**
   * Update table status
   * Example status values: "Empty", "Occupied", "Billed", "Paid"
   */
  static async updateTableStatus(tableId: string, status: string): Promise<void> {
    const docRef = doc(collection(db, this.COLLECTION_NAME), tableId);
    await updateDoc(docRef, {
      status,
      updatedAt: serverTimestamp(),
    });
  }
}
