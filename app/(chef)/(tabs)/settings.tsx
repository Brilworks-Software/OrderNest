import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/firebase/hooks/useAuth';
import { useUser } from '@/firebase/hooks/useUsers';
import { useRestaurant } from '@/firebase/hooks/useRestaurant';
import { router } from 'expo-router';
import ChangePasswordModal from '@/components/ChangePasswordModal';
import { MaterialIcons } from '@expo/vector-icons';

export default function Settings() {
    const { currentUser, isLoadingUser, signOut, isSigningOut, updatePassword, isUpdatingPassword, reauthenticate, isReauthenticating } = useAuth();
    const userData = useUser(currentUser?.uid || '').data;
    const restaurantId = userData?.restaurantId || '';
    const { data: restaurant, isLoading: isLoadingRestaurant } = useRestaurant(restaurantId);

    // Change Password Modal State
    const [passwordModalVisible, setPasswordModalVisible] = useState(false);

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
            Alert.alert(
                'Logout',
                'Are you sure you want to logout?',
                [
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
                ]
            );
        }
    };

    const handleChangePassword = async (currentPassword: string, newPassword: string) => {
        // First reauthenticate with current password
        await reauthenticate(currentPassword);
        // Then update password
        await updatePassword(newPassword);
    };

    if (isLoadingUser || isLoadingRestaurant) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.center}>
                    <ActivityIndicator size="large" />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
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
                    <Text style={styles.profileName}>{userData?.name || 'Chef'}</Text>
                    <Text style={styles.profileEmail}>{currentUser?.email || ''}</Text>
                    <View style={styles.badgeContainer}>
                        <View style={styles.badge}>
                            <MaterialIcons name="restaurant-menu" size={16} color="#ff6b35" style={{ marginRight: 6 }} />
                            <Text style={styles.badgeText}>Chef</Text>
                        </View>
                    </View>
                </View>

                {/* Restaurant Info Section */}
                {restaurant && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <MaterialIcons name="restaurant" size={20} color="#333" style={{ marginRight: 8 }} />
                            <Text style={styles.sectionTitle}>Restaurant Information</Text>
                        </View>
                        <View style={styles.infoCard}>
                            <View style={styles.infoRow}>
                                <MaterialIcons name="store" size={20} color="#ff6b35" style={{ marginRight: 12, marginTop: 2 }} />
                                <View style={styles.infoContent}>
                                    <Text style={styles.infoLabel}>Restaurant Name</Text>
                                    <Text style={styles.infoValue}>{restaurant.name}</Text>
                                </View>
                            </View>
                            <View style={styles.divider} />
                            <View style={styles.infoRow}>
                                <MaterialIcons name="location-on" size={20} color="#ff6b35" style={{ marginRight: 12, marginTop: 2 }} />
                                <View style={styles.infoContent}>
                                    <Text style={styles.infoLabel}>Address</Text>
                                    <Text style={styles.infoValue}>{restaurant.address}</Text>
                                </View>
                            </View>
                            {restaurant.gst_number && (
                                <>
                                    <View style={styles.divider} />
                                    <View style={styles.infoRow}>
                                        <MaterialIcons name="receipt" size={20} color="#ff6b35" style={{ marginRight: 12, marginTop: 2 }} />
                                        <View style={styles.infoContent}>
                                            <Text style={styles.infoLabel}>GST Number</Text>
                                            <Text style={styles.infoValue}>{restaurant.gst_number}</Text>
                                        </View>
                                    </View>
                                </>
                            )}
                            <View style={styles.divider} />
                            <View style={styles.infoRow}>
                                <MaterialIcons name="percent" size={20} color="#ff6b35" style={{ marginRight: 12, marginTop: 2 }} />
                                <View style={styles.infoContent}>
                                    <Text style={styles.infoLabel}>GST Percentage</Text>
                                    <Text style={styles.infoValue}>{restaurant.gst_percentage}%</Text>
                                </View>
                            </View>
                            <View style={styles.divider} />
                            <View style={styles.infoRow}>
                                <MaterialIcons name="attach-money" size={20} color="#ff6b35" style={{ marginRight: 12, marginTop: 2 }} />
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
                        <MaterialIcons name="settings" size={20} color="#333" style={{ marginRight: 8 }} />
                        <Text style={styles.sectionTitle}>Account Settings</Text>
                    </View>

                    {/* Change Password Option */}
                    <TouchableOpacity
                        style={styles.optionCard}
                        onPress={() => setPasswordModalVisible(true)}
                        activeOpacity={0.7}
                    >
                        <View style={styles.optionIconContainer}>
                            <MaterialIcons name="lock" size={24} color="#ff6b35" />
                        </View>
                        <View style={styles.optionContent}>
                            <Text style={styles.optionTitle}>Change Password</Text>
                            <Text style={styles.optionDescription}>Update your account password</Text>
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
                        disabled={isSigningOut}
                    >
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
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    scrollView: {
        flex: 1,
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    // Profile Section
    profileSection: {
        backgroundColor: '#fff',
        paddingVertical: 32,
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
        borderColor: '#ff6b35',
    },
    profileImagePlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#e0e0e0',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: '#ff6b35',
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
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff3f0',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    badgeText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#ff6b35',
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
        backgroundColor: '#fff3f0',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    logoutCard: {
        borderLeftWidth: 4,
        borderLeftColor: '#ff4444',
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

