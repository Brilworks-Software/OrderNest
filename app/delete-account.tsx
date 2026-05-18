import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { inMemoryPersistence, setPersistence, signOut } from 'firebase/auth';
import { Container } from '@/components/Container';
import { auth } from '@/firebase/config';
import { authService } from '@/firebase/services/AuthService';

export default function DeleteAccountPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const ensureNoPersistence = async () => {
    if (Platform.OS === 'web') {
      await setPersistence(auth, inMemoryPersistence);
    }
  };

  const handleDelete = async () => {
    setError(null);
    setSuccess(null);

    if (email.trim() === '') {
      setError('Please enter your email address.');
      return;
    }
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.trim() === '') {
      setError('Please enter your password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      await ensureNoPersistence();
      await authService.signIn({ email, password });
      await authService.deleteAccount();
      setSuccess('Your account was deleted. You are now signed out.');
      setEmail('');
      setPassword('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Delete failed';
      setError(message);
    } finally {
      try {
        if (auth.currentUser) {
          await signOut(auth);
        }
      } catch {
        // Ignore sign out failures for this public page.
      }
      setLoading(false);
    }
  };

  return (
    <Container style={{ backgroundColor: '#f3f4f6', padding: 0 }}>
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
              <Ionicons name="trash" size={28} color="#dc2626" />
            </View>
            <Text style={styles.title}>Delete Account</Text>
            <Text style={styles.subtitle}>
              This public page is for account deletion requests.
            </Text>
            <Text style={styles.subtitleMuted}>
              You will not stay signed in after submitting.
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.inputContainer}>
              <Ionicons name="mail" size={20} color="#6b7280" style={styles.icon} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                placeholder="Email"
                placeholderTextColor="#9ca3af"
                style={[styles.input, { outline: 'none' }]}
                editable={!loading}
                returnKeyType="next"
                accessibilityLabel="Email input"
                numberOfLines={1}
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed" size={20} color="#6b7280" style={styles.icon} />
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="Password"
                placeholderTextColor="#9ca3af"
                style={[styles.input, { outline: 'none' }]}
                editable={!loading}
                returnKeyType="done"
                onSubmitEditing={handleDelete}
                accessibilityLabel="Password input"
                numberOfLines={1}
                autoComplete="current-password"
              />
            </View>

            {error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={18} color="#dc2626" />
                <Text style={styles.error}>{error}</Text>
              </View>
            ) : null}

            {success ? (
              <View style={styles.successContainer}>
                <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
                <Text style={styles.success}>{success}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleDelete}
              disabled={loading}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Delete account button"
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={styles.buttonContent}>
                  <Text style={styles.buttonText}>Delete Account</Text>
                  <Ionicons name="trash" size={18} color="#fff" style={styles.buttonIcon} />
                </View>
              )}
            </TouchableOpacity>

            <Text style={styles.disclaimer}>
              Deleting your account permanently removes access to your data.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 40,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    maxWidth: 520,
  },
  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 26,
    marginBottom: 8,
    fontWeight: '700',
    textAlign: 'center',
    color: '#111827',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: '#374151',
    textAlign: 'center',
  },
  subtitleMuted: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 6,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    width: '100%',
    maxWidth: 440,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 14,
    backgroundColor: '#f9fafb',
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  error: {
    marginLeft: 8,
    color: '#b91c1c',
    fontSize: 13,
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  success: {
    marginLeft: 8,
    color: '#15803d',
    fontSize: 13,
  },
  button: {
    backgroundColor: '#dc2626',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  buttonIcon: {
    marginLeft: 8,
  },
  disclaimer: {
    marginTop: 12,
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
});
