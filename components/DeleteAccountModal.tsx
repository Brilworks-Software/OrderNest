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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

type DeleteAccountModalProps = {
    visible: boolean;
    isDeletingAccount: boolean;
    isReauthenticating: boolean;
    onClose: () => void;
    onDeleteAccount: (password: string) => Promise<void>;
    theme: string;
};

const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
    visible,
    isDeletingAccount,
    isReauthenticating,
    onClose,
    onDeleteAccount,
    theme,
}) => {
    const [password, setPassword] = useState('');
    const [confirmText, setConfirmText] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [focusedInput, setFocusedInput] = useState<string | null>(null);
    const [passwordFocused, setPasswordFocused] = useState(false)
    const [confirmFocused,setConfirmFocused] = useState(false)

    const handleDeleteAccount = async () => {
        setError(null);

        // Validation
        if (!password.trim()) {
            setError('Please enter your password to confirm');
            return;
        }
        if (confirmText.toLowerCase() !== 'delete') {
            setError('Please type "DELETE" to confirm account deletion');
            return;
        }

        try {
            await onDeleteAccount(password);
            // Success will be handled by parent (navigation will occur)
        } catch (error: any) {
            setError(error?.message || 'Failed to delete account. Please try again.');
        }
    };

    const handleClose = () => {
        setPassword('');
        setConfirmText('');
        setError(null);
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
                    <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
                        {/* Header */}
                        <View style={styles.modalHeader}>
                            <View style={styles.headerContent}>
                                <Ionicons name="warning" size={24} color="#ff4444" style={styles.headerIcon} />
                                <Text style={styles.modalTitle}>Delete Account</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={handleClose}
                                disabled={isDeletingAccount || isReauthenticating}
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
                                {/* Warning Message */}
                                <View style={styles.warningContainer}>
                                    <Ionicons name="alert-circle" size={32} color="#ff4444" />
                                    <Text style={styles.warningTitle}>This action cannot be undone</Text>
                                    <Text style={styles.warningText}>
                                        Deleting your account will permanently remove all your data, including:
                                    </Text>
                                    <View style={styles.warningList}>
                                        <Text style={styles.warningItem}>• Your user profile and settings</Text>
                                        <Text style={styles.warningItem}>• All associated data</Text>
                                        <Text style={styles.warningItem}>• Access to the application</Text>
                                    </View>
                                </View>

                                {/* Password Input */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Enter Your Password</Text>
                                    <View style={[
                                        styles.passwordInputContainer,
                                        // passwordFocused && styles.passwordInputContainerFocused,
                                        passwordFocused && {borderColor: theme},
                                        error && styles.passwordInputContainerError
                                    ]}>
                                        <Ionicons 
                                            name="lock-closed-outline" 
                                            size={20} 
                                            color={theme} 
                                            style={styles.inputIcon}
                                        />
                                        <TextInput
                                            style={[styles.passwordInput, {outline:'none'}]}
                                            placeholder="Enter your password to confirm"
                                            placeholderTextColor="#999"
                                            value={password}
                                            onChangeText={setPassword}
                                            secureTextEntry={!showPassword}
                                            autoCapitalize="none"
                                            editable={!isDeletingAccount && !isReauthenticating}
                                            onFocus={() => setPasswordFocused(true)}
                                            onBlur={()=> setPasswordFocused(false)}
                                        />
                                        <TouchableOpacity
                                            style={styles.eyeButton}
                                            onPress={() => setShowPassword(!showPassword)}
                                            disabled={isDeletingAccount || isReauthenticating}
                                        >
                                            <Ionicons 
                                                name={showPassword ? 'eye' : 'eye-off'} 
                                                size={22} 
                                                color={theme} 
                                            />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* Confirm Text Input */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Type "DELETE" to confirm</Text>
                                    <View style={[
                                        styles.confirmInputContainer,
                                        // confirmFocused && styles.confirmInputContainerFocused,
                                        confirmFocused && {borderColor: theme},
                                        error && styles.confirmInputContainerError
                                    ]}>
                                        <TextInput
                                            style={[styles.confirmInput,{outline:'none'}]}
                                            placeholder="Type DELETE"
                                            placeholderTextColor="#999"
                                            value={confirmText}
                                            onChangeText={setConfirmText}
                                            autoCapitalize="none"
                                            editable={!isDeletingAccount && !isReauthenticating}
                                            onFocus={() => setConfirmFocused(true)}
                                            onBlur={()=> setConfirmFocused(false)}
                                        />
                                    </View>
                                </View>

                                {error && (
                                    <View style={styles.errorContainer}>
                                        <Ionicons name="alert-circle" size={18} color="#ff4444" />
                                        <Text style={styles.error}>{error}</Text>
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
                                    (isDeletingAccount || isReauthenticating) && styles.buttonDisabled
                                ]}
                                onPress={handleClose}
                                disabled={isDeletingAccount || isReauthenticating}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.modalButton, 
                                    styles.deleteButton,
                                    (isDeletingAccount || isReauthenticating) && styles.buttonDisabled
                                ]}
                                onPress={handleDeleteAccount}
                                disabled={isDeletingAccount || isReauthenticating}
                            >
                                {isDeletingAccount || isReauthenticating ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <>
                                        <Ionicons name="trash" size={20} color="#fff" style={styles.buttonIcon} />
                                        <Text style={styles.deleteButtonText}>Delete Account</Text>
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

export default DeleteAccountModal;

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
    warningContainer: {
        backgroundColor: '#fff5f5',
        padding: 20,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#ffebee',
        alignItems: 'center',
        marginBottom: 24,
    },
    warningTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#ff4444',
        marginTop: 12,
        marginBottom: 8,
    },
    warningText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 12,
    },
    warningList: {
        width: '100%',
        alignItems: 'flex-start',
    },
    warningItem: {
        fontSize: 13,
        color: '#666',
        marginTop: 4,
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
    confirmInputContainer: {
        borderWidth: 1.5,
        borderColor: '#e0e0e0',
        borderRadius: 12,
        backgroundColor: '#fafafa',
        paddingHorizontal: 16,
        minHeight: 52,
    },
    confirmInputContainerFocused: {
        borderColor: '#007AFF',
        backgroundColor: '#fff',
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 2,
    },
    confirmInputContainerError: {
        borderColor: '#ff4444',
    },
    confirmInput: {
        paddingVertical: 14,
        fontSize: 16,
        color: '#333',
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
    deleteButton: {
        backgroundColor: '#ff4444',
        shadowColor: '#ff4444',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonIcon: {
        marginRight: -4,
    },
    deleteButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});

