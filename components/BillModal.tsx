import React, { useMemo, useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Order, MenuItem } from '@/firebase/types';
import { useMenuItems } from '@/firebase/hooks/useMenuItem';
import { useRestaurant } from '@/firebase/hooks/useRestaurant';
import { useCreateBill, useUpdateBill, useBillsByOrder } from '@/firebase/hooks/useBill';
import { useTables, useUpdateTableStatus } from '@/firebase/hooks/useTable';
import { useUpdateOrderStatus, useOrder } from '@/firebase/hooks/useOrder';

interface BillModalProps {
  visible: boolean;
  onClose: () => void;
  order: Order | null;
  restaurantId: string;
  theme: string
}

interface BillItem {
  menuItem: MenuItem | undefined;
  qty: number;
  price: number;
  subtotal: number;
}

const PAYMENT_STATUSES = ['Pending', 'Paid', 'Failed'] as const;
type PaymentStatus = typeof PAYMENT_STATUSES[number];

export default function BillModal({
  visible,
  onClose,
  order,
  restaurantId,
  theme,
}: BillModalProps) {
  const { data: menuItems } = useMenuItems(restaurantId);
  const { data: restaurant } = useRestaurant(restaurantId);
  const { data: tables } = useTables(restaurantId);
  const createBillMutation = useCreateBill();
  const updateBillMutation = useUpdateBill();
  const updateTableStatusMutation = useUpdateTableStatus();
  const updateOrderStatusMutation = useUpdateOrderStatus();
  
  // Get existing bill if it exists
  const { data: bills } = useBillsByOrder(order?.id || '');
  const existingBill = bills && bills.length > 0 ? bills[0] : null;
  
  // Get real-time order data to ensure we have the latest status
  const { data: currentOrder } = useOrder(order?.id || '');
  const orderToUse = currentOrder || order; // Use real-time data if available, fallback to prop
  
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('Pending');
  
  // Update payment status when bill is loaded or modal opens
  useEffect(() => {
    if (visible) {
      if (existingBill?.payment_status) {
        setPaymentStatus(existingBill.payment_status as PaymentStatus);
      } else {
        setPaymentStatus('Pending');
      }
    }
  }, [existingBill, visible]);

  // Reset payment status when modal closes (discard unsaved changes)
  useEffect(() => {
    if (!visible) {
      // Reset to the saved payment status when modal closes
      if (existingBill?.payment_status) {
        setPaymentStatus(existingBill.payment_status as PaymentStatus);
      } else {
        setPaymentStatus('Pending');
      }
    }
  }, [visible, existingBill]);

  // Get table number
  const tableNumber = useMemo(() => {
    if (!order || !tables) return '';
    const table = tables.find(t => t.id === order.table_id);
    return table?.table_number || '';
  }, [order, tables]);

  const tableName = useMemo(() => {
    if (!order || !tables) return '';
    const table = tables.find(t => t.id === order.table_id);
    return table?.table_name || `Table ${table?.table_number}`;
  }, [order, tables]);

  // Calculate bill items with menu item details
  const billItems: BillItem[] = useMemo(() => {
    if (!order?.order_items || !menuItems) return [];
    
    return order.order_items
      .filter(item => item.delivered) // Only include delivered items
      .map(item => ({
        menuItem: menuItems.find(mi => mi.id === item.menu_item_id),
        qty: item.qty,
        price: item.price,
        subtotal: item.qty * item.price,
      }));
  }, [order?.order_items, menuItems]);

  // Calculate bill totals
  const billCalculation = useMemo(() => {
    if (!order || !restaurant || !billItems.length) {
      return {
        subtotal: 0,
        gst: 0,
        serviceCharge: 0,
        discount: 0,
        grandTotal: 0,
      };
    }

    // Calculate subtotal from delivered items only
    const subtotal = billItems.reduce((sum, item) => sum + item.subtotal, 0);
    
    // Get GST and service charge percentages from restaurant
    const gstPercentage = restaurant.gst_percentage || 0;
    const serviceChargePercentage = restaurant.service_charge || 0;
    
    // Calculate GST and service charge based on subtotal
    const gst = (subtotal * gstPercentage) / 100;
    const serviceCharge = (subtotal * serviceChargePercentage) / 100;
    const discount = 0; // Can be added later if needed
    const grandTotal = subtotal + gst + serviceCharge - discount;

    return {
      subtotal,
      gst,
      serviceCharge,
      discount,
      grandTotal,
    };
  }, [order, restaurant, billItems]);

  const handleCreateBill = async () => {
    if (!order) return;

    try {
      const billId = order.id; // Use orderID as billId
      // Include service charge in the total since Bill type doesn't have a separate service_charge field
      // The grand_total will be calculated as: total + gst - discount
      // So we set total = subtotal + service_charge to match the order's final_total
      const billTotal = billCalculation.subtotal + billCalculation.serviceCharge;
      await createBillMutation.mutateAsync({
        billId,
        billData: {
          order_id: order.id,
          total: billTotal,
          gst: billCalculation.gst,
          discount: billCalculation.discount,
          payment_status: paymentStatus,
        },
      });

      // When bill is created with Paid status, mark table as free and order as completed
      if (paymentStatus === 'Paid') {
        // Update table status to available (free)
        await updateTableStatusMutation.mutateAsync({
          tableId: order.table_id,
          status: 'available',
        });

        // Only update order status if it's not already completed
        if (orderToUse?.status !== 'completed') {
          await updateOrderStatusMutation.mutateAsync({
            orderId: order.id,
            status: 'completed',
          });
        }
      }

      onClose();
    } catch (error) {
      console.error('Error creating bill:', error);
    }
  };

  const handleUpdatePaymentStatus = async (newStatus: PaymentStatus) => {
    if (!order || !existingBill) return;

    try {
      await updateBillMutation.mutateAsync({
        billId: order.id,
        updates: {
          payment_status: newStatus,
        },
      });
      setPaymentStatus(newStatus);

      // Update order status based on payment status
      if (newStatus === 'Paid') {
        // When bill is paid, mark table as free and order as completed
        await updateTableStatusMutation.mutateAsync({
          tableId: order.table_id,
          status: 'available',
        });

        // Always update order status to completed when payment is paid
        // This ensures consistency even if status was changed multiple times
        await updateOrderStatusMutation.mutateAsync({
          orderId: order.id,
          status: 'completed',
        });
      } else if (newStatus === 'Pending' || newStatus === 'Failed') {
        // When payment is Pending or Failed, revert order status to pending
        // and mark table as occupied
        await updateTableStatusMutation.mutateAsync({
          tableId: order.table_id,
          status: 'occupied',
        });

        // Always update order status to pending when payment is not paid
        // This ensures consistency even if status was changed multiple times
        await updateOrderStatusMutation.mutateAsync({
          orderId: order.id,
          status: 'pending',
        });
      }
    } catch (error) {
      console.error('Error updating payment status:', error); 
    }
  };

  const handleDone = async () => {
    if (!order || !existingBill) {
      onClose();
      return;
    }

    try {
      // Check if payment status has changed and needs to be saved
      if (paymentStatus !== existingBill.payment_status) {
        // Save the payment status change
        await updateBillMutation.mutateAsync({
          billId: order.id,
          updates: {
            payment_status: paymentStatus,
          },
        });

        // Update order status based on payment status
        if (paymentStatus === 'Paid') {
          // When bill is paid, mark table as free and order as completed
          await updateTableStatusMutation.mutateAsync({
            tableId: order.table_id,
            status: 'available',
          });

          await updateOrderStatusMutation.mutateAsync({
            orderId: order.id,
            status: 'completed',
          });
        } else if (paymentStatus === 'Pending' || paymentStatus === 'Failed') {
          // When payment is Pending or Failed, revert order status to pending
          // and mark table as occupied
          await updateTableStatusMutation.mutateAsync({
            tableId: order.table_id,
            status: 'occupied',
          });

          await updateOrderStatusMutation.mutateAsync({
            orderId: order.id,
            status: 'pending',
          });
        }
      }

      // Wait for any pending mutations to complete before closing
      // This ensures all changes are saved
      while (updateBillMutation.isPending || 
             updateTableStatusMutation.isPending || 
             updateOrderStatusMutation.isPending) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      onClose();
    } catch (error) {
      console.error('Error saving changes:', error);
      // Still close the modal even if there's an error
      onClose();
    }
  };

  const getPaymentStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case 'Paid':
        return '#10b981';
      case 'Failed':
        return '#ff4444';
      case 'Pending':
      default:
        return '#ff9f0a';
    }
  };

  if (!order) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <SafeAreaView style={styles.modalContent} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Bill</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* Restaurant Info */}
            <View style={styles.restaurantInfo}>
              <Text style={styles.restaurantName}>{restaurant?.name || 'Restaurant'}</Text>
              {restaurant?.address && (
                <Text style={styles.restaurantAddress}>{restaurant.address}</Text>
              )}
              {restaurant?.gst_number && (
                <Text style={styles.gstNumber}>GST: {restaurant.gst_number}</Text>
              )}
            </View>

            {/* Order Info */}
            <View style={styles.orderInfo}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Table:</Text>
                <Text style={styles.infoValue}>{tableName}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Order ID:</Text>
                <Text style={styles.infoValue}>#{order.id.slice(0, 8)}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Date:</Text>
                <Text style={styles.infoValue}>
                  {new Date().toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </Text>
              </View>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Bill Items */}
            <View style={styles.itemsSection}>
              <Text style={styles.sectionTitle}>Items</Text>
              {billItems.map((item, index) => (
                <View key={index} style={styles.billItemRow}>
                  <View style={styles.billItemLeft}>
                    <Text style={styles.billItemName}>
                      {item.menuItem?.name || 'Unknown Item'}
                    </Text>
                    <Text style={styles.billItemQty}>
                      {item.qty} × ₹{item.price.toFixed(2)}
                    </Text>
                  </View>
                  <Text style={styles.billItemTotal}>
                    ₹{item.subtotal.toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Payment Status Section */}
            <View style={styles.paymentStatusSection}>
              <Text style={styles.sectionTitle}>Payment Status</Text>
              <View style={styles.paymentStatusContainer}>
                {PAYMENT_STATUSES.map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.paymentStatusButton,
                      paymentStatus === status && {
                        backgroundColor: getPaymentStatusColor(status) + '20',
                        borderColor: getPaymentStatusColor(status),
                        borderWidth: 2,
                      },
                    ]}
                    onPress={() => {
                      // Only update local state, don't save until Done is pressed
                      setPaymentStatus(status);
                    }}
                    disabled={false}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.paymentStatusIndicator,
                        { backgroundColor: getPaymentStatusColor(status) },
                      ]}
                    />
                    <Text
                      style={[
                        styles.paymentStatusText,
                        paymentStatus === status && {
                          color: getPaymentStatusColor(status),
                          fontWeight: '700',
                        },
                      ]}
                    >
                      {status}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {existingBill && paymentStatus !== existingBill.payment_status && (
                <View style={styles.unsavedIndicator}>
                  <Text style={styles.unsavedText}>⚠️ Changes not saved</Text>
                </View>
              )}
              {existingBill && updateBillMutation.isPending && (
                <View style={styles.updatingIndicator}>
                  <ActivityIndicator size="small" color="#10b981" />
                  <Text style={styles.updatingText}>Saving...</Text>
                </View>
              )}
            </View>
            <View style={styles.divider} />

            {/* Bill Summary */}
            <View style={styles.summarySection}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal:</Text>
                <Text style={styles.summaryValue}>
                  ₹{billCalculation.subtotal.toFixed(2)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  GST ({restaurant?.gst_percentage || 0}%):
                </Text>
                <Text style={styles.summaryValue}>
                  ₹{billCalculation.gst.toFixed(2)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  Service Charge ({restaurant?.service_charge || 0}%):
                </Text>
                <Text style={styles.summaryValue}>
                  ₹{billCalculation.serviceCharge.toFixed(2)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Discount:</Text>
                <Text style={[styles.summaryValue, {color: theme}]}>
                  -₹{billCalculation.discount.toFixed(2)}
                </Text>
              </View>
              <View style={[styles.summaryRow, styles.grandTotalRow]}>
                <Text style={styles.grandTotalLabel}>Grand Total:</Text>
                <Text style={[styles.grandTotalValue, { color:theme}]}>
                  ₹{billCalculation.grandTotal.toFixed(2)}
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Close</Text>
            </TouchableOpacity>
            {!existingBill ? (
              <TouchableOpacity
                style={[
                  styles.createBillButton,
                  createBillMutation.isPending && styles.createBillButtonDisabled,
                ]}
                onPress={handleCreateBill}
                disabled={createBillMutation.isPending}
                activeOpacity={0.7}
              >
                {createBillMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.createBillButtonText}>Create Bill</Text>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.updateBillButton,
                  (updateBillMutation.isPending || 
                   updateTableStatusMutation.isPending || 
                   updateOrderStatusMutation.isPending) && styles.updateBillButtonDisabled,
                   {backgroundColor: theme}
                ]}
                onPress={handleDone}
                disabled={updateBillMutation.isPending || 
                         updateTableStatusMutation.isPending || 
                         updateOrderStatusMutation.isPending}
                activeOpacity={0.7}
              >
                {(updateBillMutation.isPending || 
                  updateTableStatusMutation.isPending || 
                  updateOrderStatusMutation.isPending) ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.updateBillButtonText}>Done</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
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
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    minHeight: '90%',
    paddingBottom: 20,
    maxHeight: "97%"
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#333',
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
    fontSize: 18,
    color: '#666',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
    
  },
  restaurantInfo: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  restaurantName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  restaurantAddress: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 4,
  },
  gstNumber: {
    fontSize: 12,
    color: '#666',
  },
  orderInfo: {
    paddingVertical: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 16,
  },
  itemsSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  billItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  billItemLeft: {
    flex: 1,
    marginRight: 12,
  },
  billItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  billItemQty: {
    fontSize: 13,
    color: '#666',
  },
  billItemTotal: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
  },
  summarySection: {
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 15,
    color: '#333',
    fontWeight: '600',
  },
  discountValue: {
    color: '#10b981',
  },
  grandTotalRow: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: '#e0e0e0',
  },
  grandTotalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  grandTotalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#10b981',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  createBillButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createBillButtonDisabled: {
    backgroundColor: '#e5e5ea',
  },
  createBillButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  paymentStatusSection: {
    marginBottom: 16,
  },
  paymentStatusContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  paymentStatusButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  paymentStatusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  paymentStatusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  unsavedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    gap: 8,
  },
  unsavedText: {
    fontSize: 13,
    color: '#ff9f0a',
    fontWeight: '600',
  },
  updatingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    gap: 8,
  },
  updatingText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  updateBillButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateBillButtonDisabled: {
    backgroundColor: '#e5e5ea',
  },
  updateBillButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});

