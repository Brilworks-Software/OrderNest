import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  Image,
} from 'react-native';
import { useAuth } from '@/firebase/hooks/useAuth';
import { Container } from '@/components/Container';
import { useUser } from '@/firebase/hooks/useUsers';
import { useRestaurant } from '@/firebase/hooks/useRestaurant';
import { router } from 'expo-router';
import ChangePasswordModal from '@/components/ChangePasswordModal';
import DeleteAccountModal from '@/components/DeleteAccountModal';
import { MaterialIcons } from '@expo/vector-icons';

export default function Settings() {
  const {
    currentUser,
    isLoadingUser,
    signOut,
    isSigningOut,
    updatePassword,
    isUpdatingPassword,
    reauthenticate,
    isReauthenticating,
    deleteAccount,
    isDeletingAccount,
  } = useAuth();
  const userData = useUser(currentUser?.uid || '').data;
  const restaurantId = userData?.restaurantId || '';
  const { data: restaurant, isLoading: isLoadingRestaurant } = useRestaurant(restaurantId);

  // Change Password Modal State
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);

  // Delete Account Modal State
  const [deleteAccountModalVisible, setDeleteAccountModalVisible] = useState(false);

  const handleChangePassword = async (currentPassword: string, newPassword: string) => {
    // First reauthenticate with current password
    await reauthenticate(currentPassword);
    // Then update password
    await updatePassword(newPassword);
  };

  const handleDeleteAccount = async (password: string) => {
    try {
      // First reauthenticate with password
      await reauthenticate(password);
      // Then delete the account
      await deleteAccount();
      // Navigate to login after successful deletion
      router.replace('/(auth)/login');
    } catch (error: any) {
      // If it's a requires-recent-login error, we already reauthenticated, so throw
      // Otherwise, rethrow the error
      throw error;
    }
  };

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to logout?');
      if (!confirmed) return;

      try {
        await signOut();
        router.replace('/(auth)/login');
      } catch (error) {
        alert('Failed to logout. Please try again.');
      }
    } else {
      Alert.alert('Logout', 'Are you sure you want to logout?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              router.replace('/(auth)/login');
            } catch (error) {
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]);
    }
  };

  if (isLoadingUser || isLoadingRestaurant) {
    return (
      <Container>
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      </Container>
    );
  }

  return (
    <Container>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Settings</Text>
      </View>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Header Section */}
        <View style={styles.profileSection}>
          <View style={styles.profileImageContainer}>
            {userData?.photoURL ? (
              <Image source={{ uri: userData.photoURL }} style={styles.profileImage} />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <MaterialIcons name="person" size={40} color="#666" />
              </View>
            )}
          </View>
          <Text style={styles.profileName}>{userData?.name || 'Staff'}</Text>
          <Text style={styles.profileEmail}>{currentUser?.email || ''}</Text>
          <View style={styles.badgeContainer}>
            <View style={styles.badge}>
              <MaterialIcons
                name="support-agent"
                size={16}
                color="#10b981"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.badgeText}>Staff</Text>
            </View>
          </View>
        </View>

        {/* Restaurant Info Section */}
        {restaurant && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="restaurant" size={20} color="#10b981" style={{ marginRight: 8 }} />
              <Text style={styles.sectionTitle}>Restaurant Information</Text>
            </View>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <MaterialIcons
                  name="store"
                  size={20}
                  color="#10b981"
                  style={{ marginRight: 12, marginTop: 2 }}
                />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Restaurant Name</Text>
                  <Text style={styles.infoValue}>{restaurant.name}</Text>
                </View>
              </View>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <MaterialIcons
                  name="location-on"
                  size={20}
                  color="#10b981"
                  style={{ marginRight: 12, marginTop: 2 }}
                />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Address</Text>
                  <Text style={styles.infoValue}>{restaurant.address}</Text>
                </View>
              </View>
              {restaurant.gst_number && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <MaterialIcons
                      name="receipt"
                      size={20}
                      color="#10b981"
                      style={{ marginRight: 12, marginTop: 2 }}
                    />
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>GST Number</Text>
                      <Text style={styles.infoValue}>{restaurant.gst_number}</Text>
                    </View>
                  </View>
                </>
              )}
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <MaterialIcons
                  name="percent"
                  size={20}
                  color="#10b981"
                  style={{ marginRight: 12, marginTop: 2 }}
                />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>GST Percentage</Text>
                  <Text style={styles.infoValue}>{restaurant.gst_percentage}%</Text>
                </View>
              </View>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <MaterialIcons
                  name="attach-money"
                  size={20}
                  color="#10b981"
                  style={{ marginRight: 12, marginTop: 2 }}
                />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Service Charge</Text>
                  <Text style={styles.infoValue}>{restaurant.service_charge}%</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Account Settings Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="settings" size={20} color="#10b981" style={{ marginRight: 8 }} />
            <Text style={styles.sectionTitle}>Account Settings</Text>
          </View>

          {/* Change Password Option */}
          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => setPasswordModalVisible(true)}
            activeOpacity={0.7}>
            <View style={styles.optionIconContainer}>
              <MaterialIcons name="lock" size={24} color="#10b981" />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Change Password</Text>
              <Text style={styles.optionDescription}>Update your account password</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#999" />
          </TouchableOpacity>

          {/* Delete Account Option */}
          <TouchableOpacity
            style={[styles.optionCard, styles.deleteAccountCard]}
            onPress={() => setDeleteAccountModalVisible(true)}
            activeOpacity={0.7}>
            <View style={[styles.optionIconContainer, styles.deleteAccountIconContainer]}>
              <MaterialIcons name="delete" size={24} color="#ff4444" />
            </View>
            <View style={styles.optionContent}>
              <Text style={[styles.optionTitle, styles.deleteAccountText]}>Delete Account</Text>
              <Text style={styles.optionDescription}>Permanently delete your account and all data</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#999" />
          </TouchableOpacity>
        </View>

        {/* Logout Section */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.optionCard, styles.logoutCard]}
            onPress={handleLogout}
            activeOpacity={0.7}
            disabled={isSigningOut}>
            <View style={styles.optionIconContainer}>
              <MaterialIcons name="logout" size={24} color="#ff4444" />
            </View>
            <View style={styles.optionContent}>
              <Text style={[styles.optionTitle, styles.logoutText]}>Logout</Text>
              <Text style={styles.optionDescription}>Sign out of your account</Text>
            </View>
            {isSigningOut ? (
              <ActivityIndicator size="small" color="#ff4444" />
            ) : (
              <MaterialIcons name="chevron-right" size={24} color="#999" />
            )}
          </TouchableOpacity>
        </View>

        {/* App Version / Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>OrderNest</Text>
          <Text style={styles.footerSubtext}>Restaurant Management System</Text>
        </View>
      </ScrollView>

      {/* Change Password Modal */}
      <ChangePasswordModal
        visible={passwordModalVisible}
        isUpdatingPassword={isUpdatingPassword}
        isReauthenticating={isReauthenticating}
        onClose={() => setPasswordModalVisible(false)}
        onUpdatePassword={handleChangePassword}
        theme='#10b981'
      />

      {/* Delete Account Modal */}
      <DeleteAccountModal
        visible={deleteAccountModalVisible}
        isDeletingAccount={isDeletingAccount}
        isReauthenticating={isReauthenticating}
        onClose={() => setDeleteAccountModalVisible(false)}
        onDeleteAccount={handleDeleteAccount}
        theme='#10b981'
      />
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#10b981',
  },
  scrollView: {
    flex: 1,
  },
  headerContainer: {
    marginBottom: 20,
    marginLeft: 16
  },
  header: {
    fontSize: 26,
    fontWeight: '800',
    color: '#333',
    letterSpacing: -0.5,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Profile Section
  profileSection: {
    backgroundColor: '#fff',
    // paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    marginBottom: 8,
  },
  profileImageContainer: {
    marginBottom: 16,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#10b981',
  },
  profileImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#10b981',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  badgeContainer: {
    flexDirection: 'row',
    paddingBottom: 8
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
  // Section Styles
  section: {
    marginTop: 16,
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  // Info Card
  infoCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 8,
    marginLeft: 32,
  },
  // Option Card
  optionCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  optionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  logoutCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#ff4444',
  },
  deleteAccountCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#ff4444',
  },
  deleteAccountIconContainer: {
    backgroundColor: '#ffebee',
  },
  deleteAccountText: {
    color: '#ff4444',
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  logoutText: {
    color: '#ff4444',
  },
  optionDescription: {
    fontSize: 13,
    color: '#666',
  },
  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 14,
    color: '#999',
  },
});
