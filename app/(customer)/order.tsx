import React, { useState, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Pressable,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Container } from '@/components/Container';
import { useTables } from '@/firebase/hooks/useTable';
import { useMenuItems } from '@/firebase/hooks/useMenuItem';
import { useOrdersByTable, useAddItemsToOrder, useUpdateOrder } from '@/firebase/hooks/useOrder';
import { useRestaurant } from '@/firebase/hooks/useRestaurant';
import type { Order, OrderItem, MenuItem, Table } from '@/firebase/types';
import { MaterialIcons } from '@expo/vector-icons';
import { Trash2, Plus, Minus } from 'lucide-react-native';

interface OrderItemWithDetails extends OrderItem {
  menuItem?: MenuItem;
}

export default function CustomerOrder() {
  const params = useLocalSearchParams<{ restaurantId?: string; tableId?: string }>();
  const [selectedTableId, setSelectedTableId] = useState<string>(params.tableId || '');
  const [tableNumberInput, setTableNumberInput] = useState<string>('');
  const [restaurantIdInput, setRestaurantIdInput] = useState<string>(params.restaurantId || '');
  const [restaurantId, setRestaurantId] = useState<string>(params.restaurantId || '');
  const [error, setError] = useState<string | null>(null);

  // Fetch data
  const { data: tables, isLoading: isLoadingTables } = useTables(restaurantId);
  const { data: menuItems, isLoading: isLoadingMenuItems } = useMenuItems(restaurantId);
  const { data: restaurant } = useRestaurant(restaurantId);
  const { data: orders, isLoading: isLoadingOrders } = useOrdersByTable(selectedTableId);
  const addItemsMutation = useAddItemsToOrder();
  const updateOrderMutation = useUpdateOrder();

  // Get current active order (not completed)
  const currentOrder = useMemo(() => {
    if (!orders || orders.length === 0) return null;
    return orders.find(order => order.status !== 'completed') || null;
  }, [orders]);

  // Get selected table
  const selectedTable = useMemo(() => {
    if (!tables || !selectedTableId) return null;
    return tables.find(t => t.id === selectedTableId) || null;
  }, [tables, selectedTableId]);

  // Get order items with menu item details
  const orderItemsWithDetails: OrderItemWithDetails[] = useMemo(() => {
    if (!currentOrder || !menuItems) return [];
    return currentOrder.order_items.map(item => ({
      ...item,
      menuItem: menuItems.find(mi => mi.id === item.menu_item_id),
    }));
  }, [currentOrder, menuItems]);

  // Separate delivered and non-delivered items
  const deliveredItems = useMemo(() => {
    return orderItemsWithDetails.filter(item => item.delivered);
  }, [orderItemsWithDetails]);

  const nonDeliveredItems = useMemo(() => {
    return orderItemsWithDetails.filter(item => !item.delivered);
  }, [orderItemsWithDetails]);

  // Group menu items by category
  const menuItemsByCategory = useMemo(() => {
    if (!menuItems) return {};
    const grouped: { [key: string]: MenuItem[] } = {};
    menuItems.forEach(item => {
      const category = item.category || 'Other';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(item);
    });
    return grouped;
  }, [menuItems]);

  // Calculate totals
  const totals = useMemo(() => {
    if (!currentOrder) return null;
    return {
      total_amount: currentOrder.total_amount,
      gst_amount: currentOrder.gst_amount,
      service_charge_amount: currentOrder.service_charge_amount,
      final_total: currentOrder.final_total,
    };
  }, [currentOrder]);

  // Handle restaurant ID submission
  const handleRestaurantIdSubmit = () => {
    setError(null);
    if (!restaurantIdInput.trim()) {
      setError('Please enter a restaurant ID');
      return;
    }
    setRestaurantId(restaurantIdInput.trim());
  };

  // Handle table selection by number
  const handleTableNumberSubmit = () => {
    setError(null);
    
    if (!restaurantId) {
      setError('Please enter restaurant ID first');
      return;
    }

    if (!tableNumberInput.trim()) {
      setError('Please enter a table number');
      return;
    }

    const tableNum = parseInt(tableNumberInput.trim(), 10);
    if (isNaN(tableNum)) {
      setError('Please enter a valid table number');
      return;
    }

    if (!tables) {
      setError('Tables not loaded yet');
      return;
    }

    const table = tables.find(t => t.table_number === tableNum);
    if (!table) {
      setError(`Table ${tableNum} not found`);
      return;
    }

    if (table.status !== 'occupied') {
      setError(`Table ${tableNum} is not occupied. Please ask staff to create an order first.`);
      return;
    }

    setSelectedTableId(table.id);
    setTableNumberInput('');
  };

  // Handle adding item to order
  const handleAddItem = async (menuItem: MenuItem) => {
    if (!menuItem.available) {
      Alert.alert('Unavailable', 'This item is currently unavailable');
      return;
    }

    if (!currentOrder) {
      Alert.alert('No Order', 'Please wait for staff to create an order first');
      return;
    }

    if (!restaurant) {
      Alert.alert('Error', 'Restaurant information not available');
      return;
    }

    try {
      // Check if item already exists as non-delivered
      const existingNonDeliveredItem = currentOrder.order_items.find(
        item => item.menu_item_id === menuItem.id && !item.delivered
      );

      if (existingNonDeliveredItem) {
        // Update quantity of existing item
        await handleUpdateQuantity(menuItem.id, existingNonDeliveredItem.qty + 1);
      } else {
        // Add new item
        const newItem: OrderItem = {
          menu_item_id: menuItem.id,
          qty: 1,
          price: menuItem.price,
          delivered: false,
        };

        await addItemsMutation.mutateAsync({
          orderId: currentOrder.id,
          newItems: [newItem],
          gst_percentage: restaurant.gst_percentage,
          service_charge_percentage: restaurant.service_charge,
        });
      }
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to add item');
    }
  };

  // Handle updating quantity
  const handleUpdateQuantity = async (menuItemId: string, newQty: number) => {
    if (!currentOrder) return;

    if (newQty <= 0) {
      handleRemoveItem(menuItemId);
      return;
    }

    try {
      const updatedItems = currentOrder.order_items.map(item => {
        if (item.menu_item_id === menuItemId && !item.delivered) {
          return { ...item, qty: newQty };
        }
        return item;
      });

      if (!restaurant) {
        Alert.alert('Error', 'Restaurant information not available');
        return;
      }

      // Recalculate totals
      const total_amount = updatedItems.reduce((sum, item) => sum + item.qty * item.price, 0);
      const gst_amount = (total_amount * restaurant.gst_percentage) / 100;
      const service_charge_amount = (total_amount * restaurant.service_charge) / 100;
      const final_total = total_amount + gst_amount + service_charge_amount;

      await updateOrderMutation.mutateAsync({
        orderId: currentOrder.id,
        updates: {
          order_items: updatedItems,
          total_amount,
          gst_amount,
          service_charge_amount,
          final_total,
        },
      });
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update quantity');
    }
  };

  // Handle removing item
  const handleRemoveItem = async (menuItemId: string) => {
    if (!currentOrder) return;

    try {
      const updatedItems = currentOrder.order_items.filter(
        item => !(item.menu_item_id === menuItemId && !item.delivered)
      );

      if (!restaurant) {
        Alert.alert('Error', 'Restaurant information not available');
        return;
      }

      // Recalculate totals
      const total_amount = updatedItems.reduce((sum, item) => sum + item.qty * item.price, 0);
      const gst_amount = (total_amount * restaurant.gst_percentage) / 100;
      const service_charge_amount = (total_amount * restaurant.service_charge) / 100;
      const final_total = total_amount + gst_amount + service_charge_amount;

      await updateOrderMutation.mutateAsync({
        orderId: currentOrder.id,
        updates: {
          order_items: updatedItems,
          total_amount,
          gst_amount,
          service_charge_amount,
          final_total,
        },
      });
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to remove item');
    }
  };

  // Get quantity of non-delivered item in order
  const getItemQuantity = (menuItemId: string) => {
    if (!currentOrder) return 0;
    const item = currentOrder.order_items.find(
      oi => oi.menu_item_id === menuItemId && !oi.delivered
    );
    return item?.qty || 0;
  };

  const isLoading = isLoadingTables || isLoadingMenuItems || isLoadingOrders;
  const isSubmitting = addItemsMutation.isPending || updateOrderMutation.isPending;

  return (
    <Container>
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Your Order</Text>
        </View>

        {/* Restaurant ID Selection */}
        {!restaurantId && (
          <View style={styles.tableSelectionContainer}>
            <Text style={styles.sectionTitle}>Enter Restaurant ID</Text>
            <Text style={styles.sectionSubtitle}>
              Get this from the QR code or ask your server
            </Text>
            <View style={styles.tableInputContainer}>
              <TextInput
                style={styles.tableInput}
                value={restaurantIdInput}
                onChangeText={setRestaurantIdInput}
                placeholder="Restaurant ID"
                placeholderTextColor="#999"
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleRestaurantIdSubmit}
                disabled={isLoading}
              >
                <Text style={styles.submitButtonText}>Continue</Text>
              </TouchableOpacity>
            </View>
            {error && <Text style={styles.errorText}>{error}</Text>}
          </View>
        )}

        {/* Table Selection */}
        {restaurantId && !selectedTableId && (
          <View style={styles.tableSelectionContainer}>
            <Text style={styles.sectionTitle}>Enter Your Table Number</Text>
            <View style={styles.tableInputContainer}>
              <TextInput
                style={styles.tableInput}
                value={tableNumberInput}
                onChangeText={setTableNumberInput}
                placeholder="Table number"
                keyboardType="number-pad"
                placeholderTextColor="#999"
              />
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleTableNumberSubmit}
                disabled={isLoading}
              >
                <Text style={styles.submitButtonText}>Go</Text>
              </TouchableOpacity>
            </View>
            {error && <Text style={styles.errorText}>{error}</Text>}
            <TouchableOpacity
              style={styles.changeRestaurantButton}
              onPress={() => {
                setRestaurantId('');
                setRestaurantIdInput('');
                setError(null);
              }}
            >
              <Text style={styles.changeRestaurantButtonText}>Change Restaurant</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Selected Table Info */}
        {selectedTableId && selectedTable && (
          <View style={styles.tableInfoContainer}>
            <View style={styles.tableInfo}>
              <MaterialIcons name="table-restaurant" size={24} color="#10b981" />
              <Text style={styles.tableInfoText}>
                Table {selectedTable.table_number} - {selectedTable.table_name}
              </Text>
            </View>
            <View style={styles.tableInfoActions}>
              <TouchableOpacity
                style={styles.changeTableButton}
                onPress={() => {
                  setSelectedTableId('');
                  setError(null);
                }}
              >
                <Text style={styles.changeTableButtonText}>Change Table</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.changeRestaurantButtonSmall}
                onPress={() => {
                  setRestaurantId('');
                  setRestaurantIdInput('');
                  setSelectedTableId('');
                  setError(null);
                }}
              >
                <Text style={styles.changeRestaurantButtonTextSmall}>Change Restaurant</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#10b981" />
          </View>
        ) : selectedTableId && currentOrder ? (
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* Current Order Items */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Current Order</Text>

              {/* Non-delivered Items (Editable) */}
              {nonDeliveredItems.length > 0 && (
                <View style={styles.itemsContainer}>
                  <Text style={styles.itemsSubtitle}>Pending Items</Text>
                  {nonDeliveredItems.map((item, index) => (
                    <View key={`${item.menu_item_id}-${index}`} style={styles.orderItemCard}>
                      <View style={styles.orderItemInfo}>
                        <Text style={styles.orderItemName}>
                          {item.menuItem?.name || 'Unknown Item'}
                        </Text>
                        <Text style={styles.orderItemPrice}>₹{item.price.toFixed(2)} each</Text>
                      </View>
                      <View style={styles.orderItemControls}>
                        <Pressable
                          style={styles.quantityButton}
                          onPress={() => handleUpdateQuantity(item.menu_item_id, item.qty - 1)}
                          disabled={isSubmitting}
                        >
                          <Minus size={18} color="#10b981" />
                        </Pressable>
                        <Text style={styles.quantityText}>{item.qty}</Text>
                        <Pressable
                          style={styles.quantityButton}
                          onPress={() => handleUpdateQuantity(item.menu_item_id, item.qty + 1)}
                          disabled={isSubmitting}
                        >
                          <Plus size={18} color="#10b981" />
                        </Pressable>
                        <Pressable
                          style={styles.removeButton}
                          onPress={() => handleRemoveItem(item.menu_item_id)}
                          disabled={isSubmitting}
                        >
                          <Trash2 size={18} color="#ff3b30" />
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Delivered Items (Read-only, can reorder) */}
              {deliveredItems.length > 0 && (
                <View style={styles.itemsContainer}>
                  <Text style={styles.itemsSubtitle}>Delivered Items</Text>
                  {deliveredItems.map((item, index) => (
                    <View key={`${item.menu_item_id}-${index}`} style={styles.orderItemCardDelivered}>
                      <View style={styles.orderItemInfo}>
                        <Text style={styles.orderItemName}>
                          {item.menuItem?.name || 'Unknown Item'} ✓
                        </Text>
                        <Text style={styles.orderItemPrice}>
                          {item.qty} × ₹{item.price.toFixed(2)} = ₹{(item.qty * item.price).toFixed(2)}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.reorderButton}
                        onPress={() => handleAddItem(item.menuItem!)}
                        disabled={isSubmitting || !item.menuItem?.available}
                      >
                        <Text style={styles.reorderButtonText}>Reorder</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* Order Summary */}
              {totals && (
                <View style={styles.summaryContainer}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Subtotal</Text>
                    <Text style={styles.summaryValue}>₹{totals.total_amount.toFixed(2)}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>GST ({restaurant?.gst_percentage || 0}%)</Text>
                    <Text style={styles.summaryValue}>₹{totals.gst_amount.toFixed(2)}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>
                      Service Charge ({restaurant?.service_charge || 0}%)
                    </Text>
                    <Text style={styles.summaryValue}>₹{totals.service_charge_amount.toFixed(2)}</Text>
                  </View>
                  <View style={[styles.summaryRow, styles.summaryRowTotal]}>
                    <Text style={styles.summaryLabelTotal}>Total</Text>
                    <Text style={styles.summaryValueTotal}>₹{totals.final_total.toFixed(2)}</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Menu Items */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Add More Items</Text>
              {Object.entries(menuItemsByCategory).map(([category, items]) => (
                <View key={category} style={styles.categorySection}>
                  <Text style={styles.categoryTitle}>{category}</Text>
                  {items.map(item => {
                    const itemQty = getItemQuantity(item.id);
                    const isUnavailable = !item.available;

                    return (
                      <View
                        key={item.id}
                        style={[
                          styles.menuItemCard,
                          isUnavailable && styles.menuItemCardUnavailable,
                        ]}
                      >
                        {item.image_url ? (
                          <Image
                            source={{ uri: item.image_url }}
                            style={[
                              styles.menuItemImage,
                              isUnavailable && styles.menuItemImageUnavailable,
                            ]}
                            resizeMode="cover"
                          />
                        ) : (
                          <View
                            style={[
                              styles.menuItemImagePlaceholder,
                              isUnavailable && styles.menuItemImageUnavailable,
                            ]}
                          >
                            <MaterialIcons name="restaurant-menu" size={24} color="#999" />
                          </View>
                        )}
                        <View style={styles.menuItemInfo}>
                          <Text
                            style={[
                              styles.menuItemName,
                              isUnavailable && styles.menuItemNameUnavailable,
                            ]}
                          >
                            {item.name}
                          </Text>
                          {item.description && (
                            <Text
                              style={[
                                styles.menuItemDescription,
                                isUnavailable && styles.menuItemDescriptionUnavailable,
                              ]}
                              numberOfLines={2}
                            >
                              {item.description}
                            </Text>
                          )}
                          <Text
                            style={[
                              styles.menuItemPrice,
                              isUnavailable && styles.menuItemPriceUnavailable,
                            ]}
                          >
                            ₹{item.price.toFixed(2)}
                          </Text>
                        </View>
                        {!isUnavailable && itemQty > 0 ? (
                          <View style={styles.menuItemQuantityControls}>
                            <Pressable
                              style={styles.quantityButton}
                              onPress={() => handleUpdateQuantity(item.id, itemQty - 1)}
                              disabled={isSubmitting}
                            >
                              <Minus size={18} color="#10b981" />
                            </Pressable>
                            <Text style={styles.quantityText}>{itemQty}</Text>
                            <Pressable
                              style={styles.quantityButton}
                              onPress={() => handleAddItem(item)}
                              disabled={isSubmitting}
                            >
                              <Plus size={18} color="#10b981" />
                            </Pressable>
                          </View>
                        ) : !isUnavailable ? (
                          <TouchableOpacity
                            style={styles.addButton}
                            onPress={() => handleAddItem(item)}
                            disabled={isSubmitting}
                          >
                            <Plus size={20} color="#fff" />
                          </TouchableOpacity>
                        ) : (
                          <View style={styles.unavailableButton}>
                            <Text style={styles.unavailableButtonText}>—</Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          </ScrollView>
        ) : selectedTableId && !currentOrder ? (
          <View style={styles.centerContainer}>
            <MaterialIcons name="restaurant-menu" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No active order found</Text>
            <Text style={styles.emptySubtext}>
              Please ask staff to create an order for your table
            </Text>
          </View>
        ) : null}
      </SafeAreaView>
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#333',
  },
  tableSelectionContainer: {
    padding: 16,
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tableInputContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  tableInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: '#ff3b30',
    fontSize: 14,
    marginTop: 8,
  },
  tableInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tableInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tableInfoText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  tableInfoActions: {
    flexDirection: 'row',
    gap: 8,
  },
  changeTableButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
  },
  changeTableButtonText: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '600',
  },
  changeRestaurantButton: {
    marginTop: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  changeRestaurantButtonText: {
    color: '#666',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  changeRestaurantButtonSmall: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
  },
  changeRestaurantButtonTextSmall: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 16,
    backgroundColor: '#fff',
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  itemsContainer: {
    marginBottom: 16,
  },
  itemsSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  orderItemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 8,
  },
  orderItemCardDelivered: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f0f9f4',
    borderRadius: 8,
    marginBottom: 8,
    opacity: 0.8,
  },
  orderItemInfo: {
    flex: 1,
  },
  orderItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  orderItemPrice: {
    fontSize: 14,
    color: '#666',
  },
  orderItemControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    minWidth: 24,
    textAlign: 'center',
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ffebee',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reorderButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#10b981',
  },
  reorderButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  summaryContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryRowTotal: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  summaryLabelTotal: {
    fontSize: 18,
    color: '#333',
    fontWeight: '700',
  },
  summaryValueTotal: {
    fontSize: 18,
    color: '#10b981',
    fontWeight: '700',
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  menuItemCard: {
    flexDirection: 'row',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  menuItemCardUnavailable: {
    opacity: 0.6,
  },
  menuItemImage: {
    width: 80,
    height: 80,
  },
  menuItemImageUnavailable: {
    opacity: 0.5,
  },
  menuItemImagePlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemInfo: {
    flex: 1,
    padding: 12,
  },
  menuItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  menuItemNameUnavailable: {
    color: '#999',
  },
  menuItemDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  menuItemDescriptionUnavailable: {
    color: '#999',
  },
  menuItemPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10b981',
  },
  menuItemPriceUnavailable: {
    color: '#999',
  },
  menuItemQuantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 12,
  },
  unavailableButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 12,
  },
  unavailableButtonText: {
    color: '#999',
    fontSize: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
});
