import React, { useState, useMemo } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, TouchableOpacity, Alert, Platform } from 'react-native';
import { useOrdersByWaiter } from '@/firebase/hooks/useOrder';
import { useTables } from '@/firebase/hooks/useTable';
import type { Order } from '@/firebase/types';
import { useAuth } from '@/firebase/hooks/useAuth';
import { useUser } from '@/firebase/hooks/useUsers';
import CreateOrderModal from '@/components/CreateOrderModal';
import { Container } from '@/components/Container';
import BillModal from '@/components/BillModal';
import { useBillsByOrder } from '@/firebase/hooks/useBill';

export default function order() {
  const { currentUser } = useAuth();
  const userData = useUser(currentUser?.uid || '').data;
  const restaurantId = userData?.restaurantId || '';
  const waiterId = currentUser?.uid || '';

  const { data: orders, isLoading: isLoadingOrders } = useOrdersByWaiter(waiterId);
  const { data: tables } = useTables(restaurantId);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [billModalVisible, setBillModalVisible] = useState(false);
  const [selectedOrderForBill, setSelectedOrderForBill] = useState<Order | null>(null);
  const [orderFilter, setOrderFilter] = useState<'active' | 'inactive'>('active');

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

  // Filter inactive orders (status "completed") and sort by createdAt
  const inactiveOrders = useMemo(() => {
    if (!orders) return [];

    // Filter inactive orders (status 'completed')
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
    return orderFilter === 'active' ? activeOrders : inactiveOrders;
  }, [orderFilter, activeOrders, inactiveOrders]);

  // Get table number from table_id
  const getTableNumber = (tableId: string) => {
    const table = tables?.find(t => t.id === tableId);
    return table?.table_number ?? tableId;
  };

  const getTableName = (tableId: string) => {
    const table = tables?.find(t => t.id === tableId);
    return table?.table_name ?? `Table ${table?.table_number}`;
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
      default:
        return '#666';
    }
  };

  const OrderCard = ({ item }: { item: Order }) => {
    const statusColor = getStatusColor(item.status);
    const tableNumber = getTableNumber(item.table_id);
    const tableName = getTableName(item.table_id);
    const timeAgo = formatTime((item as any).createdAt);
    const itemCount = item.order_items?.reduce((sum, item) => sum + item.qty, 0) || 0;
    
    // Check if bill exists for this order
    const { data: bills } = useBillsByOrder(item.id);
    const billExists = bills && bills.length > 0;
    
    // Check if all items are delivered
    const allItemsDelivered = useMemo(() => {
      if (!item.order_items || item.order_items.length === 0) return false;
      return item.order_items.every(orderItem => orderItem.delivered === true);
    }, [item.order_items]);
    
    const handleOrderPress = () => {
      setSelectedOrder(item);
      setModalVisible(true);
    };
    
    const handleGenerateBill = () => {
      if (!allItemsDelivered) {
        if(Platform.OS === "web"){
          alert('All items must be delivered before generating a bill.');
        } else{
          Alert.alert('Cannot Generate Bill', 'All items must be delivered before generating a bill.');
        }
        return;
      }
      
      // Show bill modal with calculated bill
      setSelectedOrderForBill(item);
      setBillModalVisible(true);
    };

    return (
      <TouchableOpacity 
        style={[styles.orderCard, { borderLeftColor: "#10b981" }]}
        activeOpacity={0.7}
        onPress={handleOrderPress}
      >
        <View style={styles.orderHeader}>
          <View style={styles.orderHeaderLeft}>
            <View style={[styles.tableBadge, { backgroundColor: "#10b981" + '15' }]}>
              <Text style={[styles.tableBadgeText, { color: "#10b981" }]}>
                {tableNumber}
              </Text>
            </View>
            <View style={styles.orderInfo}>
              <Text style={styles.orderTitle}>{tableName}</Text>
              <Text style={styles.orderTime}>{timeAgo}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: "#10b981" + '20' }]}>
            <Text style={[styles.statusText, { color: "#10b981" }]}>
              {item.status}
            </Text>
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
        </View>
        
        <TouchableOpacity
          style={[
            styles.generateBillButton,
            !allItemsDelivered && styles.generateBillButtonDisabled
          ]}
          onPress={handleGenerateBill}
          disabled={!allItemsDelivered}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.generateBillButtonText,
            !allItemsDelivered && styles.generateBillButtonTextDisabled
          ]}>
            {billExists ? 'View Bill' : 'Generate Bill'}
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const handleCreateOrder = () => {
    setSelectedOrder(null);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedOrder(null);
  };

  if (isLoadingOrders) {
    return (
      <Container>
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      </Container>
    );
  }

  return (
    <Container>
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <Text style={styles.header}>Orders</Text>
          <Text style={styles.subHeader}>
            {orderFilter === 'active' 
              ? `${activeOrders.length} active` 
              : `${inactiveOrders.length} completed`}
          </Text>
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
              orderFilter === 'inactive' && styles.filterTabActive
            ]}
            onPress={() => setOrderFilter('inactive')}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.filterTabText,
              orderFilter === 'inactive' && styles.filterTabTextActive
            ]}>
              Previous ({inactiveOrders.length})
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
                  : 'No previous orders'}
              </Text>
              <Text style={styles.emptyMessage}>
                {orderFilter === 'active' 
                  ? 'Create a new order to get started' 
                  : 'Completed orders will appear here'}
              </Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />

        {orderFilter === 'active' && (
          <TouchableOpacity 
            style={styles.fab} 
            onPress={handleCreateOrder}
            activeOpacity={0.8}
          >
            <Text style={styles.fabText}>+</Text>
          </TouchableOpacity>
        )}

        <CreateOrderModal
          visible={modalVisible}
          onClose={handleCloseModal}
          restaurantId={restaurantId}
          waiterId={waiterId}
          order={selectedOrder || undefined}
        />

        <BillModal
          visible={billModalVisible}
          onClose={() => {
            setBillModalVisible(false);
            setSelectedOrderForBill(null);
          }}
          order={selectedOrderForBill}
          restaurantId={restaurantId}
          theme='#10b981'
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
  },
  header: {
    fontSize: 32,
    fontWeight: '800',
    color: '#333',
    letterSpacing: -0.5,
  },
  subHeader: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    fontWeight: '500',
  },
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterTabActive: {
    backgroundColor: '#10b981',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  filterTabTextActive: {
    color: '#fff',
  },
  listContent: {
    paddingBottom: 80,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    color: '#333',
    marginBottom: 4,
  },
  orderTime: {
    fontSize: 13,
    color: '#666',
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
  },
  orderDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '700',
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
    color: '#333',
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.5,
  },
  fabText: {
    color: '#fff',
    fontSize: 28,
    lineHeight: 30,
    fontWeight: '600',
  },
  generateBillButton: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  generateBillButtonDisabled: {
    backgroundColor: '#e5e5ea',
  },
  generateBillButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  generateBillButtonTextDisabled: {
    color: '#8e8e93',
  },
});

