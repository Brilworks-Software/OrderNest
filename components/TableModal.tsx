import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export type Table = {
  id: string;
  restaurant_id: string;
  table_number: number;
  table_name: string;
  status: string;
};

type TableModalProps = {
  visible: boolean;
  table?: Table; // if provided → edit mode, else → create mode
  restaurantId: string;
  onClose: () => void;
  onSubmit: (table: Table, mode: 'create' | 'edit') => Promise<void> | void;
};

const TableModal: React.FC<TableModalProps> = ({
  visible,
  table,
  restaurantId,
  onClose,
  onSubmit,
}) => {
  const [tableNumber, setTableNumber] = useState('');
  const [tableName, setTableName] = useState('');
  const [status, setStatus] = useState<'available' | 'occupied' | 'reserved'>(
    'available'
  );
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const isEditMode = !!table;

  useEffect(() => {
    if (isEditMode && table) {
      setTableNumber(String(table.table_number));
      setTableName(table.table_name || '');
      setStatus(table.status as any);
    } else {
      setTableNumber('');
      setTableName('');
      setStatus('available');
    }
    setErrorMessage('');
  }, [table, visible]);

  const handleSave = async () => {
    setErrorMessage('');

    const trimmed = tableNumber.trim();
    if (!trimmed) {
      setErrorMessage('Table number is required.');
      return;
    }

    const parsed = parseInt(trimmed, 10);
    if (Number.isNaN(parsed)) {
      setErrorMessage('Table number must be a valid number.');
      return; // invalid number input
    }

    const newTable: Table = {
      id: isEditMode ? table!.id : `${restaurantId}-${Math.random().toString(36).slice(2, 20)}`,
      restaurant_id: restaurantId,
      table_number: parsed,
      table_name: tableName.trim() || `Table ${parsed}`,
      status,
    };

    try {
      setLoading(true);
      await onSubmit(newTable, isEditMode ? 'edit' : 'create');
      // close only on success
      onClose();
    } catch (err: any) {
      // show friendly error message (use err.message if available)
      const msg =
        (err && err.message) || 'Failed to save. Please try again later.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.headerContent}>
                <Ionicons 
                  name="grid-outline" 
                  size={24} 
                  color="#104A9c" 
                  style={styles.headerIcon} 
                />
                <Text style={styles.modalTitle}>
                  {isEditMode ? 'Edit Table' : 'Add New Table'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
                disabled={loading}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Form Content */}
            <View style={styles.formContent}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Table Number</Text>
                <View style={[
                  styles.inputContainer,
                  focusedInput === 'tableNumber' && styles.inputContainerFocused,
                  errorMessage && styles.inputContainerError
                ]}>
                  <Ionicons 
                    name="grid-outline" 
                    size={20} 
                    color={focusedInput === 'tableNumber' ? '#007AFF' : '#104A9c'} 
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    value={tableNumber}
                    onChangeText={(t) => {
                      setTableNumber(t);
                      if (errorMessage) setErrorMessage('');
                    }}
                    keyboardType="number-pad"
                    placeholder="Enter table number"
                    placeholderTextColor="#999"
                    editable={!loading}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Table Name</Text>
                <View style={[
                  styles.inputContainer,
                  focusedInput === 'tableName' && styles.inputContainerFocused
                ]}>
                  <Ionicons 
                    name="text-outline" 
                    size={20} 
                    color={focusedInput === 'tableName' ? '#007AFF' : '#104A9c'} 
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    value={tableName}
                    onChangeText={(t) => {
                      setTableName(t);
                      if (errorMessage) setErrorMessage('');
                    }}
                    placeholder="Enter table name (optional)"
                    placeholderTextColor="#999"
                    editable={!loading}
                  />
                </View>
              </View>

              {errorMessage && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={18} color="#ff4444" />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              )}
            </View>

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.cancelButton,
                  loading && styles.buttonDisabled
                ]}
                onPress={onClose}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.saveButton,
                  loading && styles.buttonDisabled,
                  {backgroundColor: "#104A9c"}
                ]}
                onPress={handleSave}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons 
                      name={isEditMode ? "checkmark-circle" : "add-circle"} 
                      size={20} 
                      color="#fff" 
                      style={styles.buttonIcon} 
                    />
                    <Text style={styles.saveButtonText}>
                      {isEditMode ? 'Update' : 'Create'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default TableModal;

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 480,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIcon: {
    marginRight: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1a1a1a',
    letterSpacing: -0.5,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
    letterSpacing: 0.2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    backgroundColor: '#fafafa',
    paddingHorizontal: 4,
    minHeight: 52,
    maxHeight: 90,
  },
  inputContainerFocused: {
    borderColor: '#007AFF',
    backgroundColor: '#fff',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  inputContainerError: {
    borderColor: '#ff4444',
  },
  inputIcon: {
    marginLeft: 12,
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
    fontSize: 16,
    color: '#333',
    outline:'none',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff5f5',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffebee',
    gap: 8,
    marginTop: 4,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    minHeight: 52,
    maxHeight: 90,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonIcon: {
    marginRight: -4,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
