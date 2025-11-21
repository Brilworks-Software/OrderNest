import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TextInput,
  Pressable,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

interface InviteUserModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: () => void;
  name: string;
  setName: (name: string) => void;
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  type: 'staff' | 'chef';
  setType: (type: 'staff' | 'chef') => void;
  error: string | null;
  submitting: boolean;
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
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
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
                <MaterialIcons
                  name="person-add"
                  size={24}
                  color="#104A9c"
                  style={styles.headerIcon}
                />
                <Text style={styles.modalTitle}>Invite Team Member</Text>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
                disabled={submitting}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.scrollView}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.formContent}>
                <View style={styles.inputGroup}>
                  <View style={styles.labelContainer}>
                    <MaterialIcons name="badge" size={16} color="#104A9c" />
                    <Text style={styles.label}>Name</Text>
                  </View>
                  <View
                    style={[
                      styles.inputWrapper,
                      focusedInput === 'name' && { borderColor: '#104A9c' },
                    ]}>
                    <TextInput
                      style={[styles.input, { outline: 'none' }]}
                      placeholder="e.g. John Doe or Tablet-1"
                      placeholderTextColor="#999"
                      value={name}
                      onChangeText={setName}
                      editable={!submitting}
                      autoCapitalize="words"
                      onFocus={() => setFocusedInput('name')}
                      onBlur={() => setFocusedInput(null)}
                      numberOfLines={1}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <View style={styles.labelContainer}>
                    <MaterialIcons name="email" size={16} color="#104A9c" />
                    <Text style={styles.label}>Email</Text>
                  </View>
                  <View
                    style={[
                      styles.inputWrapper,
                      focusedInput === 'email' && { borderColor: '#104A9c' },
                    ]}>
                    <TextInput
                      style={[styles.input, { outline: 'none' }]}
                      placeholder="email@example.com"
                      placeholderTextColor="#999"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      editable={!submitting}
                      onFocus={() => setFocusedInput('email')}
                      onBlur={() => setFocusedInput(null)}
                      numberOfLines={1}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <View style={styles.labelContainer}>
                    <MaterialIcons name="lock" size={16} color="#104A9c" />
                    <Text style={styles.label}>Password</Text>
                  </View>
                  <View
                    style={[
                      styles.inputWrapper,
                      focusedInput === 'password' && { borderColor: '#104A9c' },
                    ]}>
                    <TextInput
                      style={[styles.input, { outline: 'none' }]}
                      placeholder="At least 6 characters"
                      placeholderTextColor="#999"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                      editable={!submitting}
                      autoCapitalize="none"
                      onFocus={() => setFocusedInput('password')}
                      onBlur={() => setFocusedInput(null)}
                      numberOfLines={1}
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
                        pressed && styles.typeOptionPressed,
                      ]}
                      onPress={() => setType('staff')}
                      disabled={submitting}>
                      <View
                        style={[
                          styles.typeIconContainer,
                          type === 'staff' && styles.typeIconContainerActive,
                        ]}>
                        <MaterialIcons
                          name="person"
                          size={22}
                          color={type === 'staff' ? '#fff' : '#10b981'}
                        />
                      </View>
                      <Text style={type === 'staff' ? styles.typeTextActive : styles.typeText}>
                        Staff
                      </Text>
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [
                        styles.typeOption,
                        styles.typeOptionChef,
                        type === 'chef' && styles.typeOptionActiveChef,
                        pressed && styles.typeOptionPressed,
                      ]}
                      onPress={() => setType('chef')}
                      disabled={submitting}>
                      <View
                        style={[
                          styles.typeIconContainer,
                          type === 'chef' && styles.typeIconContainerActiveChef,
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
                    <MaterialIcons name="error-outline" size={18} color="#ff4444" />
                    <Text style={styles.error}>{error}</Text>
                  </View>
                ) : null}
              </View>
            </ScrollView>

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.cancelButton,
                  submitting && styles.buttonDisabled
                ]}
                onPress={onClose}
                disabled={submitting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.submitButton,
                  submitting && styles.buttonDisabled,
                ]}
                onPress={onSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <MaterialIcons
                      name="send"
                      size={20}
                      color="#fff"
                      style={styles.buttonIcon}
                    />
                    <Text style={styles.submitButtonText}>Invite</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
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
    padding: 20,
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
    fontSize: 24,
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
  scrollView: {
    maxHeight: '70%',
  },
  formContent: {
    padding: 20,
    paddingTop: 16,
  },
  inputGroup: {
    marginBottom: 20,
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
    color: '#333',
    letterSpacing: 0.2,
  },
  inputWrapper: {
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    backgroundColor: '#fafafa',
    minHeight: 52,
    maxHeight: '90%',
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#333',
    outline: 'none',
    height: 45,
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
    backgroundColor: '#fff5f5',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffebee',
    gap: 8,
    marginTop: 4,
  },
  error: {
    color: '#ff4444',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 0,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    minHeight: 60,
    maxHeight: '90%',
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
  submitButton: {
    backgroundColor: '#104A9c',
    shadowColor: '#104A9c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonIcon: {
    marginRight: -4,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
