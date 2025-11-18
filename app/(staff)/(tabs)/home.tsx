import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import { useTables, useUpdateTableStatus } from '@/firebase/hooks/useTable';
import type { Table } from '@/firebase/types';
import { useAuth } from '@/firebase/hooks/useAuth';
import { useUser } from '@/firebase/hooks/useUsers';
import { SafeAreaView } from 'react-native-safe-area-context';
import StatusMenuModal from '@/components/StatusMenuModal';

export default function home() {
  const { currentUser } = useAuth();
  const userData = useUser(currentUser?.uid || '').data;
  const restaurantId = userData?.restaurantId || '';

  const { data: tables, isLoading, error } = useTables(restaurantId);
  const updateStatus = useUpdateTableStatus();

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <Text style={styles.error}>Failed to load tables</Text>
        </View>
      </SafeAreaView>
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
          <Text style={styles.title}>Table {item.table_number ?? item.id}</Text>
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
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <Text style={styles.header}>Tables</Text>
          <Text style={styles.subHeader}>{statusCounts.total} total</Text>
        </View>

        {/* Status Summary Cards */}
        <View style={styles.summaryContainer}>
          <View style={[styles.summaryCard, styles.summaryCardAvailable]}>
            <Text style={styles.summaryNumber}>{statusCounts.available}</Text>
            <Text style={styles.summaryLabel}>Available</Text>
          </View>
          <View style={[styles.summaryCard, styles.summaryCardOccupied]}>
            <Text style={styles.summaryNumber}>{statusCounts.occupied}</Text>
            <Text style={styles.summaryLabel}>Occupied</Text>
          </View>
          <View style={[styles.summaryCard, styles.summaryCardReserved]}>
            <Text style={styles.summaryNumber}>{statusCounts.reserved}</Text>
            <Text style={styles.summaryLabel}>Reserved</Text>
          </View>
        </View>

        <FlatList
          data={tables ?? []}
          keyExtractor={(t) => t.id}
          renderItem={({ item }) => <TableRow item={item} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🍽️</Text>
              <Text style={styles.emptyTitle}>No tables found</Text>
              <Text style={styles.emptyMessage}>Tables will appear here once they are added</Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
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
    color: '#1a1a1a',
    letterSpacing: -0.5,
  },
  subHeader: {
    fontSize: 14,
    color: '#6b7280',
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
    borderRadius: 16,
    alignItems: 'center',
    marginHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryCardAvailable: {
    backgroundColor: '#e6f4ff',
  },
  summaryCardOccupied: {
    backgroundColor: '#fff4e6',
  },
  summaryCardReserved: {
    backgroundColor: '#f3e8ff',
  },
  summaryNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listContent: {
    paddingBottom: 16,
  },
  row: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
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
    color: '#1a1a1a',
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
    shadowOpacity: 0.15,
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
    color: '#1a1a1a',
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  error: {
    color: '#ff3b30',
    fontSize: 16,
    fontWeight: '600',
  },
});