import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from 'react-native';

export type Table = {
  id: string;
  restaurant_id: string;
  table_number: number;
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
  const [status, setStatus] = useState<'available' | 'occupied' | 'reserved'>(
    'available'
  );
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const isEditMode = !!table;

  useEffect(() => {
    if (isEditMode && table) {
      setTableNumber(String(table.table_number));
      setStatus(table.status as any);
    } else {
      setTableNumber('');
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
      animationType="slide"
      onRequestClose={onClose}
      style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>

      <View style={styles.modalContainer}>
        <Text style={styles.header}>
          {isEditMode ? 'Edit Table' : 'Add New Table'}
        </Text>

        <Text style={styles.label}>Table Number</Text>
        <TextInput
          style={styles.input}
          value={tableNumber}
          onChangeText={(t) => {
            setTableNumber(t);
            if (errorMessage) setErrorMessage('');
          }}
          keyboardType="number-pad"
          placeholder="Enter table number"
        />

        {errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : null}

        {/* <Text style={styles.label}>Status</Text>
        <View style={styles.statusContainer}>
          {['available', 'occupied', 'reserved'].map((s) => (
            <TouchableOpacity
              key={s}
              style={[
                styles.statusButton,
                status === s && styles.statusButtonActive,
              ]}
              onPress={() => setStatus(s as any)}
            >
              <Text
                style={[
                  styles.statusText,
                  status === s && styles.statusTextActive,
                ]}
              >
                {s}
              </Text>
            </TouchableOpacity>
          ))}
        </View> */}

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.button, styles.saveButton, loading && styles.disabled]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {isEditMode ? 'Update' : 'Create'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={onClose}
            disabled={loading}
          >
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default TableModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    elevation: 6,
    // maxWidth: 700,
    alignSelf: 'center',
    top: '30%',
  },
  header: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  label: {
    fontWeight: '600',
    color: '#444',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 15,
  },
  errorText: {
    color: '#c0392b',
    marginBottom: 12,
    textAlign: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statusButton: {
    borderWidth: 1,
    borderColor: '#aaa',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusButtonActive: {
    backgroundColor: '#3498DB',
    borderColor: '#3498DB',
  },
  statusText: {
    color: '#555',
  },
  statusTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  saveButton: {
    backgroundColor: '#27AE60',
  },
  cancelButton: {
    backgroundColor: '#7F8C8D',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.7,
  },
});
