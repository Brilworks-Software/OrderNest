import React, { useState, useMemo } from 'react'
import {
  StyleSheet,
  Text,
  View,
  Modal,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTables, useUpdateTableStatus } from '@/firebase/hooks/useTable'
import { useMenuItems } from '@/firebase/hooks/useMenuItem'
import { useRestaurant } from '@/firebase/hooks/useRestaurant'
import { useCreateOrder, useUpdateOrder } from '@/firebase/hooks/useOrder'
import type { OrderItem, MenuItem, Table, Order } from '@/firebase/types'
import { Trash2 } from 'lucide-react-native'

interface CreateOrderModalProps {
  visible: boolean
  onClose: () => void
  restaurantId: string
  waiterId: string
  order?: Order // Optional order for edit mode
}

interface OrderItemWithDetails extends OrderItem {
  menuItem?: MenuItem
}

export default function CreateOrderModal({
  visible,
  onClose,
  restaurantId,
  waiterId,
  order,
}: CreateOrderModalProps) {
  const isEditMode = !!order
  const [selectedTableId, setSelectedTableId] = useState<string>(order?.table_id || '')
  const [orderItems, setOrderItems] = useState<OrderItem[]>(order?.order_items || [])
  const [error, setError] = useState<string | null>(null)

  const { data: tables, isLoading: isLoadingTables } = useTables(restaurantId)
  const { data: menuItems, isLoading: isLoadingMenuItems } = useMenuItems(restaurantId)
  const { data: restaurant } = useRestaurant(restaurantId)
  const createOrderMutation = useCreateOrder()
  const updateOrderMutation = useUpdateOrder()
  const updateTableStatusMutation = useUpdateTableStatus()

  // Get all menu items (including unavailable ones)
  const allMenuItems = useMemo(() => {
    return menuItems || []
  }, [menuItems])

  // Group menu items by category (including unavailable items)
  const menuItemsByCategory = useMemo(() => {
    const grouped: { [key: string]: MenuItem[] } = {}
    allMenuItems.forEach(item => {
      const category = item.category || 'Other'
      if (!grouped[category]) {
        grouped[category] = []
      }
      grouped[category].push(item)
    })
    return grouped
  }, [allMenuItems])

  // Get order items with menu item details
  const orderItemsWithDetails: OrderItemWithDetails[] = useMemo(() => {
    return orderItems.map(item => ({
      ...item,
      menuItem: menuItems?.find(mi => mi.id === item.menu_item_id),
    }))
  }, [orderItems, menuItems])

  // Separate delivered and non-delivered items
  const deliveredItems = useMemo(() => {
    return orderItemsWithDetails.filter(item => item.delivered)
  }, [orderItemsWithDetails])

  const nonDeliveredItems = useMemo(() => {
    return orderItemsWithDetails.filter(item => !item.delivered)
  }, [orderItemsWithDetails])

  // Calculate totals - always use current restaurant settings
  const totals = useMemo(() => {
    const total_amount = orderItems.reduce((sum, item) => sum + item.qty * item.price, 0)
    
    // Always use current restaurant GST and service charge percentages
    // If restaurant data is not loaded yet, use 0 as fallback
    const gst_percentage = restaurant?.gst_percentage ?? 0
    const service_charge_percentage = restaurant?.service_charge ?? 0
    
    // Calculate GST and service charge based on current restaurant settings
    const gst_amount = (total_amount * gst_percentage) / 100
    const service_charge_amount = (total_amount * service_charge_percentage) / 100
    const final_total = total_amount + gst_amount + service_charge_amount

    return {
      total_amount,
      gst_amount,
      service_charge_amount,
      final_total,
      gst_percentage,
      service_charge_percentage,
    }
  }, [orderItems, restaurant])

  // Initialize or reset form when modal visibility or order changes
  React.useEffect(() => {
    if (visible) {
      // Reset mutation states when modal opens to prevent auto-close
      createOrderMutation.reset()
      updateOrderMutation.reset()
      
      if (order) {
        // Edit mode: initialize with order data
        setSelectedTableId(order.table_id)
        setOrderItems(order.order_items || [])
      } else {
        // Create mode: reset to empty
        setSelectedTableId('')
        setOrderItems([])
      }
      setError(null)
    } else {
      // Reset when modal closes
      setSelectedTableId('')
      setOrderItems([])
      setError(null)
    }
  }, [visible, order])

  // Close modal on success (only if modal is visible)
  React.useEffect(() => {
    if (visible && (createOrderMutation.isSuccess || updateOrderMutation.isSuccess)) {
      onClose()
    }
  }, [visible, createOrderMutation.isSuccess, updateOrderMutation.isSuccess, onClose])

  const handleAddItem = (menuItem: MenuItem) => {
    // Prevent adding unavailable items
    if (!menuItem.available) {
      setError('This item is currently unavailable')
      return
    }
    
    // Find non-delivered item (can modify) or add new
    const existingNonDeliveredItem = orderItems.find(
      item => item.menu_item_id === menuItem.id && !item.delivered
    )
    
    if (existingNonDeliveredItem) {
      // Increase quantity of non-delivered item
      setOrderItems(prev =>
        prev.map(item =>
          item.menu_item_id === menuItem.id && !item.delivered
            ? { ...item, qty: item.qty + 1 }
            : item
        )
      )
    } else {
      // Add new non-delivered item (even if delivered version exists, this is a reorder)
      setOrderItems(prev => [
        ...prev,
        {
          menu_item_id: menuItem.id,
          qty: 1,
          price: menuItem.price,
          delivered: false,
        },
      ])
    }
  }

  const handleUpdateQuantity = (menuItemId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(menuItemId)
      return
    }
    // Only update non-delivered items
    setOrderItems(prev =>
      prev.map(item =>
        item.menu_item_id === menuItemId && !item.delivered
          ? { ...item, qty: newQty }
          : item
      )
    )
  }

  const handleRemoveItem = (menuItemId: string) => {
    // Only remove non-delivered items
    setOrderItems(prev =>
      prev.filter(item => !(item.menu_item_id === menuItemId && !item.delivered))
    )
  }

  const handleCreateOrder = async () => {
    setError(null)

    // Validation
    if (!selectedTableId) {
      setError('Please select a table')
      return
    }

    if (orderItems.length === 0) {
      setError('Please add at least one item to the order')
      return
    }

    // Ensure restaurant data is loaded to get current GST and service charge settings
    if (!restaurant) {
      setError('Restaurant information is loading. Please wait...')
      return
    }

    // Validate that we have the current restaurant settings
    const currentGstPercentage = restaurant.gst_percentage ?? 0
    const currentServiceChargePercentage = restaurant.service_charge ?? 0

    // Recalculate totals with current restaurant settings to ensure accuracy
    const total_amount = orderItems.reduce((sum, item) => sum + item.qty * item.price, 0)
    const gst_amount = (total_amount * currentGstPercentage) / 100
    const service_charge_amount = (total_amount * currentServiceChargePercentage) / 100
    const final_total = total_amount + gst_amount + service_charge_amount

    try {
      if (isEditMode && order) {
        // Update existing order (table cannot be changed, use original table_id)
        // Always recalculate using current restaurant settings
        await updateOrderMutation.mutateAsync({
          orderId: order.id,
          updates: {
            table_id: order.table_id, // Keep original table, don't allow changes
            order_items: orderItems,
            total_amount: total_amount,
            gst_amount: gst_amount,
            service_charge_amount: service_charge_amount,
            final_total: final_total,
          },
        })
      } else {
        // Create new order with current restaurant GST and service charge percentages
        await createOrderMutation.mutateAsync({
          orderData: {
            table_id: selectedTableId,
            waiter_id: waiterId,
            order_items: orderItems,
            gst_percentage: currentGstPercentage,
            service_charge_percentage: currentServiceChargePercentage,
            status: 'Pending',
          },
        })
        
        // Update table status to occupied after order is created
        await updateTableStatusMutation.mutateAsync({
          tableId: selectedTableId,
          status: 'occupied',
        })
      }
    } catch (err) {
      console.error(`Failed to ${isEditMode ? 'update' : 'create'} order`, err)
      setError(err instanceof Error ? err.message : `Failed to ${isEditMode ? 'update' : 'create'} order`)
    }
  }

  const isLoading = isLoadingTables || isLoadingMenuItems
  const submitting = createOrderMutation.isPending || updateOrderMutation.isPending

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.modalTitle}>{isEditMode ? 'Edit Order' : 'Create Order'}</Text>
            <Pressable
              style={styles.closeButton}
              onPress={onClose}
              disabled={submitting}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* Table Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{isEditMode ? 'Table' : 'Select Table'}</Text>
              {isLoadingTables ? (
                <ActivityIndicator size="small" style={styles.loader} />
              ) : tables && tables.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.tableScrollView}
                  contentContainerStyle={styles.tableScrollContent}
                  nestedScrollEnabled={true}
                >
                  {tables.map(table => (
                    <Pressable
                      key={table.id}
                      style={[
                        styles.tableOption,
                        selectedTableId === table.id && styles.tableOptionActive,
                        isEditMode && styles.tableOptionDisabled,
                        tables[tables.length - 1].id === table.id && {marginRight: 16}
                      ]}
                      onPress={() => {
                        if (!submitting && !isEditMode) {
                          setSelectedTableId(table.id)
                        }
                      }}
                      disabled={submitting || isEditMode}
                    >
                      <View style={styles.tableNumberContainer}>
                        <Text
                          style={[
                            styles.tableOptionText,
                            selectedTableId === table.id && styles.tableOptionTextActive,
                          ]}
                        >
                          {table.table_number}
                        </Text>
                      </View>
                      {selectedTableId === table.id && (
                        <View style={styles.tableCheckmark}>
                          <Text style={styles.tableCheckmarkText}>✓</Text>
                        </View>
                      )}
                    </Pressable>
                  ))}
                </ScrollView>
              ) : (
                <Text style={styles.emptyText}>No tables available</Text>
              )}
            </View>

            {/* Menu Items by Category */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Add Items</Text>
              {isLoadingMenuItems ? (
                <ActivityIndicator size="small" style={styles.loader} />
              ) : allMenuItems.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>🍽️</Text>
                  <Text style={styles.emptyText}>No menu items</Text>
                </View>
              ) : (
                <View style={styles.menuItemsContainer}>
                  {Object.entries(menuItemsByCategory).map(([category, items]) => (
                    <View key={category} style={styles.categorySection}>
                      <Text style={styles.categoryTitle}>{category}</Text>
                      {items.map(item => {
                        // Only count non-delivered items for quantity display
                        const nonDeliveredItemInOrder = orderItems.find(
                          oi => oi.menu_item_id === item.id && !oi.delivered
                        )
                        const itemQty = nonDeliveredItemInOrder?.qty || 0
                        const hasDeliveredVersion = orderItems.some(
                          oi => oi.menu_item_id === item.id && oi.delivered
                        )
                        const isUnavailable = !item.available
                        return (
                          <View
                            key={item.id}
                            style={[
                              styles.menuItemCard,
                              isUnavailable && styles.menuItemCardUnavailable
                            ]}
                          >
                            {item.image_url ? (
                              <Image
                                source={{ uri: item.image_url }}
                                style={[
                                  styles.menuItemImage,
                                  isUnavailable && styles.menuItemImageUnavailable
                                ]}
                                resizeMode="cover"
                              />
                            ) : (
                              <View style={[
                                styles.menuItemImagePlaceholder,
                                isUnavailable && styles.menuItemImageUnavailable
                              ]}>
                                <Text style={styles.menuItemImagePlaceholderText}>🍽️</Text>
                              </View>
                            )}
                            <View style={styles.menuItemInfo}>
                              <View style={styles.menuItemNameRow}>
                                <Text style={[
                                  styles.menuItemName,
                                  isUnavailable && styles.menuItemNameUnavailable
                                ]} numberOfLines={1}>
                                  {item.name}
                                </Text>
                                {isUnavailable && (
                                  <View style={styles.unavailableBadge}>
                                    <Text style={styles.unavailableBadgeText}>Unavailable</Text>
                                  </View>
                                )}
                                {!isUnavailable && hasDeliveredVersion && (
                                  <View style={styles.reorderBadge}>
                                    <Text style={styles.reorderBadgeText}>Reorder</Text>
                                  </View>
                                )}
                              </View>
                              {item.description ? (
                                <Text style={[
                                  styles.menuItemDescription,
                                  isUnavailable && styles.menuItemDescriptionUnavailable
                                ]} numberOfLines={2}>
                                  {item.description}
                                </Text>
                              ) : null}
                              <View style={styles.menuItemPriceRow}>
                                <Text style={[
                                  styles.menuItemPrice,
                                  isUnavailable && styles.menuItemPriceUnavailable
                                ]}>₹{item.price.toFixed(2)}</Text>
                              </View>
                            </View>
                            {!isUnavailable && itemQty > 0 ? (
                              <View style={styles.menuItemQuantityControls}>
                                <Pressable
                                  style={styles.menuItemQuantityButton}
                                  onPress={(e) => {
                                    e.stopPropagation()
                                    handleUpdateQuantity(item.id, itemQty - 1)
                                  }}
                                  disabled={submitting}
                                >
                                  <Text style={styles.menuItemQuantityButtonText}>−</Text>
                                </Pressable>
                                <View style={styles.menuItemQuantityBadge}>
                                  <Text style={styles.menuItemQuantityText}>{itemQty}</Text>
                                </View>
                                <Pressable
                                  style={styles.menuItemQuantityButton}
                                  onPress={(e) => {
                                    e.stopPropagation()
                                    handleAddItem(item)
                                  }}
                                  disabled={submitting}
                                >
                                  <Text style={styles.menuItemQuantityButtonText}>+</Text>
                                </Pressable>
                              </View>
                            ) : !isUnavailable ? (
                              <Pressable
                                style={styles.addButton}
                                onPress={(e) => {
                                  e.stopPropagation()
                                  handleAddItem(item)
                                }}
                                disabled={submitting}
                              >
                                <Text style={styles.addButtonText}>+</Text>
                              </Pressable>
                            ) : (
                              <View style={styles.unavailableButton}>
                                <Text style={styles.unavailableButtonText}>—</Text>
                              </View>
                            )}
                          </View>
                        )
                      })}
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Current Order Items */}
            {orderItemsWithDetails.length > 0 && (
              <View style={styles.section}>
                <View style={styles.orderHeader}>
                  <Text style={styles.sectionTitle}>Order Summary</Text>
                  <View style={styles.orderCountBadge}>
                    <Text style={styles.orderCountText}>{orderItems.length} items</Text>
                  </View>
                </View>
                
                {/* Delivered Items (Read-only) */}
                {deliveredItems.length > 0 && (
                  <View style={styles.deliveredSection}>
                    <Text style={styles.deliveredSectionTitle}>Delivered (Cannot Modify)</Text>
                    <View style={styles.orderItemsContainer}>
                      {deliveredItems.map((item, index) => (
                        <View key={`delivered-${item.menu_item_id}-${index}`} style={[styles.orderItemRow, styles.deliveredItemRow]}>
                          {item.menuItem?.image_url ? (
                            <Image
                              source={{ uri: item.menuItem.image_url }}
                              style={[styles.orderItemImage, styles.deliveredItemImage]}
                              resizeMode="cover"
                            />
                          ) : (
                            <View style={[styles.orderItemImagePlaceholder, styles.deliveredItemImage]}>
                              <Text style={styles.orderItemImagePlaceholderText}>🍽️</Text>
                            </View>
                          )}
                          <View style={styles.orderItemInfo}>
                            <View style={styles.orderItemNameRow}>
                              <Text style={styles.orderItemName} numberOfLines={1}>
                                {item.menuItem?.name || 'Unknown Item'}
                              </Text>
                              {/* <View style={styles.deliveredBadge}>
                                <Text style={styles.deliveredBadgeText}>✓ Delivered</Text>
                              </View> */}
                            </View>
                            <Text style={styles.orderItemPrice}>
                              ₹{item.price.toFixed(2)} × {item.qty}
                            </Text>
                          </View>
                          <View style={styles.orderItemRight}>
                            <Text style={styles.orderItemTotal}>
                              ₹{(item.price * item.qty).toFixed(2)}
                            </Text>
                            <Text style={styles.deliveredLabel}>Locked</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Non-Delivered Items (Editable) */}
                {nonDeliveredItems.length > 0 && (
                  <View style={styles.orderItemsContainer}>
                    {nonDeliveredItems.map((item, index) => (
                      <View key={`non-delivered-${item.menu_item_id}-${index}`} style={styles.orderItemRow}>
                        {item.menuItem?.image_url ? (
                          <Image
                            source={{ uri: item.menuItem.image_url }}
                            style={styles.orderItemImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.orderItemImagePlaceholder}>
                            <Text style={styles.orderItemImagePlaceholderText}>🍽️</Text>
                          </View>
                        )}
                        <View style={styles.orderItemInfo}>
                          <Text style={styles.orderItemName} numberOfLines={1}>
                            {item.menuItem?.name || 'Unknown Item'}
                          </Text>
                          <Text style={styles.orderItemPrice}>
                            ₹{item.price.toFixed(2)} × {item.qty}
                          </Text>
                        </View>
                        <View style={styles.orderItemRight}>
                          <Text style={styles.orderItemTotal}>
                            ₹{(item.price * item.qty).toFixed(2)}
                          </Text>
                          <View style={styles.quantityControls}>
                            <Pressable
                              style={styles.quantityButton}
                              onPress={() => handleUpdateQuantity(item.menu_item_id, item.qty - 1)}
                              disabled={submitting}
                            >
                              <Text style={styles.quantityButtonText}>−</Text>
                            </Pressable>
                            <View style={styles.quantityBadge}>
                              <Text style={styles.quantityText}>{item.qty}</Text>
                            </View>
                            <Pressable
                              style={styles.quantityButton}
                              onPress={() => handleUpdateQuantity(item.menu_item_id, item.qty + 1)}
                              disabled={submitting}
                            >
                              <Text style={styles.quantityButtonText}>+</Text>
                            </Pressable>
                          </View>
                          <Pressable
                            style={styles.removeButton}
                            onPress={() => handleRemoveItem(item.menu_item_id)}
                            disabled={submitting}
                          >
                            <Trash2 size={20} color={"#ff0000"} />
                          </Pressable>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* Totals */}
                <View style={styles.totalsContainer}>
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Subtotal</Text>
                    <Text style={styles.totalValue}>₹{totals.total_amount.toFixed(2)}</Text>
                  </View>
                  {totals.gst_percentage > 0 && (
                    <View style={styles.totalRow}>
                      <Text style={styles.totalLabel}>
                        GST ({totals.gst_percentage}%)
                      </Text>
                      <Text style={styles.totalValue}>₹{totals.gst_amount.toFixed(2)}</Text>
                    </View>
                  )}
                  {totals.service_charge_percentage > 0 && (
                    <View style={styles.totalRow}>
                      <Text style={styles.totalLabel}>
                        Service Charge ({totals.service_charge_percentage}%)
                      </Text>
                      <Text style={styles.totalValue}>
                        ₹{totals.service_charge_amount.toFixed(2)}
                      </Text>
                    </View>
                  )}
                  <View style={styles.finalTotalRow}>
                    <Text style={styles.finalTotalLabel}>Total Amount</Text>
                    <Text style={styles.finalTotalValue}>
                      ₹{totals.final_total.toFixed(2)}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.error}>{error}</Text>
              </View>
            ) : null}
          </ScrollView>

          {/* Actions */}
          <View style={styles.modalActions}>
            <Pressable
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
              disabled={submitting}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[
                styles.button,
                styles.createButton,
                (submitting || orderItems.length === 0 || !selectedTableId) &&
                  styles.createButtonDisabled,
              ]}
              onPress={handleCreateOrder}
              disabled={submitting || orderItems.length === 0 || !selectedTableId}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <View style={styles.createButtonContent}>
                  <Text style={styles.createButtonText}>{isEditMode ? 'Update Order' : 'Create Order'}</Text>
                  {orderItems.length > 0 && (
                    <Text style={styles.createButtonSubtext}>
                      ₹{totals.final_total.toFixed(2)}
                    </Text>
                  )}
                </View>
              )}
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#333',
    letterSpacing: -0.5,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: '#666',
    lineHeight: 28,
  },
  scrollView: {
    // maxHeight: '70%',
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    color: '#333',
    letterSpacing: -0.3,
  },
  loader: {
    marginVertical: 24,
  },
  tableScrollView: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  tableScrollContent: {
    paddingRight: 20,
    gap: 12,
  },
  tableOption: {
    width: 70,
    height: 70,
    borderRadius: 12,
    borderWidth: 2.5,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tableOptionActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
    shadowColor: '#10b981',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  tableOptionDisabled: {
    opacity: 0.6,
  },
  tableNumberContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableOptionText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#666',
  },
  tableOptionTextActive: {
    color: '#fff',
  },
  tableCheckmark: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  tableCheckmarkText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  menuItemsContainer: {
    gap: 24,
    marginBottom: 8,
  },
  categorySection: {
    marginBottom: 8,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10b981',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  menuItemImage: {
    width: 70,
    height: 70,
    borderRadius: 10,
    marginRight: 12,
    backgroundColor: '#f5f5f5',
  },
  menuItemImagePlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 10,
    marginRight: 12,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemImagePlaceholderText: {
    fontSize: 32,
  },
  menuItemInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  menuItemName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    flex: 1,
  },
  menuItemNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  menuItemDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
    lineHeight: 18,
  },
  menuItemPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuItemPrice: {
    fontSize: 16,
    color: '#10b981',
    fontWeight: '700',
  },
  itemQtyBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  itemQtyBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 26,
  },
  menuItemQuantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuItemQuantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  menuItemQuantityButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 20,
  },
  menuItemQuantityBadge: {
    minWidth: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  menuItemQuantityText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  orderCountBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  orderCountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  orderItemsContainer: {
    gap: 12,
    marginBottom: 16,
  },
  orderItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  orderItemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#f5f5f5',
  },
  orderItemImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderItemImagePlaceholderText: {
    fontSize: 24,
  },
  orderItemInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  orderItemName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  orderItemPrice: {
    fontSize: 13,
    color: '#666',
  },
  orderItemRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  orderItemTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  quantityButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 20,
  },
  quantityBadge: {
    minWidth: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  quantityText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ffffee',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ff4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  removeButtonText: {
    fontSize: 16,
  },
  totalsContainer: {
    marginTop: 20,
    paddingTop: 20,
    paddingBottom: 8,
    borderTopWidth: 2,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fafafa',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  totalLabel: {
    fontSize: 15,
    color: '#666',
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 15,
    color: '#333',
    fontWeight: '700',
  },
  finalTotalRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  finalTotalLabel: {
    fontSize: 20,
    color: '#333',
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  finalTotalValue: {
    fontSize: 20,
    color: '#10b981',
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#fff5f5',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    marginTop: 16,
    marginBottom: 8,
  },
  error: {
    color: '#ff4444',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    padding: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fafafa',
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '700',
  },
  createButton: {
    backgroundColor: '#10b981',
    shadowColor: '#10b981',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  createButtonDisabled: {
    backgroundColor: '#c7c7cc',
    shadowColor: '#000',
    shadowOpacity: 0.1,
  },
  createButtonContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  createButtonSubtext: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.9,
  },
  deliveredSection: {
    marginBottom: 20,
  },
  deliveredSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  deliveredItemRow: {
    opacity: 0.7,
    backgroundColor: '#f9f9f9',
  },
  deliveredItemImage: {
    opacity: 0.6,
  },
  orderItemNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  deliveredBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  deliveredBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  deliveredLabel: {
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
    fontStyle: 'italic',
    marginTop: 4,
  },
  reorderBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  reorderBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  menuItemCardUnavailable: {
    opacity: 0.6,
    backgroundColor: '#f9f9f9',
  },
  menuItemImageUnavailable: {
    opacity: 0.5,
  },
  menuItemNameUnavailable: {
    color: '#9ca3af',
  },
  menuItemDescriptionUnavailable: {
    color: '#d1d5db',
  },
  menuItemPriceUnavailable: {
    color: '#9ca3af',
  },
  unavailableBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  unavailableBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  unavailableButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.5,
  },
  unavailableButtonText: {
    color: '#9ca3af',
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 26,
  },
})

