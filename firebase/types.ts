export type User = {
  id: string;
  name: string;
  email: string;
  photoURL: string;
  isOnboarded: boolean;
  type: 'manager' | 'staff' | 'chef';
  fcmToken: string;
  restaurantId: string;
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
};

export type Restaurant = {
  id: string;
  userId: string;
  name: string;
  address: string;
  photoURL?: string;
  gst_number?: string;
  gst_percentage: number;
  service_charge: number;
  legal_docs: string[];
};

export type MenuItem = {
  id: string;
  restaurant_id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  image_url: string;
  available: boolean;
};

export type Table = {
  id: string;
  restaurant_id: string;
  table_number: number;
  table_name: string;
  status: string;
};

export type OrderItem = {
  menu_item_id: string;
  qty: number;
  price: number;
  delivered: boolean;
};

export type Order = {
  id: string;
  table_id: string;
  waiter_id: string;
  order_items: OrderItem[];
  total_amount: number;
  gst_amount: number;
  service_charge_amount: number;
  final_total: number;
  status: 'pending' | 'completed' ;
};

export type Bill = {
  id: string;
  order_id: string;
  total: number;
  gst: number;
  discount: number;
  grand_total: number;
  payment_status: string;
};


export type InviteUser = {
  id: string
  name: string
  email: string
  type: 'staff' | 'chef'
  restaurantId: string
  createdAt: any // Firestore Timestamp
  password: string
}
