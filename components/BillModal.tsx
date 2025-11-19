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
import type { Order, MenuItem } from '@/firebase/types';
import { useMenuItems } from '@/firebase/hooks/useMenuItem';
import { useRestaurant } from '@/firebase/hooks/useRestaurant';
import { useCreateBill, useUpdateBill, useBillsByOrder } from '@/firebase/hooks/useBill';
import { useTables, useUpdateTableStatus } from '@/firebase/hooks/useTable';
import { useUpdateOrderStatus } from '@/firebase/hooks/useOrder';

interface BillModalProps {
  visible: boolean;
  onClose: () => void;
  order: Order | null;
  restaurantId: string;
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
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('Pending');
  
  // Update payment status when bill is loaded
  useEffect(() => {
    if (existingBill?.payment_status) {
      setPaymentStatus(existingBill.payment_status as PaymentStatus);
    } else {
      setPaymentStatus('Pending');
    }
  }, [existingBill]);
  
  // Reset payment status when modal closes
  useEffect(() => {
    if (!visible) {
      setPaymentStatus('Pending');
    }
  }, [visible]);

  // Get table number
  const tableNumber = useMemo(() => {
    if (!order || !tables) return '';
    const table = tables.find(t => t.id === order.table_id);
    return table?.table_number || '';
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
        if (order.status !== 'completed') {
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

        // Update order status to completed
        if (order.status !== 'completed') {
          await updateOrderStatusMutation.mutateAsync({
            orderId: order.id,
            status: 'completed',
          });
        }
      } else if (newStatus === 'Pending' || newStatus === 'Failed') {
        // When payment is Pending or Failed, revert order status to pending
        // and mark table as occupied
        await updateTableStatusMutation.mutateAsync({
          tableId: order.table_id,
          status: 'occupied',
        });

        // Update order status to pending
        if (order.status !== 'pending') {
          await updateOrderStatusMutation.mutateAsync({
            orderId: order.id,
            status: 'pending',
          });
        }
      }
    } catch (error) {
      console.error('Error updating payment status:', error); 
    }
  };

  const getPaymentStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case 'Paid':
        return '#34c759';
      case 'Failed':
        return '#ff3b30';
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
        <View style={styles.modalContent}>
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
                <Text style={styles.infoValue}>Table {tableNumber}</Text>
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
                      if (existingBill) {
                        handleUpdatePaymentStatus(status);
                      } else {
                        setPaymentStatus(status);
                      }
                    }}
                    disabled={existingBill ? updateBillMutation.isPending : false}
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
              {existingBill && updateBillMutation.isPending && (
                <View style={styles.updatingIndicator}>
                  <ActivityIndicator size="small" color="#0a84ff" />
                  <Text style={styles.updatingText}>Updating...</Text>
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
                <Text style={[styles.summaryValue, styles.discountValue]}>
                  -₹{billCalculation.discount.toFixed(2)}
                </Text>
              </View>
              <View style={[styles.summaryRow, styles.grandTotalRow]}>
                <Text style={styles.grandTotalLabel}>Grand Total:</Text>
                <Text style={styles.grandTotalValue}>
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
                style={styles.updateBillButton}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text style={styles.updateBillButtonText}>Done</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
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
    paddingBottom: 20,
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
    color: '#1a1a1a',
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
    color: '#1a1a1a',
    marginBottom: 4,
  },
  restaurantAddress: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 4,
  },
  gstNumber: {
    fontSize: 12,
    color: '#6b7280',
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
    color: '#6b7280',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e5ea',
    marginVertical: 16,
  },
  itemsSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
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
    color: '#1a1a1a',
    marginBottom: 4,
  },
  billItemQty: {
    fontSize: 13,
    color: '#6b7280',
  },
  billItemTotal: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
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
    color: '#6b7280',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 15,
    color: '#1a1a1a',
    fontWeight: '600',
  },
  discountValue: {
    color: '#34c759',
  },
  grandTotalRow: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: '#e5e5ea',
  },
  grandTotalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  grandTotalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0a84ff',
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
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  createBillButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#34c759',
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
    color: '#6b7280',
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
    color: '#6b7280',
    fontWeight: '500',
  },
  updateBillButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#0a84ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateBillButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});

