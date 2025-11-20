import React, { useState } from 'react'
import { StyleSheet, Text, View, Modal, TextInput, Pressable, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Keyboard, TouchableWithoutFeedback } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
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
  const [focusedInput, setFocusedInput] = useState<string | null>(null)

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={0}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={onClose} />
          <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
            <View style={styles.modalHeader}>
              <View style={styles.titleContainer}>
                <MaterialIcons name="person-add" size={28} color="#104A9c" style={styles.titleIcon} />
                <Text style={styles.modalTitle}>Invite Team Member</Text>
              </View>
              <TouchableOpacity 
                onPress={onClose} 
                style={styles.closeButton} 
                disabled={submitting}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            {/* <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollViewContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
            > */}
              <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.form}>
            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <MaterialIcons name="badge" size={16} color="#104A9c" />
                <Text style={styles.label}>Name</Text>
              </View>
              <View style={[
                styles.inputWrapper,
                focusedInput === 'name' && styles.inputWrapperFocused
              ]}>
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
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <MaterialIcons name="email" size={16} color="#104A9c" />
                <Text style={styles.label}>Email</Text>
              </View>
              <View style={[
                styles.inputWrapper,
                focusedInput === 'email' && styles.inputWrapperFocused
              ]}>
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
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <MaterialIcons name="lock" size={16} color="#104A9c" />
                <Text style={styles.label}>Password</Text>
              </View>
              <View style={[
                styles.inputWrapper,
                focusedInput === 'password' && styles.inputWrapperFocused
              ]}>
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
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <MaterialIcons name="work" size={16} color="#104A9c" />
                <Text style={styles.label}>Role</Text>
              </View>
              <View style={styles.typeRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.typeOption,
                    type === 'staff' && styles.typeOptionActive,
                    pressed && styles.typeOptionPressed
                  ]}
                  onPress={() => setType('staff')}
                  disabled={submitting}
                >
                  <View style={[
                    styles.typeIconContainer,
                    type === 'staff' && styles.typeIconContainerActive
                  ]}>
                    <MaterialIcons
                      name="person"
                      size={22}
                      color={type === 'staff' ? '#fff' : '#10b981'}
                    />
                  </View>
                  <Text style={type === 'staff' ? styles.typeTextActive : styles.typeText}>Staff</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.typeOption,
                    styles.typeOptionChef,
                    type === 'chef' && styles.typeOptionActiveChef,
                    pressed && styles.typeOptionPressed
                  ]}
                  onPress={() => setType('chef')}
                  disabled={submitting}
                >
                  <View style={[
                    styles.typeIconContainer,
                    type === 'chef' && styles.typeIconContainerActiveChef
                  ]}>
                    <MaterialIcons
                      name="restaurant"
                      size={22}
                      color={type === 'chef' ? '#fff' : '#ff6b35'}
                    />
                  </View>
                  <Text style={type === 'chef' ? styles.typeTextActive : styles.typeTextChef}>
                    Chef
                  </Text>
                </Pressable>
              </View>
            </View>

            {error ? (
              <View style={styles.errorContainer}>
                <MaterialIcons name="error-outline" size={22} color="#ff4444" />
                <Text style={styles.error}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onClose}
                disabled={submitting}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.submitButton, submitting && styles.submitButtonDisabled]}
                onPress={onSubmit}
                disabled={submitting}
                activeOpacity={0.8}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <MaterialIcons name="send" size={18} color="#fff" style={styles.submitIcon} />
                    <Text style={styles.submitButtonText}>Invite</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
              </View>
              </TouchableWithoutFeedback>
          </SafeAreaView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  keyboardAvoidingView: {
    flex: 1,
    width: '100%',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 420,
    maxHeight: '90%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 0,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fafbfc',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  titleIcon: {
    marginRight: 4,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1d304b',
    letterSpacing: -0.5,
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 20,
  },
  form: {
    padding: 24,
  },
  inputGroup: {
    marginBottom: 22,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  inputWrapper: {
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    backgroundColor: '#ffffff',
  },
  inputWrapperFocused: {
    borderColor: '#104A9c',
    backgroundColor: '#f8f9ff',
    shadowColor: '#104A9c',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  input: {
    height: 52,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1f2937',
    backgroundColor: 'transparent',
  },
  typeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  typeOption: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#ffffff',
    minHeight: 64,
  },
  typeOptionPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  typeOptionActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  typeOptionChef: {
    borderColor: '#e5e7eb',
  },
  typeOptionActiveChef: {
    backgroundColor: '#ff6b35',
    borderColor: '#ff6b35',
    shadowColor: '#ff6b35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  typeIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f9ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeIconContainerActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  typeIconContainerActiveChef: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  typeText: {
    color: '#10b981',
    fontWeight: '600',
    fontSize: 15,
    letterSpacing: 0.2,
  },
  typeTextChef: {
    color: '#ff6b35',
    fontWeight: '600',
    fontSize: 15,
    letterSpacing: 0.2,
  },
  typeTextActive: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
    letterSpacing: 0.2,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  error: {
    color: '#dc2626',
    fontSize: 14,
    flex: 1,
    fontWeight: '500',
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    minHeight: 52,
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#104A9c',
    shadowColor: '#104A9c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitIcon: {
    marginRight: -4,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
})

