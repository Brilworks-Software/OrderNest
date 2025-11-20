import React, { useState, useRef, useMemo } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import { useTables, useUpdateTableStatus } from '@/firebase/hooks/useTable';
import type { Table } from '@/firebase/types';
import { useAuth } from '@/firebase/hooks/useAuth';
import { useUser } from '@/firebase/hooks/useUsers';
import StatusMenuModal from '@/components/StatusMenuModal';
import { Container } from '@/components/Container';

export default function home() {
  const { currentUser } = useAuth();
  const userData = useUser(currentUser?.uid || '').data;
  const restaurantId = userData?.restaurantId || '';

  const { data: tables, isLoading, error } = useTables(restaurantId);
  const updateStatus = useUpdateTableStatus();
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'occupied' | 'reserved'>('all');

  // Filter tables based on selected status - must be called before any early returns
  const filteredTables = useMemo(() => {
    if (!tables) return [];
    if (statusFilter === 'all') return tables;
    return tables.filter(t => t.status === statusFilter);
  }, [tables, statusFilter]);

  if (isLoading) {
    return (
      <Container>
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <View style={styles.center}>
          <Text style={styles.error}>Failed to load tables</Text>
        </View>
      </Container>
    );
  }

  const TableRow = ({ item }: { item: Table }) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const buttonRef = useRef<any>(null);
    const [anchor, setAnchor] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

    const statuses = [
      { key: 'available', label: 'Available' },
      { key: 'occupied', label: 'Occupied' },
      { key: 'reserved', label: 'Reserved' },
    ];

    const openMenu = () => {
      try {
        if (buttonRef.current) {
          if (Platform.OS === 'web') {
            const rect = (buttonRef.current as any).getBoundingClientRect?.();
            if (rect) {
              setAnchor({ x: rect.left, y: rect.top, width: rect.width, height: rect.height });
            }
          } else {
            buttonRef.current.measureInWindow((x: number, y: number, width: number, height: number) => {
              setAnchor({ x, y, width, height });
            });
          }
        }
      } catch (e) {
        console.warn('Failed to measure button position', e);
      } finally {
        setMenuOpen(true);
      }
    };

    const onSelectStatus = (status: string) => {
      if (status === item.status) {
        setMenuOpen(false);
        return;
      }
      updateStatus.mutate({ tableId: item.id, status });
      setMenuOpen(false);
    };

    const getStatusColor = (status: string) => {
      switch (status) {
        case 'available':
          return '#0a84ff';
        case 'occupied':
          return '#ff9f0a';
        case 'reserved':
          return '#af52de';
        default:
          return '#666';
      }
    };

    const statusColor = getStatusColor(item.status);
    const statusIcon = item.status === 'available' ? '✓' : item.status === 'occupied' ? '●' : '🔒';

    return (
      <View style={[styles.row, { borderLeftColor: statusColor }]}>
        <View style={styles.left}>
          <View style={[styles.badge, { backgroundColor: statusColor + '15' }]}>
            <Text style={[styles.badgeText, { color: statusColor }]}>
              {item.table_number ?? item.id}
            </Text>
          </View>
        </View>

        <View style={styles.info}>
          <Text style={styles.title}>{item.table_name ? item.table_name :`Table ${item.table_number ?? item.id}`}</Text>
          <View style={styles.metaRow}>
            <View style={[styles.statusPill, { backgroundColor: statusColor + '20' }]}>
              <Text style={[styles.statusIcon, { color: statusColor, marginRight: 6 }]}>{statusIcon}</Text>
              <Text style={[styles.statusText, { color: statusColor }]}>
                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          ref={buttonRef}
          onPress={openMenu}
          style={[styles.statusButton, { backgroundColor: statusColor }]}
          activeOpacity={0.7}
        >
          <Text style={styles.statusButtonText}>Change</Text>
        </TouchableOpacity>

        <StatusMenuModal
          visible={menuOpen}
          onClose={() => setMenuOpen(false)}
          anchor={anchor}
          options={statuses}
          onSelect={(k) => onSelectStatus(k)}
        />
      </View>
    );
  };

  const getStatusCounts = () => {
    if (!tables) return { available: 0, occupied: 0, reserved: 0, total: 0 };
    return {
      available: tables.filter(t => t.status === 'available').length,
      occupied: tables.filter(t => t.status === 'occupied').length,
      reserved: tables.filter(t => t.status === 'reserved').length,
      total: tables.length,
    };
  };

  const statusCounts = getStatusCounts();

  return (
    <Container>
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <Text style={styles.header}>Tables</Text>
          <Text style={styles.subHeader}>
            {statusFilter === 'all' 
              ? `${statusCounts.total} total` 
              : `${filteredTables.length} ${statusFilter}`}
          </Text>
        </View>

        {/* Status Summary Cards */}
        <View style={styles.summaryContainer}>
          <TouchableOpacity
            style={[
              styles.summaryCard,
              styles.summaryCardAvailable,
              statusFilter === 'available' && styles.summaryCardActive
            ]}
            onPress={() => setStatusFilter(statusFilter === 'available' ? 'all' : 'available')}
            activeOpacity={0.7}
          >
            <Text style={styles.summaryNumber}>{statusCounts.available}</Text>
            <Text style={styles.summaryLabel}>Available</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.summaryCard,
              styles.summaryCardOccupied,
              statusFilter === 'occupied' && styles.summaryCardActive
            ]}
            onPress={() => setStatusFilter(statusFilter === 'occupied' ? 'all' : 'occupied')}
            activeOpacity={0.7}
          >
            <Text style={styles.summaryNumber}>{statusCounts.occupied}</Text>
            <Text style={styles.summaryLabel}>Occupied</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.summaryCard,
              styles.summaryCardReserved,
              statusFilter === 'reserved' && styles.summaryCardActive
            ]}
            onPress={() => setStatusFilter(statusFilter === 'reserved' ? 'all' : 'reserved')}
            activeOpacity={0.7}
          >
            <Text style={styles.summaryNumber}>{statusCounts.reserved}</Text>
            <Text style={styles.summaryLabel}>Reserved</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[
              styles.filterTab,
              statusFilter === 'all' && styles.filterTabActive
            ]}
            onPress={() => setStatusFilter('all')}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.filterTabText,
              statusFilter === 'all' && styles.filterTabTextActive
            ]}>
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterTab,
              statusFilter === 'available' && styles.filterTabActive
            ]}
            onPress={() => setStatusFilter('available')}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.filterTabText,
              statusFilter === 'available' && styles.filterTabTextActive
            ]}>
              Available
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterTab,
              statusFilter === 'occupied' && styles.filterTabActive
            ]}
            onPress={() => setStatusFilter('occupied')}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.filterTabText,
              statusFilter === 'occupied' && styles.filterTabTextActive
            ]}>
              Occupied
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterTab,
              statusFilter === 'reserved' && styles.filterTabActive
            ]}
            onPress={() => setStatusFilter('reserved')}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.filterTabText,
              statusFilter === 'reserved' && styles.filterTabTextActive
            ]}>
              Reserved
            </Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={filteredTables}
          keyExtractor={(t) => t.id}
          renderItem={({ item }) => <TableRow item={item} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🍽️</Text>
              <Text style={styles.emptyTitle}>
                {statusFilter === 'all' 
                  ? 'No tables found' 
                  : `No ${statusFilter} tables`}
              </Text>
              <Text style={styles.emptyMessage}>
                {statusFilter === 'all' 
                  ? 'Tables will appear here once they are added' 
                  : `There are no ${statusFilter} tables at the moment`}
              </Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // padding: 16,
    paddingHorizontal: 16
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
  summaryContainer: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryCardActive: {
    borderWidth: 3,
    borderColor: '#fff',
    transform: [{ scale: 1.05 }],
  },
  summaryCardAvailable: {
    backgroundColor: '#0a84ff',
  },
  summaryCardOccupied: {
    backgroundColor: '#ff9f0a',
  },
  summaryCardReserved: {
    backgroundColor: '#af52de',
  },
  summaryNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
    // textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: "center",
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
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterTabActive: {
    backgroundColor: '#10b981',
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  filterTabTextActive: {
    color: '#fff',
  },
  listContent: {
    paddingBottom: 16,
  },
  row: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  left: {
    marginRight: 16,
  },
  badge: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  badgeText: {
    fontSize: 20,
    fontWeight: '800',
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusIcon: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  statusButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.3,
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
  error: {
    color: '#ff4444',
    fontSize: 16,
    fontWeight: '600',
  },
});