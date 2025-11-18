import React from 'react'
import { StyleSheet, Text, View, Modal, TextInput, Pressable, TouchableOpacity, ActivityIndicator } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'

interface InviteUserModalProps {
  visible: boolean
  onClose: () => void
  onSubmit: () => void
  name: string
  setName: (name: string) => void
  email: string
  setEmail: (email: string) => void
  password: string
  setPassword: (password: string) => void
  type: 'staff' | 'chef'
  setType: (type: 'staff' | 'chef') => void
  error: string | null
  submitting: boolean
}

export default function InviteUserModal({
  visible,
  onClose,
  onSubmit,
  name,
  setName,
  email,
  setEmail,
  password,
  setPassword,
  type,
  setType,
  error,
  submitting,
}: InviteUserModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Invite Team Member</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton} disabled={submitting}>
              <MaterialIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. John Doe or Tablet-1"
                placeholderTextColor="#999"
                value={name}
                onChangeText={setName}
                editable={!submitting}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="email@example.com"
                placeholderTextColor="#999"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!submitting}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="At least 6 characters"
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!submitting}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Role</Text>
              <View style={styles.typeRow}>
                <Pressable
                  style={[styles.typeOption, type === 'staff' && styles.typeOptionActive]}
                  onPress={() => setType('staff')}
                  disabled={submitting}
                >
                  <MaterialIcons
                    name="person"
                    size={20}
                    color={type === 'staff' ? '#fff' : '#104A9c'}
                    style={styles.typeIcon}
                  />
                  <Text style={type === 'staff' ? styles.typeTextActive : styles.typeText}>Staff</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.typeOption,
                    styles.typeOptionChef,
                    type === 'chef' && styles.typeOptionActiveChef,
                  ]}
                  onPress={() => setType('chef')}
                  disabled={submitting}
                >
                  <MaterialIcons
                    name="restaurant"
                    size={20}
                    color={type === 'chef' ? '#fff' : '#ff6b35'}
                    style={styles.typeIcon}
                  />
                  <Text style={type === 'chef' ? styles.typeTextActive : styles.typeTextChef}>
                    Chef
                  </Text>
                </Pressable>
              </View>
            </View>

            {error ? (
              <View style={styles.errorContainer}>
                <MaterialIcons name="error-outline" size={20} color="#ff4444" />
                <Text style={styles.error}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onClose}
                disabled={submitting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.submitButton, submitting && styles.submitButtonDisabled]}
                onPress={onSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Invite</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 0,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1d304b',
  },
  closeButton: {
    padding: 4,
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    height: 48,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#fafafa',
    color: '#333',
  },
  typeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  typeOption: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#104A9c',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 6,
  },
  typeOptionActive: {
    backgroundColor: '#104A9c',
  },
  typeOptionChef: {
    borderColor: '#ff6b35',
  },
  typeOptionActiveChef: {
    backgroundColor: '#ff6b35',
  },
  typeIcon: {
    marginRight: 0,
  },
  typeText: {
    color: '#104A9c',
    fontWeight: '600',
    fontSize: 14,
  },
  typeTextChef: {
    color: '#ff6b35',
    fontWeight: '600',
    fontSize: 14,
  },
  typeTextActive: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffeaea',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  error: {
    color: '#ff4444',
    fontSize: 14,
    flex: 1,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#104A9c',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
})

