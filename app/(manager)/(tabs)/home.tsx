import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Container } from '@/components/Container';
import { useAuth } from '@/firebase/hooks/useAuth';
import { useUser } from '@/firebase/hooks/useUsers';
import { useRestaurant } from '@/firebase/hooks/useRestaurant';
import { useOrdersByRestaurant } from '@/firebase/hooks/useOrder';
import { useTables } from '@/firebase/hooks/useTable';
import { useUsersByRestaurant } from '@/firebase/hooks/useUsers';
import { MaterialIcons } from '@expo/vector-icons';
import type { Order } from '@/firebase/types';
import { theme, addOpacitySuffix } from '@/theme';

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
      <Container>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary.manager} />
        </View>
      </Container>
    );
  }

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <Container>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerContainer}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.greeting}>{greeting()}</Text>
              <Text style={styles.restaurantName}>
                {restaurant?.name || 'Restaurant'}
              </Text>
            </View>
            <View style={styles.headerBadge}>
              <MaterialIcons name="restaurant" size={20} color={theme.colors.primary.manager} />
            </View>
          </View>
        </View>

        {/* Statistics Cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, styles.statCardPrimary]}>
            <View style={[styles.statIconContainer, { backgroundColor: addOpacitySuffix(theme.colors.primary.manager, 0.1) }]}>
              <MaterialIcons name="receipt-long" size={26} color={theme.colors.primary.manager} />
            </View>
            <Text style={styles.statValue}>{stats.activeOrders}</Text>
            <Text style={styles.statLabel}>Active Orders</Text>
            <Text style={styles.statSubLabel}>{stats.todayOrders} today</Text>
          </View>

          <View style={[styles.statCard, styles.statCardSuccess]}>
            <View style={[styles.statIconContainer, { backgroundColor: addOpacitySuffix(theme.colors.status.success, 0.1) }]}>
              <MaterialIcons name="table-restaurant" size={26} color={theme.colors.status.success} />
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
            <View style={[styles.statIconContainer, { backgroundColor: addOpacitySuffix(theme.colors.status.warning, 0.1) }]}>
              <MaterialIcons name="currency-rupee" size={26} color={theme.colors.status.warning} />
            </View>
            <Text style={styles.statValue}>₹{stats.todayRevenue.toFixed(0)}</Text>
            <Text style={styles.statLabel}>Today's Revenue</Text>
            <Text style={styles.statSubLabel}>
              ₹{stats.totalRevenue.toFixed(0)} total
            </Text>
          </View>

          <View style={[styles.statCard, styles.statCardInfo]}>
            <View style={[styles.statIconContainer, { backgroundColor: addOpacitySuffix(theme.colors.status.info, 0.1) }]}>
              <MaterialIcons name="people" size={26} color={theme.colors.status.info} />
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
              activeOpacity={0.8}
            >
              <View style={[styles.quickAccessIcon, { backgroundColor: addOpacitySuffix(theme.colors.quickAccess.orders, 0.12) }]}>
                <MaterialIcons name="receipt-long" size={30} color={theme.colors.quickAccess.orders} />
              </View>
              <Text style={styles.quickAccessLabel}>Orders</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickAccessCard}
              onPress={() => router.push('/(manager)/menuItem')}
              activeOpacity={0.8}
            >
              <View style={[styles.quickAccessIcon, { backgroundColor: addOpacitySuffix(theme.colors.quickAccess.menu, 0.12) }]}>
                <MaterialIcons name="restaurant-menu" size={30} color={theme.colors.quickAccess.menu} />
              </View>
              <Text style={styles.quickAccessLabel}>Menu Items</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickAccessCard}
              onPress={() => router.push('/(manager)/tables')}
              activeOpacity={0.8}
            >
              <View style={[styles.quickAccessIcon, { backgroundColor: addOpacitySuffix(theme.colors.quickAccess.tables, 0.12) }]}>
                <MaterialIcons name="table-restaurant" size={30} color={theme.colors.quickAccess.tables} />
              </View>
              <Text style={styles.quickAccessLabel}>Tables</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickAccessCard}
              onPress={() => router.push('/(manager)/(tabs)/users')}
              activeOpacity={0.8}
            >
              <View style={[styles.quickAccessIcon, { backgroundColor: addOpacitySuffix(theme.colors.quickAccess.staff, 0.12) }]}>
                <MaterialIcons name="people" size={30} color={theme.colors.quickAccess.staff} />
              </View>
              <Text style={styles.quickAccessLabel}>Staff</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickAccessCard}
              onPress={() => router.push('/(manager)/(tabs)/settings')}
              activeOpacity={0.8}
            >
              <View style={[styles.quickAccessIcon, { backgroundColor: addOpacitySuffix(theme.colors.quickAccess.settings, 0.12) }]}>
                <MaterialIcons name="settings" size={30} color={theme.colors.quickAccess.settings} />
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
                <View style={[styles.tableStatusDot, { backgroundColor: theme.colors.status.available }]} />
                <Text style={styles.tableStatusText}>
                  {stats.availableTables} Available
                </Text>
              </View>
              <View style={styles.tableStatusItem}>
                <View style={[styles.tableStatusDot, { backgroundColor: theme.colors.status.occupied }]} />
                <Text style={styles.tableStatusText}>
                  {stats.occupiedTables} Occupied
                </Text>
              </View>
            </View>
            {stats.reservedTables > 0 && (
              <View style={styles.tableStatusRow}>
                <View style={styles.tableStatusItem}>
                  <View style={[styles.tableStatusDot, { backgroundColor: theme.colors.status.reserved }]} />
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
                  style={[styles.orderCard, { borderLeftColor: "#104A9c" }]}
                  activeOpacity={0.8}
                  onPress={() => router.push(`/(manager)/orders`)}
                >
                  <View style={styles.orderCardContent}>
                    <View style={styles.orderCardLeft}>
                      <View style={[styles.orderTableBadge, { backgroundColor: addOpacitySuffix("#104A9c", 0.15) }]}>
                        <Text style={[styles.orderTableText, { color: "#104A9c" }]}>
                          {tableNumber}
                        </Text>
                      </View>
                      <View style={styles.orderInfo}>
                        <Text style={styles.orderTableLabel}>Table {tableNumber}</Text>
                        <Text style={styles.orderTime}>{timeAgo}</Text>
                      </View>
                    </View>
                    <View style={styles.orderCardRight}>
                      <View style={[styles.orderStatusBadge, { backgroundColor: addOpacitySuffix("#104A9c", 0.2) }]}>
                        <Text style={[styles.orderStatusText, { color: "#104A9c" }]}>
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
    </Container>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: theme.spacing['2xl'],
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    backgroundColor: theme.colors.semantic.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.semantic.border.secondary,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerBadge: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
    backgroundColor: addOpacitySuffix(theme.colors.primary.manager, 0.1),
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.semantic.text.quaternary,
    fontWeight: theme.typography.fontWeight.medium as any,
    marginBottom: theme.spacing.xs,
  },
  restaurantName: {
    fontSize: theme.typography.fontSize['3xl'],
    fontWeight: theme.typography.fontWeight.extrabold as any,
    color: theme.colors.semantic.text.primary,
    letterSpacing: theme.typography.letterSpacing.tight,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.semantic.background.secondary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.base,
    shadowColor: theme.shadows.md.shadowColor,
    shadowOffset: theme.shadows.md.shadowOffset,
    shadowOpacity: theme.shadows.md.shadowOpacity,
    shadowRadius: theme.shadows.md.shadowRadius,
    elevation: theme.shadows.md.elevation,
  },
  statCardPrimary: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary.manager,
  },
  statCardSuccess: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.status.success,
  },
  statCardWarning: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.status.warning,
  },
  statCardInfo: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.status.info,
  },
  statIconContainer: {
    width: 52,
    height: 52,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  statValue: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.extrabold as any,
    color: theme.colors.semantic.text.primary,
    marginBottom: theme.spacing.xs,
  },
  statLabel: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold as any,
    color: theme.colors.semantic.text.primary,
    marginBottom: 2,
  },
  statSubLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.semantic.text.quaternary,
    fontWeight: theme.typography.fontWeight.medium as any,
  },
  sectionContainer: {
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.base,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.extrabold as any,
    color: theme.colors.semantic.text.primary,
    marginBottom: theme.spacing.base,
    letterSpacing: theme.typography.letterSpacing.tight,
  },
  seeAllText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold as any,
    color: theme.colors.primary.manager,
  },
  quickAccessGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  quickAccessCard: {
    flex: 1,
    minWidth: 150,
    backgroundColor: theme.colors.semantic.background.secondary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    shadowColor: theme.shadows.md.shadowColor,
    shadowOffset: theme.shadows.md.shadowOffset,
    shadowOpacity: theme.shadows.md.shadowOpacity,
    shadowRadius: theme.shadows.md.shadowRadius,
    elevation: theme.shadows.md.elevation,
  },
  quickAccessIcon: {
    width: 68,
    height: 68,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  quickAccessLabel: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold as any,
    color: theme.colors.semantic.text.primary,
    textAlign: 'center',
  },
  tableStatusContainer: {
    backgroundColor: theme.colors.semantic.background.secondary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.base,
    shadowColor: theme.shadows.md.shadowColor,
    shadowOffset: theme.shadows.md.shadowOffset,
    shadowOpacity: theme.shadows.md.shadowOpacity,
    shadowRadius: theme.shadows.md.shadowRadius,
    elevation: theme.shadows.md.elevation,
  },
  tableStatusRow: {
    flexDirection: 'row',
    gap: theme.spacing.xl,
    marginBottom: theme.spacing.md,
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
    marginRight: theme.spacing.sm,
  },
  tableStatusText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold as any,
    color: theme.colors.semantic.text.primary,
  },
  orderCard: {
    backgroundColor: theme.colors.semantic.background.secondary,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    borderLeftWidth: 4,
    shadowColor: theme.shadows.sm.shadowColor,
    shadowOffset: theme.shadows.sm.shadowOffset,
    shadowOpacity: theme.shadows.sm.shadowOpacity,
    shadowRadius: theme.shadows.sm.shadowRadius,
    elevation: theme.shadows.sm.elevation,
  },
  orderCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.base,
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
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  orderTableText: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.extrabold as any,
  },
  orderInfo: {
    flex: 1,
  },
  orderTableLabel: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold as any,
    color: theme.colors.semantic.text.primary,
    marginBottom: theme.spacing.xs,
  },
  orderTime: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.semantic.text.quaternary,
    fontWeight: theme.typography.fontWeight.medium as any,
  },
  orderStatusBadge: {
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.xs,
  },
  orderStatusText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold as any,
    textTransform: 'capitalize',
  },
  orderAmount: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold as any,
    color: theme.colors.semantic.text.primary,
  },
});