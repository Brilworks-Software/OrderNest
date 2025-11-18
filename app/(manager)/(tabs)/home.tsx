import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/firebase/hooks/useAuth';
import { useUser } from '@/firebase/hooks/useUsers';
import { useRestaurant } from '@/firebase/hooks/useRestaurant';
import { useOrdersByRestaurant } from '@/firebase/hooks/useOrder';
import { useTables } from '@/firebase/hooks/useTable';
import { useUsersByRestaurant } from '@/firebase/hooks/useUsers';
import { MaterialIcons } from '@expo/vector-icons';
import type { Order } from '@/firebase/types';

export default function home() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const userData = useUser(currentUser?.uid || '').data;
  const restaurantId = userData?.restaurantId || '';
  
  const { data: restaurant, isLoading: isLoadingRestaurant } = useRestaurant(restaurantId);
  const { data: orders, isLoading: isLoadingOrders } = useOrdersByRestaurant(restaurantId);
  const { data: tables, isLoading: isLoadingTables } = useTables(restaurantId);
  const { data: staff, isLoading: isLoadingStaff } = useUsersByRestaurant(restaurantId, currentUser?.uid || '');

  // Calculate statistics
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayOrders = orders?.filter(order => {
      const orderDate = (order as any).createdAt?.toDate?.() || new Date();
      return orderDate >= today;
    }) || [];

    const activeOrders = orders?.filter(order => 
      order.status !== 'completed'
    ) || [];

    const totalRevenue = orders?.reduce((sum, order) => {
      return sum + (order.final_total || 0);
    }, 0) || 0;

    const todayRevenue = todayOrders.reduce((sum, order) => {
      return sum + (order.final_total || 0);
    }, 0);

    const tableStatusCounts = {
      available: tables?.filter(t => t.status === 'available').length || 0,
      occupied: tables?.filter(t => t.status === 'occupied').length || 0,
      reserved: tables?.filter(t => t.status === 'reserved').length || 0,
      total: tables?.length || 0,
    };

    return {
      totalOrders: orders?.length || 0,
      todayOrders: todayOrders.length,
      activeOrders: activeOrders.length,
      totalRevenue,
      todayRevenue,
      totalTables: tableStatusCounts.total,
      availableTables: tableStatusCounts.available,
      occupiedTables: tableStatusCounts.occupied,
      reservedTables: tableStatusCounts.reserved,
      totalStaff: staff?.length || 0,
    };
  }, [orders, tables, staff]);

  // Get recent orders
  const recentOrders = useMemo(() => {
    if (!orders) return [];
    return orders
      .filter(order => order.status !== 'completed')
      .sort((a, b) => {
        const aTime = (a as any).createdAt?.toMillis?.() || 0;
        const bTime = (b as any).createdAt?.toMillis?.() || 0;
        return bTime - aTime; // Newest first
      })
      .slice(0, 5);
  }, [orders]);

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

  // Get table number
  const getTableNumber = (tableId: string) => {
    const table = tables?.find(t => t.id === tableId);
    return table?.table_number ?? tableId;
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

  const isLoading = isLoadingRestaurant || isLoadingOrders || isLoadingTables || isLoadingStaff;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#104A9c" />
        </View>
      </SafeAreaView>
    );
  }

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerContainer}>
          <View>
            <Text style={styles.greeting}>{greeting()}</Text>
            <Text style={styles.restaurantName}>
              {restaurant?.name || 'Restaurant'}
            </Text>
          </View>
        </View>

        {/* Statistics Cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, styles.statCardPrimary]}>
            <View style={styles.statIconContainer}>
              <MaterialIcons name="receipt-long" size={24} color="#104A9c" />
            </View>
            <Text style={styles.statValue}>{stats.activeOrders}</Text>
            <Text style={styles.statLabel}>Active Orders</Text>
            <Text style={styles.statSubLabel}>{stats.todayOrders} today</Text>
          </View>

          <View style={[styles.statCard, styles.statCardSuccess]}>
            <View style={styles.statIconContainer}>
              <MaterialIcons name="table-restaurant" size={24} color="#34c759" />
            </View>
            <Text style={styles.statValue}>{stats.totalTables}</Text>
            <Text style={styles.statLabel}>Total Tables</Text>
            <Text style={styles.statSubLabel}>
              {stats.availableTables} available
            </Text>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={[styles.statCard, styles.statCardWarning]}>
            <View style={styles.statIconContainer}>
              <MaterialIcons name="currency-rupee" size={24} color="#ff9f0a" />
            </View>
            <Text style={styles.statValue}>₹{stats.todayRevenue.toFixed(0)}</Text>
            <Text style={styles.statLabel}>Today's Revenue</Text>
            <Text style={styles.statSubLabel}>
              ₹{stats.totalRevenue.toFixed(0)} total
            </Text>
          </View>

          <View style={[styles.statCard, styles.statCardInfo]}>
            <View style={styles.statIconContainer}>
              <MaterialIcons name="people" size={24} color="#0a84ff" />
            </View>
            <Text style={styles.statValue}>{stats.totalStaff}</Text>
            <Text style={styles.statLabel}>Staff Members</Text>
            <Text style={styles.statSubLabel}>Active team</Text>
          </View>
        </View>

        {/* Quick Access Cards */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Quick Access</Text>
          <View style={styles.quickAccessGrid}>
            <TouchableOpacity
              style={styles.quickAccessCard}
              onPress={() => router.push('/(manager)/orders')}
              activeOpacity={0.7}
            >
              <View style={[styles.quickAccessIcon, { backgroundColor: '#ff6b6b15' }]}>
                <MaterialIcons name="receipt-long" size={28} color="#ff6b6b" />
              </View>
              <Text style={styles.quickAccessLabel}>Orders</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickAccessCard}
              onPress={() => router.push('/(manager)/menuItem')}
              activeOpacity={0.7}
            >
              <View style={[styles.quickAccessIcon, { backgroundColor: '#104A9c15' }]}>
                <MaterialIcons name="restaurant-menu" size={28} color="#104A9c" />
              </View>
              <Text style={styles.quickAccessLabel}>Menu Items</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickAccessCard}
              onPress={() => router.push('/(manager)/tables')}
              activeOpacity={0.7}
            >
              <View style={[styles.quickAccessIcon, { backgroundColor: '#34c75915' }]}>
                <MaterialIcons name="table-restaurant" size={28} color="#34c759" />
              </View>
              <Text style={styles.quickAccessLabel}>Tables</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickAccessCard}
              onPress={() => router.push('/(manager)/(tabs)/users')}
              activeOpacity={0.7}
            >
              <View style={[styles.quickAccessIcon, { backgroundColor: '#0a84ff15' }]}>
                <MaterialIcons name="people" size={28} color="#0a84ff" />
              </View>
              <Text style={styles.quickAccessLabel}>Staff</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickAccessCard}
              onPress={() => router.push('/(manager)/(tabs)/settings')}
              activeOpacity={0.7}
            >
              <View style={[styles.quickAccessIcon, { backgroundColor: '#ff9f0a15' }]}>
                <MaterialIcons name="settings" size={28} color="#ff9f0a" />
              </View>
              <Text style={styles.quickAccessLabel}>Settings</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Table Status Summary */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Table Status</Text>
          <View style={styles.tableStatusContainer}>
            <View style={styles.tableStatusRow}>
              <View style={styles.tableStatusItem}>
                <View style={[styles.tableStatusDot, { backgroundColor: '#34c759' }]} />
                <Text style={styles.tableStatusText}>
                  {stats.availableTables} Available
                </Text>
              </View>
              <View style={styles.tableStatusItem}>
                <View style={[styles.tableStatusDot, { backgroundColor: '#0a84ff' }]} />
                <Text style={styles.tableStatusText}>
                  {stats.occupiedTables} Occupied
                </Text>
              </View>
            </View>
            {stats.reservedTables > 0 && (
              <View style={styles.tableStatusRow}>
                <View style={styles.tableStatusItem}>
                  <View style={[styles.tableStatusDot, { backgroundColor: '#ff9f0a' }]} />
                  <Text style={styles.tableStatusText}>
                    {stats.reservedTables} Reserved
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Recent Orders */}
        {recentOrders.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Orders</Text>
              <TouchableOpacity onPress={() => router.push('/(manager)/orders')}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            {recentOrders.map((order: Order) => {
              const statusColor = getStatusColor(order.status);
              const tableNumber = getTableNumber(order.table_id);
              const timeAgo = formatTime((order as any).createdAt);
              
              return (
                <TouchableOpacity
                  key={order.id}
                  style={[styles.orderCard, { borderLeftColor: statusColor }]}
                  activeOpacity={0.7}
                >
                  <View style={styles.orderCardContent}>
                    <View style={styles.orderCardLeft}>
                      <View style={[styles.orderTableBadge, { backgroundColor: statusColor + '15' }]}>
                        <Text style={[styles.orderTableText, { color: statusColor }]}>
                          {tableNumber}
                        </Text>
                      </View>
                      <View style={styles.orderInfo}>
                        <Text style={styles.orderTableLabel}>Table {tableNumber}</Text>
                        <Text style={styles.orderTime}>{timeAgo}</Text>
                      </View>
                    </View>
                    <View style={styles.orderCardRight}>
                      <View style={[styles.orderStatusBadge, { backgroundColor: statusColor + '20' }]}>
                        <Text style={[styles.orderStatusText, { color: statusColor }]}>
                          {order.status}
                        </Text>
                      </View>
                      <Text style={styles.orderAmount}>
                        ₹{order.final_total?.toFixed(2) || '0.00'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  greeting: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
    marginBottom: 4,
  },
  restaurantName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1a1a1a',
    letterSpacing: -0.5,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statCardPrimary: {
    borderLeftWidth: 4,
    borderLeftColor: '#104A9c',
  },
  statCardSuccess: {
    borderLeftWidth: 4,
    borderLeftColor: '#34c759',
  },
  statCardWarning: {
    borderLeftWidth: 4,
    borderLeftColor: '#ff9f0a',
  },
  statCardInfo: {
    borderLeftWidth: 4,
    borderLeftColor: '#0a84ff',
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  statSubLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  sectionContainer: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#104A9c',
  },
  quickAccessGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickAccessCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  quickAccessIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  quickAccessLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  tableStatusContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  tableStatusRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 12,
  },
  tableStatusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  tableStatusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  tableStatusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  orderCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  orderCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  orderCardRight: {
    alignItems: 'flex-end',
  },
  orderTableBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  orderTableText: {
    fontSize: 16,
    fontWeight: '800',
  },
  orderInfo: {
    flex: 1,
  },
  orderTableLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  orderTime: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  orderStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 6,
  },
  orderStatusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  orderAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
});