import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator, Platform, KeyboardAvoidingView, ScrollView } from 'react-native'
import React, { useState } from 'react'
import { useAuth } from '../../firebase/hooks/useAuth'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Hotel } from 'lucide-react-native'
import { useRouter } from 'expo-router'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [focusedInput, setFocusedInput] = useState(false)
  const router = useRouter()

  const { resetPassword, isResettingPassword, resetPasswordError } = useAuth()

  const handleResetPassword = async () => {
    // clear previous messages
    setErrorMessage(null)
    setMessage(null)

    if (email.trim() === '') {
      setErrorMessage('Please enter your email address.')
      return
    }
    const emailRegex = /^\S+@\S+\.\S+$/
    if (!emailRegex.test(email)) {
      setErrorMessage('Please enter a valid email address.')
      return
    }
    try {
      await resetPassword(email)
      setMessage('Password reset link sent. Check your email.')
      setEmail('')
    } catch (error) {
      const errMsg = resetPasswordError?.message || 'Failed to send reset link.'
      setErrorMessage(errMsg)
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 20}
        enabled
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          keyboardShouldPersistTaps="handled" 
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Hotel size={32} color="#3b82f6" />
            </View>
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>Enter your email and we'll send you a reset link</Text>
          </View>

          <View style={styles.card}>
            <View>
              <Text style={styles.label}>Email Address</Text>
              <View style={[
                styles.inputContainer,
                focusedInput && styles.inputContainerFocused
              ]}>
                <Ionicons 
                  name="mail" 
                  size={20} 
                  color={focusedInput ? '#3b82f6' : '#6b7280'} 
                  style={styles.icon} 
                />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor="#9ca3af"
                  value={email}
                  onChangeText={text => {
                    setEmail(text)
                    if (errorMessage) setErrorMessage(null)
                    if (message) setMessage(null)
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="send"
                  onSubmitEditing={handleResetPassword}
                  editable={!isResettingPassword}
                  onFocus={() => setFocusedInput(true)}
                  onBlur={() => setFocusedInput(false)}
                />
              </View>
            </View>

            {errorMessage ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={18} color="#dc2626" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {message ? (
              <View style={styles.successContainer}>
                <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
                <Text style={styles.successText}>{message}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.button, isResettingPassword && styles.buttonDisabled]}
              onPress={handleResetPassword}
              disabled={isResettingPassword}
              activeOpacity={0.8}
              accessibilityRole="button"
            >
              {isResettingPassword ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={styles.buttonContent}>
                  <Text style={styles.buttonText}>Send Reset Link</Text>
                  <Ionicons name="send" size={20} color="#fff" style={styles.buttonIcon} />
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.hintContainer}>
              <Ionicons name="information-circle" size={16} color="#9ca3af" />
              <Text style={styles.hint}>Check your spam folder if you don't see the email</Text>
            </View>

            <TouchableOpacity 
              onPress={() => router.back()} 
              style={styles.backLink}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={18} color="#3b82f6" />
              <Text style={styles.backLinkText}>Back to Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    paddingTop: 40,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 28,
    marginBottom: 8,
    fontWeight: '700',
    textAlign: 'center',
    color: '#111827',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    color: '#6b7280',
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  card: {
    padding: 28,
    borderRadius: 16,
    backgroundColor: '#fff',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    marginTop: 0,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 0,
    marginBottom: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    paddingRight: 12,
  },
  inputContainerFocused: {
    borderColor: '#3b82f6',
    backgroundColor: '#fff',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  icon: {
    marginLeft: 14,
  },
  input: {
    flex: 1,
    height: 52,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    gap: 8,
  },
  errorText: {
    flex: 1,
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    gap: 8,
  },
  successText: {
    flex: 1,
    color: '#16a34a',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  button: {
    marginTop: 24,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  buttonIcon: {
    marginLeft: 4,
  },
  hintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f9fafb',
    gap: 8,
  },
  hint: {
    flex: 1,
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    paddingVertical: 12,
    gap: 6,
  },
  backLinkText: {
    color: '#3b82f6',
    fontSize: 15,
    fontWeight: '600',
  },
})