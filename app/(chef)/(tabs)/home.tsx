import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useOrdersByRestaurant } from '@/firebase/hooks/useOrder';
import { useTables } from '@/firebase/hooks/useTable';
import type { Order } from '@/firebase/types';
import { useAuth } from '@/firebase/hooks/useAuth';
import { useUser } from '@/firebase/hooks/useUsers';
import { Container } from '@/components/Container';
import OrderDetailsChaffModal from '@/components/OrderDetailsChaffModal';

export default function home() {
  const { currentUser } = useAuth();
  const userData = useUser(currentUser?.uid || '').data;
  const restaurantId = userData?.restaurantId || '';

  const { data: orders, isLoading: isLoadingOrders } = useOrdersByRestaurant(restaurantId);
  const { data: tables } = useTables(restaurantId);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

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

  // Get table number from table_id
  const tableNumberMap = useMemo(() => {
    if (!tables) return {};
    const map: Record<string, number> = {};
    tables.forEach(t => {
      if (t.id && typeof t.table_number !== 'undefined') {
        map[t.id] = t.table_number;
      }
    });
    return map;
  }, [tables]);

  const getTableNumber = (tableId: string) => {
    return tableNumberMap[tableId] ?? tableId;
  };

  const tableNameMap = useMemo(() => {
    if (!tables) return {};
    const map: Record<string, string> = {};
    tables.forEach(t => {
      if (t.id && typeof t.table_number !== 'undefined') {
        map[t.id] = (t.table_name ? t.table_name : `Table ${t.table_number}`);
      }
    });
    return map;
  }, [tables]);

  const getTableName = (tableId: string) => {
    return tableNameMap[tableId] ?? tableId;
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
        return '#ff6b35';
      case 'preparing':
        return '#0a84ff';
      case 'served':
        return '#34c759';
      case 'paid':
        return '#999';
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
    
    // Count items that need to be prepared (not delivered)
    const itemsToPrepare = item.order_items?.filter(item => !item.delivered).length || 0;

    const handleOrderPress = () => {
      setSelectedOrder(item);
      setModalVisible(true);
    };

    return (
      <TouchableOpacity 
        style={[styles.orderCard, { borderLeftColor: statusColor }]}
        onPress={handleOrderPress}
        activeOpacity={0.7}
      >
        <View style={styles.orderHeader}>
          <View style={styles.orderHeaderLeft}>
            <View style={[styles.tableBadge, { backgroundColor: statusColor + '15' }]}>
              <Text style={[styles.tableBadgeText, { color: statusColor }]}>
                {tableNumber}
              </Text>
            </View>
            <View style={styles.orderInfo}>
              <Text style={styles.orderTitle}>{tableName}</Text>
              <Text style={styles.orderTime}>{timeAgo}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {item.status}
            </Text>
          </View>
        </View>

        <View style={styles.orderDetails}>
          <View style={styles.orderDetailRow}>
            <Text style={styles.detailLabel}>Total Items:</Text>
            <Text style={styles.detailValue}>{itemCount} items</Text>
          </View>
          {itemsToPrepare > 0 && (
            <View style={styles.orderDetailRow}>
              <Text style={styles.detailLabel}>To Prepare:</Text>
              <Text style={[styles.detailValue, styles.pendingItems]}>
                {itemsToPrepare} items
              </Text>
            </View>
          )}
          <View style={styles.orderDetailRow}>
            <Text style={styles.detailLabel}>Total:</Text>
            <Text style={styles.detailValue}>₹{item.final_total?.toFixed(2) || '0.00'}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
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
          <Text style={styles.header}>Active Orders</Text>
          <Text style={styles.subHeader}>
            {activeOrders.length} {activeOrders.length === 1 ? 'order' : 'orders'}
          </Text>
        </View>

        <FlatList
          data={activeOrders}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <OrderCard item={item} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🍳</Text>
              <Text style={styles.emptyTitle}>No active orders</Text>
              <Text style={styles.emptyMessage}>
                New orders will appear here when they are placed
              </Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />

        <OrderDetailsChaffModal
          visible={modalVisible}
          onClose={() => {
            setModalVisible(false);
            setSelectedOrder(null);
          }}
          order={selectedOrder}
          restaurantId={restaurantId}
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
    paddingHorizontal: 4,
  },
  header: {
    fontSize: 22,
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
  listContent: {
    paddingBottom: 16,
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
    borderTopColor: '#e0e0e0',
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
  pendingItems: {
    color: '#ff6b35',
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
});