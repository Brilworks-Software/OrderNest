import React, { useState } from 'react';
import {
    Modal,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type ChangePasswordModalProps = {
    visible: boolean;
    isUpdatingPassword: boolean;
    isReauthenticating: boolean;
    onClose: () => void;
    onUpdatePassword: (currentPassword: string, newPassword: string) => Promise<void>;
};

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
    visible,
    isUpdatingPassword,
    isReauthenticating,
    onClose,
    onUpdatePassword,
}) => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [focusedInput, setFocusedInput] = useState<string | null>(null);

    // Calculate password strength
    const getPasswordStrength = (password: string) => {
        if (password.length === 0) return { strength: 0, label: '', color: '#e0e0e0' };
        if (password.length < 6) return { strength: 1, label: 'Weak', color: '#ff4444' };
        if (password.length < 10) return { strength: 2, label: 'Medium', color: '#ffa500' };
        return { strength: 3, label: 'Strong', color: '#4caf50' };
    };

    const passwordStrength = getPasswordStrength(newPassword);

    const handleChangePassword = async () => {
        setPasswordError(null);

        // Validation
        if (!currentPassword.trim()) {
            setPasswordError('Please enter your current password');
            return;
        }
        if (!newPassword.trim()) {
            setPasswordError('Please enter a new password');
            return;
        }
        if (newPassword.length < 6) {
            setPasswordError('New password must be at least 6 characters');
            return;
        }
        if (newPassword !== confirmPassword) {
            setPasswordError('New passwords do not match');
            return;
        }
        if (currentPassword === newPassword) {
            setPasswordError('New password must be different from current password');
            return;
        }

        try {
            await onUpdatePassword(currentPassword, newPassword);
            Alert.alert('Success', 'Password changed successfully');
            handleClose();
        } catch (error: any) {
            setPasswordError(error?.message || 'Failed to change password');
        }
    };

    const handleClose = () => {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setPasswordError(null);
        onClose();
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={handleClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardAvoidingView}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                    {/* Header */}
                    <View style={styles.modalHeader}>
                        <View style={styles.headerContent}>
                            <Ionicons name="lock-closed" size={24} color="#007AFF" style={styles.headerIcon} />
                            <Text style={styles.modalTitle}>Change Password</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={handleClose}
                            disabled={isUpdatingPassword || isReauthenticating}
                        >
                            <Ionicons name="close" size={24} color="#666" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView 
                        style={styles.scrollView}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={styles.formContent}>
                            {/* Current Password */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Current Password</Text>
                                <View style={[
                                    styles.passwordInputContainer,
                                    focusedInput === 'current' && styles.passwordInputContainerFocused,
                                    passwordError && styles.passwordInputContainerError
                                ]}>
                                    <Ionicons 
                                        name="lock-closed-outline" 
                                        size={20} 
                                        color={focusedInput === 'current' ? '#007AFF' : '#999'} 
                                        style={styles.inputIcon}
                                    />
                                    <TextInput
                                        style={styles.passwordInput}
                                        placeholder="Enter current password"
                                        placeholderTextColor="#999"
                                        value={currentPassword}
                                        onChangeText={setCurrentPassword}
                                        secureTextEntry={!showCurrentPassword}
                                        autoCapitalize="none"
                                        editable={!isUpdatingPassword && !isReauthenticating}
                                        onBlur={() => setFocusedInput(null)}
                                    />
                                    <TouchableOpacity
                                        style={styles.eyeButton}
                                        onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                                        disabled={isUpdatingPassword || isReauthenticating}
                                    >
                                        <Ionicons 
                                            name={showCurrentPassword ? 'eye' : 'eye-off'} 
                                            size={22} 
                                            color={focusedInput === 'current' ? '#007AFF' : '#6b7280'} 
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* New Password */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>New Password</Text>
                                <View style={[
                                    styles.passwordInputContainer,
                                    focusedInput === 'new' && styles.passwordInputContainerFocused,
                                    passwordError && styles.passwordInputContainerError
                                ]}>
                                    <Ionicons 
                                        name="lock-closed-outline" 
                                        size={20} 
                                        color={focusedInput === 'new' ? '#007AFF' : '#999'} 
                                        style={styles.inputIcon}
                                    />
                                    <TextInput
                                        style={styles.passwordInput}
                                        placeholder="Enter new password (min 6 characters)"
                                        placeholderTextColor="#999"
                                        value={newPassword}
                                        onChangeText={setNewPassword}
                                        secureTextEntry={!showNewPassword}
                                        autoCapitalize="none"
                                        editable={!isUpdatingPassword && !isReauthenticating}
                                        onBlur={() => setFocusedInput(null)}
                                    />
                                    <TouchableOpacity
                                        style={styles.eyeButton}
                                        onPress={() => setShowNewPassword(!showNewPassword)}
                                        disabled={isUpdatingPassword || isReauthenticating}
                                    >
                                        <Ionicons 
                                            name={showNewPassword ? 'eye' : 'eye-off'} 
                                            size={22} 
                                            color={focusedInput === 'new' ? '#007AFF' : '#6b7280'} 
                                        />
                                    </TouchableOpacity>
                                </View>
                                {newPassword.length > 0 && (
                                    <View style={styles.passwordStrengthContainer}>
                                        <View style={styles.passwordStrengthBar}>
                                            <View 
                                                style={[
                                                    styles.passwordStrengthFill, 
                                                    { 
                                                        width: `${(passwordStrength.strength / 3) * 100}%`,
                                                        backgroundColor: passwordStrength.color
                                                    }
                                                ]} 
                                            />
                                        </View>
                                        {passwordStrength.label && (
                                            <Text style={[styles.passwordStrengthText, { color: passwordStrength.color }]}>
                                                {passwordStrength.label}
                                            </Text>
                                        )}
                                    </View>
                                )}
                            </View>

                            {/* Confirm Password */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Confirm New Password</Text>
                                <View style={[
                                    styles.passwordInputContainer,
                                    focusedInput === 'confirm' && styles.passwordInputContainerFocused,
                                    passwordError && styles.passwordInputContainerError
                                ]}>
                                    <Ionicons 
                                        name="lock-closed-outline" 
                                        size={20} 
                                        color={focusedInput === 'confirm' ? '#007AFF' : '#999'} 
                                        style={styles.inputIcon}
                                    />
                                    <TextInput
                                        style={styles.passwordInput}
                                        placeholder="Confirm new password"
                                        placeholderTextColor="#999"
                                        value={confirmPassword}
                                        onChangeText={setConfirmPassword}
                                        secureTextEntry={!showConfirmPassword}
                                        autoCapitalize="none"
                                        editable={!isUpdatingPassword && !isReauthenticating}
                                        onBlur={() => setFocusedInput(null)}
                                    />
                                    <TouchableOpacity
                                        style={styles.eyeButton}
                                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                        disabled={isUpdatingPassword || isReauthenticating}
                                    >
                                        <Ionicons 
                                            name={showConfirmPassword ? 'eye' : 'eye-off'} 
                                            size={22} 
                                            color={focusedInput === 'confirm' ? '#007AFF' : '#6b7280'} 
                                        />
                                    </TouchableOpacity>
                                </View>
                                {confirmPassword.length > 0 && newPassword === confirmPassword && (
                                    <View style={styles.matchIndicator}>
                                        <Ionicons name="checkmark-circle" size={16} color="#4caf50" />
                                        <Text style={styles.matchText}>Passwords match</Text>
                                    </View>
                                )}
                            </View>

                            {passwordError && (
                                <View style={styles.errorContainer}>
                                    <Ionicons name="alert-circle" size={18} color="#ff4444" />
                                    <Text style={styles.error}>{passwordError}</Text>
                                </View>
                            )}
                        </View>
                    </ScrollView>

                    {/* Actions */}
                    <View style={styles.modalActions}>
                        <TouchableOpacity
                            style={[
                                styles.modalButton, 
                                styles.cancelButton,
                                (isUpdatingPassword || isReauthenticating) && styles.buttonDisabled
                            ]}
                            onPress={handleClose}
                            disabled={isUpdatingPassword || isReauthenticating}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.modalButton, 
                                styles.saveButton,
                                (isUpdatingPassword || isReauthenticating) && styles.buttonDisabled
                            ]}
                            onPress={handleChangePassword}
                            disabled={isUpdatingPassword || isReauthenticating}
                        >
                            {isUpdatingPassword || isReauthenticating ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <>
                                    <Ionicons name="checkmark-circle" size={20} color="#fff" style={styles.buttonIcon} />
                                    <Text style={styles.saveButtonText}>Change Password</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

export default ChangePasswordModal;

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
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 10,
        color: '#333',
        letterSpacing: 0.2,
    },
    passwordInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#e0e0e0',
        borderRadius: 12,
        backgroundColor: '#fafafa',
        paddingHorizontal: 4,
        minHeight: 52,
    },
    passwordInputContainerFocused: {
        borderColor: '#007AFF',
        backgroundColor: '#fff',
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 2,
    },
    passwordInputContainerError: {
        borderColor: '#ff4444',
    },
    inputIcon: {
        marginLeft: 12,
        marginRight: 8,
    },
    passwordInput: {
        flex: 1,
        paddingVertical: 14,
        paddingHorizontal: 8,
        fontSize: 16,
        color: '#333',
    },
    eyeButton: {
        padding: 12,
        marginRight: 4,
    },
    passwordStrengthContainer: {
        marginTop: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    passwordStrengthBar: {
        flex: 1,
        height: 4,
        backgroundColor: '#e0e0e0',
        borderRadius: 2,
        overflow: 'hidden',
    },
    passwordStrengthFill: {
        height: '100%',
        borderRadius: 2,
    },
    passwordStrengthText: {
        fontSize: 12,
        fontWeight: '600',
        minWidth: 50,
    },
    matchIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        gap: 6,
    },
    matchText: {
        fontSize: 13,
        color: '#4caf50',
        fontWeight: '500',
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
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
        minHeight: 52,
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

