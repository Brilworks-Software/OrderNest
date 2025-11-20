import React, { useState, useMemo } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useOrdersByRestaurant } from '@/firebase/hooks/useOrder';
import { useTables } from '@/firebase/hooks/useTable';
import type { Order } from '@/firebase/types';
import { useAuth } from '@/firebase/hooks/useAuth';
import { useUser, useUsersByRestaurant } from '@/firebase/hooks/useUsers';
import BillModal from '@/components/BillModal';
import { Container } from '@/components/Container';
import { useBillsByOrder } from '@/firebase/hooks/useBill';
import OrderDetailsModal from '@/components/OrderDetailsModal';
import { useMenuItems } from '@/firebase/hooks/useMenuItem';
import { MaterialIcons } from '@expo/vector-icons';
import { ArrowLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function Orders() {
  const { currentUser } = useAuth();
  const userData = useUser(currentUser?.uid || '').data;
  const restaurantId = userData?.restaurantId || '';
  const router = useRouter();

  const { data: orders, isLoading: isLoadingOrders } = useOrdersByRestaurant(restaurantId);
  const { data: tables } = useTables(restaurantId);
  const { data: menuItems } = useMenuItems(restaurantId);
  const { data: allStaff } = useUsersByRestaurant(restaurantId, currentUser?.uid || '');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [billModalVisible, setBillModalVisible] = useState(false);
  const [selectedOrderForBill, setSelectedOrderForBill] = useState<Order | null>(null);
  const [orderFilter, setOrderFilter] = useState<'active' | 'completed'>('active');
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  // Filter active orders (not "completed") and sort by createdAt
  const activeOrders = useMemo(() => {
    if (!orders) return [];

    // Filter active orders (status not 'completed')
    const filtered = orders.filter(order => order.status !== 'completed');

    // Sort by createdAt (oldest first - ascending)
    return filtered.sort((a, b) => {
      const aTime = (a as any).createdAt?.toMillis?.() || 0;
      const bTime = (b as any).createdAt?.toMillis?.() || 0;
      return aTime - bTime; // Oldest first (ascending)
    });
  }, [orders]);

  // Filter completed orders and sort by createdAt
  const completedOrders = useMemo(() => {
    if (!orders) return [];

    // Filter completed orders
    const filtered = orders.filter(order => order.status === 'completed');

    // Sort by createdAt (newest first)
    return filtered.sort((a, b) => {
      const aTime = (a as any).createdAt?.toMillis?.() || 0;
      const bTime = (b as any).createdAt?.toMillis?.() || 0;
      return bTime - aTime; // Newest first
    });
  }, [orders]);

  // Get orders based on current filter
  const displayedOrders = useMemo(() => {
    return orderFilter === 'active' ? activeOrders : completedOrders;
  }, [orderFilter, activeOrders, completedOrders]);

  // Get table number from table_id
  const getTableNumber = (tableId: string) => {
    const table = tables?.find(t => t.id === tableId);
    return table?.table_number ?? tableId;
  };

  // Format time
  const formatTime = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const minutes = Math.floor(diff / 60000);
      
      if (minutes < 1) return 'Just now';
      if (minutes < 60) return `${minutes}m ago`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}h ago`;
      return date.toLocaleDateString();
    } catch {
      return 'Just now';
    }
  };

  // Format full date and time
  const formatFullDateTime = (timestamp: any) => {
    if (!timestamp) return '';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  // Get waiter name
  const getWaiterName = (waiterId: string) => {
    const waiter = allStaff?.find(s => s.id === waiterId);
    return waiter?.name || 'Unknown';
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return '#ff9f0a';
      case 'preparing':
        return '#0a84ff';
      case 'served':
        return '#34c759';
      case 'paid':
        return '#8e8e93';
      case 'completed':
        return '#8e8e93';
      default:
        return '#666';
    }
  };

  const OrderCard = ({ item }: { item: Order }) => {
    const statusColor = getStatusColor(item.status);
    const tableNumber = getTableNumber(item.table_id);
    const timeAgo = formatTime((item as any).createdAt);
    const fullDateTime = formatFullDateTime((item as any).createdAt);
    const itemCount = item.order_items?.reduce((sum, item) => sum + item.qty, 0) || 0;
    const waiterName = getWaiterName(item.waiter_id);
    const isExpanded = expandedOrders.has(item.id);
    
    // Check if bill exists for this order
    const { data: bills } = useBillsByOrder(item.id);
    const billExists = bills && bills.length > 0;
    const bill = billExists ? bills[0] : null;
    
    // Check if all items are delivered
    const allItemsDelivered = useMemo(() => {
      if (!item.order_items || item.order_items.length === 0) return false;
      return item.order_items.every(orderItem => orderItem.delivered === true);
    }, [item.order_items]);

    // Get order items with menu item details
    const orderItemsWithDetails = useMemo(() => {
      if (!item.order_items || !menuItems) return [];
      return item.order_items.map(orderItem => ({
        ...orderItem,
        menuItem: menuItems.find(mi => mi.id === orderItem.menu_item_id),
      }));
    }, [item.order_items, menuItems]);

    // Count delivered vs pending items
    const deliveredCount = item.order_items?.filter(oi => oi.delivered).length || 0;
    const pendingCount = item.order_items?.filter(oi => !oi.delivered).length || 0;
    
    const toggleExpand = () => {
      const newExpanded = new Set(expandedOrders);
      if (isExpanded) {
        newExpanded.delete(item.id);
      } else {
        newExpanded.add(item.id);
      }
      setExpandedOrders(newExpanded);
    };
    
    const handleOrderPress = () => {
      setSelectedOrder(item);
      setModalVisible(true);
    };
    
    const handleGenerateBill = (e: any) => {
      e.stopPropagation();
      if (!allItemsDelivered) {
        Alert.alert('Cannot Generate Bill', 'All items must be delivered before generating a bill.');
        return;
      }
      
      // Show bill modal with calculated bill
      setSelectedOrderForBill(item);
      setBillModalVisible(true);
    };

    const handleViewBill = (e: any) => {
      e.stopPropagation();
      setSelectedOrderForBill(item);
      setBillModalVisible(true);
    };

    return (
      <View style={[styles.orderCard, { borderLeftColor: "#104A9c" }]}>
        <TouchableOpacity 
          activeOpacity={0.7}
          onPress={toggleExpand}
        >
          <View style={styles.orderHeader}>
            <View style={styles.orderHeaderLeft}>
              <View style={[styles.tableBadge, { backgroundColor: "#104A9c" + '15' }]}>
                <Text style={[styles.tableBadgeText, { color: "#104A9c" }]}>
                  {tableNumber}
                </Text>
              </View>
              <View style={styles.orderInfo}>
                <Text style={styles.orderTitle}>Table {tableNumber}</Text>
                <Text style={styles.orderTime}>{timeAgo}</Text>
              </View>
            </View>
            <View style={styles.orderHeaderRight}>
              <View style={[styles.statusBadge, { backgroundColor: "#104A9c" + '20' }]}>
                <Text style={[styles.statusText, { color: "#104A9c" }]}>
                  {item.status}
                </Text>
              </View>
              <MaterialIcons 
                name={isExpanded ? 'expand-less' : 'expand-more'} 
                size={24} 
                color="#6b7280" 
                style={styles.expandIcon}
              />
            </View>
          </View>

          <View style={styles.orderDetails}>
            <View style={styles.orderDetailRow}>
              <Text style={styles.detailLabel}>Items:</Text>
              <Text style={styles.detailValue}>{itemCount} items</Text>
            </View>
            <View style={styles.orderDetailRow}>
              <Text style={styles.detailLabel}>Total:</Text>
              <Text style={styles.detailValue}>₹{item.final_total?.toFixed(2) || '0.00'}</Text>
            </View>
            {billExists && bill && (
              <View style={styles.orderDetailRow}>
                <Text style={styles.detailLabel}>Bill Status:</Text>
                <View style={[styles.paymentStatusBadge, { backgroundColor: "#104A9c20" }]}>
                  <Text style={[styles.paymentStatusText, { color: "#104A9c" }]}>
                    {bill.payment_status}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </TouchableOpacity>

        {/* Expanded Details */}
        {isExpanded && (
          <View style={styles.expandedContent}>
            {/* Order Information */}
            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>Order Information</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Order ID:</Text>
                <Text style={styles.infoValue}>#{item.id.slice(0, 8)}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Date & Time:</Text>
                <Text style={styles.infoValue}>{fullDateTime}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Waiter:</Text>
                <Text style={styles.infoValue}>{waiterName}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Items Status:</Text>
                <Text style={styles.infoValue}>
                  {deliveredCount} delivered, {pendingCount} pending
                </Text>
              </View>
            </View>

            {/* Order Items */}
            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>Order Items</Text>
              {orderItemsWithDetails.map((orderItem, index) => (
                <View key={index} style={styles.orderItemRow}>
                  <View style={styles.orderItemLeft}>
                    <Text style={styles.orderItemName}>
                      {orderItem.menuItem?.name || 'Unknown Item'}
                    </Text>
                    <Text style={styles.orderItemMeta}>
                      {orderItem.qty} × ₹{orderItem.price.toFixed(2)} = ₹{(orderItem.qty * orderItem.price).toFixed(2)}
                    </Text>
                  </View>
                  <View style={[
                    styles.deliveryStatusBadge,
                    { backgroundColor: "#104A9c20" }
                  ]}>
                    <Text style={[
                      styles.deliveryStatusText,
                      { color: "#104A9c" }
                    ]}>
                      {orderItem.delivered ? 'Delivered' : 'Pending'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Price Breakdown */}
            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>Price Breakdown</Text>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Subtotal:</Text>
                <Text style={styles.priceValue}>₹{item.total_amount?.toFixed(2) || '0.00'}</Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>GST ({item.gst_amount && item.total_amount ? ((item.gst_amount / item.total_amount) * 100).toFixed(1) : 0}%):</Text>
                <Text style={styles.priceValue}>₹{item.gst_amount?.toFixed(2) || '0.00'}</Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Service Charge ({item.service_charge_amount && item.total_amount ? ((item.service_charge_amount / item.total_amount) * 100).toFixed(1) : 0}%):</Text>
                <Text style={styles.priceValue}>₹{item.service_charge_amount?.toFixed(2) || '0.00'}</Text>
              </View>
              <View style={[styles.priceRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Grand Total:</Text>
                <Text style={styles.totalValue}>₹{item.final_total?.toFixed(2) || '0.00'}</Text>
              </View>
            </View>

            {/* Bill Information */}
            {billExists && bill && (
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Bill Information</Text>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Bill ID:</Text>
                  <Text style={styles.infoValue}>#{bill.id.slice(0, 8)}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Payment Status:</Text>
                  <View style={[styles.paymentStatusBadge, { backgroundColor: "#104A9c20" }]}>
                    <Text style={[styles.paymentStatusText, { color: "#104A9c" }]}>
                      {bill.payment_status}
                    </Text>
                  </View>
                </View>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Bill Total:</Text>
                  <Text style={styles.priceValue}>₹{bill.total?.toFixed(2) || '0.00'}</Text>
                </View>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>GST:</Text>
                  <Text style={styles.priceValue}>₹{bill.gst?.toFixed(2) || '0.00'}</Text>
                </View>
                {bill.discount > 0 && (
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>Discount:</Text>
                    <Text style={styles.priceValue}>-₹{bill.discount?.toFixed(2) || '0.00'}</Text>
                  </View>
                )}
                <View style={[styles.priceRow, styles.totalRow]}>
                  <Text style={styles.totalLabel}>Grand Total:</Text>
                  <Text style={styles.totalValue}>₹{bill.grand_total?.toFixed(2) || '0.00'}</Text>
                </View>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.viewDetailsButton}
                onPress={handleOrderPress}
                activeOpacity={0.7}
              >
                <MaterialIcons name="visibility" size={18} color="#104A9c" />
                <Text style={styles.viewDetailsButtonText}>View Full Details</Text>
              </TouchableOpacity>
              
              {orderFilter === 'active' && (
                <TouchableOpacity
                  style={[
                    styles.generateBillButton,
                    !allItemsDelivered && styles.generateBillButtonDisabled
                  ]}
                  onPress={handleGenerateBill}
                  disabled={!allItemsDelivered}
                  activeOpacity={0.7}
                >
                  <MaterialIcons 
                    name={billExists ? "receipt" : "receipt-long"} 
                    size={18} 
                    color={!allItemsDelivered ? "#9ca3af" : "#fff"} 
                  />
                  <Text style={[
                    styles.generateBillButtonText,
                    !allItemsDelivered && styles.generateBillButtonTextDisabled
                  ]}>
                    {billExists ? 'View Bill' : 'Generate Bill'}
                  </Text>
                </TouchableOpacity>
              )}
              
              {billExists && orderFilter !== 'active' && (
                <TouchableOpacity
                  style={[styles.viewBillButton, {backgroundColor: "#104A9c"}]}
                  onPress={handleViewBill}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="receipt-long" size={18} color="#fff" />
                  <Text style={[styles.viewBillButtonText, {color: "#fff"}]}>View Bill</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>
    );
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedOrder(null);
  };

  const handleCloseBillModal = () => {
    setBillModalVisible(false);
    setSelectedOrderForBill(null);
  };

  if (isLoadingOrders) {
    return (
      <Container>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#104A9c" />
        </View>
      </Container>
    );
  }

  return (
    <Container>
      <View style={styles.container}>
        {/* <View style={styles.headerContainer}>
          <Text style={styles.header}>Orders</Text>
          <Text style={styles.subHeader}>
            {orderFilter === 'active' 
              ? `${activeOrders.length} active` 
              : `${completedOrders.length} completed`}
          </Text>
        </View> */}
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft />
          </TouchableOpacity>
          <Text style={styles.header}>Menu Items</Text>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[
              styles.filterTab,
              orderFilter === 'active' && styles.filterTabActive
            ]}
            onPress={() => setOrderFilter('active')}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.filterTabText,
              orderFilter === 'active' && styles.filterTabTextActive
            ]}>
              Active ({activeOrders.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterTab,
              orderFilter === 'completed' && styles.filterTabActive
            ]}
            onPress={() => setOrderFilter('completed')}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.filterTabText,
              orderFilter === 'completed' && styles.filterTabTextActive
            ]}>
              Completed ({completedOrders.length})
            </Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={displayedOrders}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <OrderCard item={item} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyTitle}>
                {orderFilter === 'active' 
                  ? 'No active orders' 
                  : 'No completed orders'}
              </Text>
              <Text style={styles.emptyMessage}>
                {orderFilter === 'active' 
                  ? 'Active orders will appear here' 
                  : 'Completed orders will appear here'}
              </Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />

        <OrderDetailsModal
          visible={modalVisible}
          onClose={handleCloseModal}
          order={selectedOrder}
          restaurantId={restaurantId}
        />

        <BillModal
          visible={billModalVisible}
          onClose={handleCloseBillModal}
          order={selectedOrderForBill}
          restaurantId={restaurantId}
          theme='#104A9c'
        />
      </View>
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContainer: {
    marginBottom: 20,
    flexDirection: "row",
    gap:8,
    alignItems: "center"
  },
  header: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1a1a1a',
    letterSpacing: -0.5,
  },
  subHeader: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
    fontWeight: '500',
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: '#104A9c',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  filterTabTextActive: {
    color: '#fff',
  },
  listContent: {
    paddingBottom: 16,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  orderHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  expandIcon: {
    marginLeft: 8,
  },
  tableBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  tableBadgeText: {
    fontSize: 18,
    fontWeight: '800',
  },
  orderInfo: {
    flex: 1,
  },
  orderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  orderTime: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  orderDetails: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
    marginBottom: 12,
  },
  orderDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '700',
  },
  generateBillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#104A9c',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 6,
    flex: 1,
    minWidth: '45%',
  },
  generateBillButtonDisabled: {
    backgroundColor: '#e5e7eb',
  },
  generateBillButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  generateBillButtonTextDisabled: {
    color: '#9ca3af',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  expandedContent: {
    marginTop: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  detailSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '600',
  },
  orderItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  orderItemLeft: {
    flex: 1,
    marginRight: 12,
  },
  orderItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  orderItemMeta: {
    fontSize: 13,
    color: '#6b7280',
  },
  deliveryStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  deliveryStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  priceValue: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '600',
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#104A9c',
  },
  paymentStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  paymentStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#104A9c15',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 6,
    flex: 1,
    minWidth: '45%',
  },
  viewDetailsButtonText: {
    color: '#104A9c',
    fontSize: 14,
    fontWeight: '600',
  },
  viewBillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#104A9c15',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 6,
    flex: 1,
    minWidth: '45%',
  },
  viewBillButtonText: {
    color: '#104A9c',
    fontSize: 14,
    fontWeight: '600',
  },
});

