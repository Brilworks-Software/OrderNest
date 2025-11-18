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
  DocumentSnapshot,
  Unsubscribe,
  addDoc,
} from 'firebase/firestore';
import { db } from '../config';
import type { Order, OrderItem } from '../types';

/**
 * Type for creating a new order
 */
export interface CreateOrderData {
  table_id: string;
  waiter_id: string;
  order_items: OrderItem[];
  gst_percentage: number;
  service_charge_percentage: number;
  status?: string; // e.g. "Pending", "Preparing", "Served", "Paid"
}

export default class OrderService {
  static readonly COLLECTION_NAME: string = 'orders';

  /**
   * Helper function to calculate billing totals
   */
  private static calculateTotals(
    order_items: OrderItem[],
    gst_percentage: number,
    service_charge_percentage: number
  ) {
    const total_amount = order_items.reduce(
      (sum, item) => sum + item.qty * item.price,
      0
    );

    const gst_amount = (total_amount * gst_percentage) / 100;
    const service_charge_amount = (total_amount * service_charge_percentage) / 100;
    const final_total = total_amount + gst_amount + service_charge_amount;

    return { total_amount, gst_amount, service_charge_amount, final_total };
  }

  /**
   * Create a new order
   */
  static async createOrder(data: CreateOrderData): Promise<Partial<Order>> {
    const { total_amount, gst_amount, service_charge_amount, final_total } =
      this.calculateTotals(
        data.order_items,
        data.gst_percentage,
        data.service_charge_percentage
      );

    const orderData = {
      table_id: data.table_id,
      waiter_id: data.waiter_id,
      order_items: data.order_items,
      total_amount,
      gst_amount,
      service_charge_amount,
      final_total,
      status: data.status ?? 'Pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const orderDocRef = await addDoc(collection(db, this.COLLECTION_NAME), orderData);
    return { id: orderDocRef.id, ...orderData } as Partial<Order>;
  }

  /**
   * Fetch an order by ID
   */
  static async fetchOrder(orderId: string): Promise<Order> {
    const docRef = doc(collection(db, this.COLLECTION_NAME), orderId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Order not found');
    return { id: snap.id, ...snap.data() } as Order;
  }

  /**
   * Update an order (e.g., add items or change status)
   */
  static async updateOrder(orderId: string, data: Partial<Order>): Promise<void> {
    const docRef = doc(collection(db, this.COLLECTION_NAME), orderId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  }

  /**
   * Delete an order
   */
  static async deleteOrder(orderId: string): Promise<void> {
    const docRef = doc(collection(db, this.COLLECTION_NAME), orderId);
    await deleteDoc(docRef);
  }

  /**
   * Get all orders for a specific table
   */
  static async getOrdersByTable(tableId: string): Promise<Order[]> {
    const q = query(collection(db, this.COLLECTION_NAME), where('table_id', '==', tableId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as Order[];
  }

  /**
   * Get all orders by waiter
   */
  static async getOrdersByWaiter(waiterId: string): Promise<Order[]> {
    const q = query(collection(db, this.COLLECTION_NAME), where('waiter_id', '==', waiterId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as Order[];
  }

  /**
   * Subscribe to all orders for a restaurant or table (real-time updates)
   */
  static subscribeToOrdersByTable(
    tableId: string,
    callback: (orders: Order[]) => void
  ): Unsubscribe {
    const q = query(collection(db, this.COLLECTION_NAME), where('table_id', '==', tableId));

    return onSnapshot(q, snapshot => {
      const orders = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as Order[];
      callback(orders);
    });
  }

  /**
   * Subscribe to all orders by waiter (real-time updates)
   */
  static subscribeToOrdersByWaiter(
    waiterId: string,
    callback: (orders: Order[]) => void
  ): Unsubscribe {
    const q = query(collection(db, this.COLLECTION_NAME), where('waiter_id', '==', waiterId));

    return onSnapshot(q, snapshot => {
      const orders = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as Order[];
      callback(orders);
    });
  }

  /**
   * Subscribe to a single order by ID (real-time updates)
   */
  static subscribeToOrder(
    orderId: string,
    callback: (order: Order | null) => void
  ): Unsubscribe {
    const docRef = doc(collection(db, this.COLLECTION_NAME), orderId);

    return onSnapshot(docRef, snapshot => {
      if (snapshot.exists()) {
        callback({ id: snapshot.id, ...snapshot.data() } as Order);
      } else {
        callback(null);
      }
    });
  }

  /**
   * Update order status (e.g., Pending → Preparing → Served → Paid)
   */
  static async updateOrderStatus(orderId: string, status: string): Promise<void> {
    const docRef = doc(collection(db, this.COLLECTION_NAME), orderId);
    await updateDoc(docRef, {
      status,
      updatedAt: serverTimestamp(),
    });
  }

  /**
   * Add new items to an existing order and recalculate totals
   */
  static async addItemsToOrder(
    orderId: string,
    newItems: OrderItem[],
    gst_percentage: number,
    service_charge_percentage: number
  ): Promise<void> {
    const order = await this.fetchOrder(orderId);
    const updatedItems = [...order.order_items, ...newItems];

    const { total_amount, gst_amount, service_charge_amount, final_total } =
      this.calculateTotals(updatedItems, gst_percentage, service_charge_percentage);

    await updateDoc(doc(collection(db, this.COLLECTION_NAME), orderId), {
      order_items: updatedItems,
      total_amount,
      gst_amount,
      service_charge_amount,
      final_total,
      updatedAt: serverTimestamp(),
    });
  }

  /**
   * Get all orders for multiple tables (used for restaurant-wide queries)
   */
  static async getOrdersByTables(tableIds: string[]): Promise<Order[]> {
    if (tableIds.length === 0) return [];
    
    // Firestore 'in' query supports up to 10 items
    // If more than 10 tables, we need to batch the queries
    const batchSize = 10;
    const allOrders: Order[] = [];

    for (let i = 0; i < tableIds.length; i += batchSize) {
      const batch = tableIds.slice(i, i + batchSize);
      const q = query(collection(db, this.COLLECTION_NAME), where('table_id', 'in', batch));
      const snapshot = await getDocs(q);
      const orders = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as Order[];
      allOrders.push(...orders);
    }

    return allOrders;
  }

  /**
   * Subscribe to orders for multiple tables (real-time updates)
   */
  static subscribeToOrdersByTables(
    tableIds: string[],
    callback: (orders: Order[]) => void
  ): Unsubscribe {
    if (tableIds.length === 0) {
      callback([]);
      return () => {};
    }

    // For subscriptions, we need to set up multiple listeners
    // and combine their results
    const unsubscribers: Unsubscribe[] = [];
    const ordersMap = new Map<string, Order>();

    const updateCallback = () => {
      callback(Array.from(ordersMap.values()));
    };

    // Firestore 'in' query supports up to 10 items
    const batchSize = 10;
    for (let i = 0; i < tableIds.length; i += batchSize) {
      const batch = tableIds.slice(i, i + batchSize);
      const q = query(collection(db, this.COLLECTION_NAME), where('table_id', 'in', batch));
      
      const unsub = onSnapshot(q, snapshot => {
        // Remove orders that are no longer in this batch's results
        snapshot.docChanges().forEach(change => {
          if (change.type === 'removed') {
            ordersMap.delete(change.doc.id);
          } else {
            // Add or update order
            const order = {
              id: change.doc.id,
              ...change.doc.data(),
            } as Order;
            ordersMap.set(order.id, order);
          }
        });
        
        updateCallback();
      });
      
      unsubscribers.push(unsub);
    }

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }
}
