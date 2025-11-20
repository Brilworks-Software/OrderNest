import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Image,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMenuItems } from '@/firebase/hooks/useMenuItem';
import { useTables } from '@/firebase/hooks/useTable';
import { useUpdateOrder, useOrder } from '@/firebase/hooks/useOrder';
import type { Order, OrderItem, MenuItem } from '@/firebase/types';

interface OrderDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  order: Order | null;
  restaurantId: string;
}

interface OrderItemWithDetails extends OrderItem {
  menuItem?: MenuItem;
}

export default function OrderDetailsChaffModal({
  visible,
  onClose,
  order,
  restaurantId,
}: OrderDetailsModalProps) {
  const { data: menuItems, isLoading: isLoadingMenuItems } = useMenuItems(restaurantId);
  const { data: tables } = useTables(restaurantId);
  const updateOrderMutation = useUpdateOrder();
  const [updatingItemIndex, setUpdatingItemIndex] = useState<number | null>(null);
  
  // Fetch order with real-time subscription if order ID is available
  const { data: realTimeOrder } = useOrder(order?.id || '');
  
  // Use real-time order if available, otherwise fall back to prop
  const currentOrder = realTimeOrder || order;

  // Get table number
  const tableNumber = useMemo(() => {
    if (!currentOrder || !tables) return '';
    const table = tables.find(t => t.id === currentOrder.table_id);
    return table?.table_number || '';
  }, [currentOrder, tables]);

  // Get order items with menu item details
  const orderItemsWithDetails: OrderItemWithDetails[] = useMemo(() => {
    if (!currentOrder?.order_items || !menuItems) return [];
    return currentOrder.order_items.map(item => ({
      ...item,
      menuItem: menuItems.find(mi => mi.id === item.menu_item_id),
    }));
  }, [currentOrder?.order_items, menuItems]);

  // Separate delivered and pending items with original indices
  const deliveredItems = useMemo(() => {
    return orderItemsWithDetails
      .map((item, index) => ({ ...item, originalIndex: index }))
      .filter(item => item.delivered);
  }, [orderItemsWithDetails]);

  const pendingItems = useMemo(() => {
    return orderItemsWithDetails
      .map((item, index) => ({ ...item, originalIndex: index }))
      .filter(item => !item.delivered);
  }, [orderItemsWithDetails]);

  // Handle marking item as delivered
  const handleMarkAsDelivered = async (itemIndex: number) => {
    if (!currentOrder || !currentOrder.order_items) return;

    setUpdatingItemIndex(itemIndex);
    try {
      const updatedItems = [...currentOrder.order_items];
      updatedItems[itemIndex] = {
        ...updatedItems[itemIndex],
        delivered: true,
      };

      await updateOrderMutation.mutateAsync({
        orderId: currentOrder.id,
        updates: {
          order_items: updatedItems,
        },
      });
    } catch (error) {
      console.error('Error marking item as delivered:', error);
    } finally {
      setUpdatingItemIndex(null);
    }
  };

  // Format time
  const formatTime = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleString();
    } catch {
      return 'Just now';
    }
  };

  if (!currentOrder) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <SafeAreaView style={styles.modalContent} edges={['top', 'bottom']}>
          {/* <ScrollView style={{flex:1}} > */}
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>Order Details</Text>
              <Text style={styles.headerSubtitle}>Table {tableNumber}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </Pressable>
          </View>

          {/* Order Info */}
          <View style={styles.orderInfoSection}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Status:</Text>
              <View style={[styles.statusBadge, { backgroundColor: "#ff6b3520" }]}>
                <Text style={[styles.statusText, { color: '#ff6b35' }]}>
                  {currentOrder.status}
                </Text>
              </View>
            </View>
            {(currentOrder as any).createdAt && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Order Time:</Text>
                <Text style={styles.infoValue}>{formatTime((currentOrder as any).createdAt)}</Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Total Items:</Text>
              <Text style={styles.infoValue}>{currentOrder.order_items?.length || 0}</Text>
            </View>
          </View>

          <ScrollView 
            style={styles.scrollView} 
            contentContainerStyle={styles.scrollViewContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Pending Items */}
            {pendingItems.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Items to Prepare ({pendingItems.length})</Text>
                {pendingItems.map((item, index) => {
                  const originalIndex = (item as any).originalIndex ?? -1;
                  
                  return (
                    <View key={`pending-${item.menu_item_id}-${index}`} style={styles.itemCard}>
                      <View style={styles.itemLeft}>
                        {item.menuItem?.image_url ? (
                          <Image
                            source={{ uri: item.menuItem.image_url }}
                            style={styles.itemImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.itemImagePlaceholder}>
                            <Text style={styles.itemImagePlaceholderText}>🍽️</Text>
                          </View>
                        )}
                        <View style={styles.itemInfo}>
                          <Text style={styles.itemName} numberOfLines={2}>
                            {item.menuItem?.name || 'Unknown Item'}
                          </Text>
                          {item.menuItem?.description && (
                            <Text style={styles.itemDescription} numberOfLines={2}>
                              {item.menuItem.description}
                            </Text>
                          )}
                          <View style={styles.itemDetailsRow}>
                            <Text style={styles.itemQuantity}>Qty: {item.qty}</Text>
                            <Text style={styles.itemPrice}>₹{item.price.toFixed(2)} each</Text>
                          </View>
                          <Text style={styles.itemSubtotal}>
                            Subtotal: ₹{(item.price * item.qty).toFixed(2)}
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={[
                          styles.deliveredButton,
                          updatingItemIndex === originalIndex && styles.deliveredButtonDisabled,
                        ]}
                        onPress={() => originalIndex >= 0 && handleMarkAsDelivered(originalIndex)}
                        disabled={updatingItemIndex === originalIndex || updatingItemIndex !== null}
                        activeOpacity={0.7}
                      >
                        {updatingItemIndex === originalIndex ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.deliveredButtonText}>Mark as Delivered</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Delivered Items */}
            {deliveredItems.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Delivered Items ({deliveredItems.length})</Text>
                {deliveredItems.map((item, index) => (
                  <View key={`delivered-${item.menu_item_id}-${index}`} style={[styles.itemCard, styles.deliveredItemCard]}>
                    <View style={styles.itemLeft}>
                      {item.menuItem?.image_url ? (
                        <Image
                          source={{ uri: item.menuItem.image_url }}
                          style={[styles.itemImage, styles.deliveredItemImage]}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={[styles.itemImagePlaceholder, styles.deliveredItemImage]}>
                          <Text style={styles.itemImagePlaceholderText}>🍽️</Text>
                        </View>
                      )}
                      <View style={styles.itemInfo}>
                        <View style={styles.itemNameRow}>
                          <Text style={styles.itemName} numberOfLines={2}>
                            {item.menuItem?.name || 'Unknown Item'}
                          </Text>
                          <View style={styles.deliveredBadge}>
                            <Text style={styles.deliveredBadgeText}>✓ Delivered</Text>
                          </View>
                        </View>
                        {item.menuItem?.description && (
                          <Text style={styles.itemDescription} numberOfLines={2}>
                            {item.menuItem.description}
                          </Text>
                        )}
                        <View style={styles.itemDetailsRow}>
                          <Text style={styles.itemQuantity}>Qty: {item.qty}</Text>
                          <Text style={styles.itemPrice}>₹{item.price.toFixed(2)} each</Text>
                        </View>
                        <Text style={styles.itemSubtotal}>
                          Subtotal: ₹{(item.price * item.qty).toFixed(2)}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Order Summary */}
            <View style={styles.summarySection}>
              <Text style={styles.summaryTitle}>Order Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal:</Text>
                <Text style={styles.summaryValue}>₹{currentOrder.total_amount?.toFixed(2) || '0.00'}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>GST ({currentOrder.gst_amount && currentOrder.total_amount ? ((currentOrder.gst_amount / currentOrder.total_amount) * 100).toFixed(0) : 0}%):</Text>
                <Text style={styles.summaryValue}>₹{currentOrder.gst_amount?.toFixed(2) || '0.00'}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Service Charge:</Text>
                <Text style={styles.summaryValue}>₹{currentOrder.service_charge_amount?.toFixed(2) || '0.00'}</Text>
              </View>
              <View style={[styles.summaryRow, styles.summaryTotalRow]}>
                <Text style={styles.summaryTotalLabel}>Total:</Text>
                <Text style={styles.summaryTotalValue}>₹{currentOrder.final_total?.toFixed(2) || '0.00'}</Text>
              </View>
            </View>
          </ScrollView>
          {/* </ScrollView> */}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: '90%',
    flexDirection: 'column',
    maxHeight: "97%"
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    flexShrink: 0,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#6b7280',
    fontWeight: '600',
  },
  orderInfoSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    flexShrink: 0,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  scrollView: {
    flex: 1,
    flexGrow: 1,
    flexShrink: 1,
  },
  scrollViewContent: {
    paddingBottom: 20,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  itemCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  deliveredItemCard: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    opacity: 0.8,
  },
  itemLeft: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  itemImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemImagePlaceholderText: {
    fontSize: 32,
  },
  deliveredItemImage: {
    opacity: 0.6,
  },
  itemInfo: {
    flex: 1,
  },
  itemNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    flex: 1,
    marginRight: 8,
  },
  deliveredBadge: {
    backgroundColor: '#ff6b35',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  deliveredBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  itemDescription: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
    lineHeight: 16,
  },
  itemDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  itemQuantity: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  itemPrice: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  itemSubtotal: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '700',
    marginTop: 4,
  },
  deliveredButton: {
    backgroundColor: '#ff6b35',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deliveredButtonDisabled: {
    opacity: 0.6,
  },
  deliveredButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  summarySection: {
    padding: 20,
    backgroundColor: '#f8f9fa',
    margin: 20,
    borderRadius: 12,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '600',
  },
  summaryTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 12,
    marginTop: 4,
  },
  summaryTotalLabel: {
    fontSize: 18,
    color: '#1a1a1a',
    fontWeight: '700',
  },
  summaryTotalValue: {
    fontSize: 18,
    color: '#1a1a1a',
    fontWeight: '800',
  },
});

