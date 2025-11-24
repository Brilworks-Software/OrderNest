import React, { useState, useEffect } from 'react';
import {
    Modal,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { Restaurant } from '@/firebase/types';
import { UseMutationResult } from '@tanstack/react-query';

type EditRestaurantModalProps = {
    visible: boolean;
    restaurant: Restaurant | undefined;
    restaurantId: string;
    updateRestaurantMutation: UseMutationResult<
        void,
        unknown,
        { restaurantId: string; updates: Partial<Restaurant> },
        unknown
    >;
    onClose: () => void;
};

const EditRestaurantModal: React.FC<EditRestaurantModalProps> = ({
    visible,
    restaurant,
    restaurantId,
    updateRestaurantMutation,
    onClose,
}) => {
    const [restaurantName, setRestaurantName] = useState('');
    const [restaurantAddress, setRestaurantAddress] = useState('');
    const [gstNumber, setGstNumber] = useState('');
    const [gstPercentage, setGstPercentage] = useState('');
    const [serviceCharge, setServiceCharge] = useState('');
    const [restaurantError, setRestaurantError] = useState<string | null>(null);
    const [focusedInput, setFocusedInput] = useState<string | null>(null);

    // Initialize restaurant form when modal opens or restaurant data changes
    useEffect(() => {
        if (visible && restaurant) {
            setRestaurantName(restaurant.name || '');
            setRestaurantAddress(restaurant.address || '');
            setGstNumber(restaurant.gst_number || '');
            setGstPercentage(restaurant.gst_percentage?.toString() || '0');
            setServiceCharge(restaurant.service_charge?.toString() || '0');
            setRestaurantError(null);
        }
    }, [visible, restaurant]);

    const handleUpdateRestaurant = async () => {
        setRestaurantError(null);

        // Validation
        if (!restaurantName.trim()) {
            setRestaurantError('Restaurant name is required');
            return;
        }
        if (!restaurantAddress.trim()) {
            setRestaurantError('Restaurant address is required');
            return;
        }

        const gstPercent = parseFloat(gstPercentage);
        const serviceChargePercent = parseFloat(serviceCharge);

        if (isNaN(gstPercent) || gstPercent < 0 || gstPercent > 100) {
            setRestaurantError('GST percentage must be between 0 and 100');
            return;
        }
        if (isNaN(serviceChargePercent) || serviceChargePercent < 0 || serviceChargePercent > 100) {
            setRestaurantError('Service charge must be between 0 and 100');
            return;
        }

        try {
            await updateRestaurantMutation.mutateAsync({
                restaurantId,
                updates: {
                    name: restaurantName.trim(),
                    address: restaurantAddress.trim(),
                    gst_number: gstNumber.trim() || undefined,
                    gst_percentage: gstPercent,
                    service_charge: serviceChargePercent,
                },
            });

           if(Platform.OS === "web"){
            alert('Restaurant information updated successfully')
           } else{
            Alert.alert('Success', 'Restaurant information updated successfully');
           }
            onClose();
        } catch (error: any) {
            setRestaurantError(error?.message || 'Failed to update restaurant information');
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="fade"
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
                            <Ionicons name="restaurant" size={24} color="#104A9c" style={styles.headerIcon} />
                            <Text style={styles.modalTitle}>Edit Restaurant</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={onClose}
                            disabled={updateRestaurantMutation.isPending}
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
                            {/* Restaurant Name */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Restaurant Name</Text>
                                <View style={[
                                    styles.inputContainer,
                                    focusedInput === 'name' && {borderColor: "#104A9c"},
                                    restaurantError && styles.inputContainerError
                                ]}>
                                    <Ionicons 
                                        name="restaurant-outline" 
                                        size={20} 
                                        color={focusedInput === 'name' ? '#104A9c' : '#999'} 
                                        style={styles.inputIcon}
                                    />
                                    <TextInput
                                        style={[styles.input, {outline: "none"}]}
                                        placeholder="Enter restaurant name"
                                        placeholderTextColor="#999"
                                        value={restaurantName}
                                        onChangeText={setRestaurantName}
                                        editable={!updateRestaurantMutation.isPending}
                                        onFocus={() => setFocusedInput("name")}
                                        onBlur={() => setFocusedInput(null)}
                                    />
                                </View>
                            </View>

                            {/* Address */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Address</Text>
                                <View style={[
                                    styles.inputContainer,
                                    styles.textAreaContainer,
                                    focusedInput === 'address' && {borderColor: "#104A9c"},
                                    restaurantError &&  styles.inputContainerError
                                ]}>
                                    <Ionicons 
                                        name="location-outline" 
                                        size={20} 
                                        color={focusedInput === 'address' ? '#104A9c' : '#999'} 
                                        style={[styles.inputIcon, styles.textAreaIcon]}
                                    />
                                    <TextInput
                                        style={[styles.input, styles.textArea, {outline: "none"}]}
                                        placeholder="Enter restaurant address"
                                        placeholderTextColor="#999"
                                        value={restaurantAddress}
                                        onChangeText={setRestaurantAddress}
                                        multiline
                                        numberOfLines={3}
                                        editable={!updateRestaurantMutation.isPending}
                                        onFocus={() => setFocusedInput("address")}
                                        onBlur={() => setFocusedInput(null)}
                                    />
                                </View>
                            </View>

                            {/* GST Number */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>GST Number <Text style={styles.optionalText}>(Optional)</Text></Text>
                                <View style={[
                                    styles.inputContainer,
                                    focusedInput === 'gstNumber' && {borderColor: "#104A9c"},
                                    restaurantError && styles.inputContainerError
                                ]}>
                                    <Ionicons 
                                        name="document-text-outline" 
                                        size={20} 
                                        color={focusedInput === 'gstNumber' ? '#104A9c' : '#999'} 
                                        style={styles.inputIcon}
                                    />
                                    <TextInput
                                        style={[styles.input, {outline: "none"}]}
                                        placeholder="Enter GST number"
                                        placeholderTextColor="#999"
                                        value={gstNumber}
                                        onChangeText={setGstNumber}
                                        editable={!updateRestaurantMutation.isPending}
                                        onFocus={() => setFocusedInput("gstNumber")}
                                        onBlur={() => setFocusedInput(null)}
                                    />
                                </View>
                            </View>

                            {/* GST Percentage */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>GST Percentage (%)</Text>
                                <View style={[
                                    styles.inputContainer,
                                    focusedInput === 'gstPercentage' && {borderColor: "#104A9c"},
                                    restaurantError && styles.inputContainerError
                                ]}>
                                    <Ionicons 
                                        name="calculator-outline" 
                                        size={20} 
                                        color={focusedInput === 'gstPercentage' ? '#104A9c' : '#999'} 
                                        style={styles.inputIcon}
                                    />
                                    <TextInput
                                        style={[styles.input, {outline: "none"}]}
                                        placeholder="Enter GST percentage (0-100)"
                                        placeholderTextColor="#999"
                                        value={gstPercentage}
                                        onChangeText={setGstPercentage}
                                        keyboardType="numeric"
                                        editable={!updateRestaurantMutation.isPending}
                                        onFocus={() => setFocusedInput("gstPercentage")}
                                        onBlur={() => setFocusedInput(null)}
                                    />
                                </View>
                            </View>

                            {/* Service Charge */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Service Charge (%)</Text>
                                <View style={[
                                    styles.inputContainer,
                                    focusedInput === 'serviceCharge' && {borderColor: "#104A9c"},
                                    restaurantError && styles.inputContainerError
                                ]}>
                                    <Ionicons 
                                        name="card-outline" 
                                        size={20} 
                                        color={focusedInput === 'serviceCharge' ? '#104A9c' : '#999'} 
                                        style={styles.inputIcon}
                                    />
                                    <TextInput
                                        style={[styles.input, {outline: "none"}]}
                                        placeholder="Enter service charge percentage (0-100)"
                                        placeholderTextColor="#999"
                                        value={serviceCharge}
                                        onChangeText={setServiceCharge}
                                        keyboardType="numeric"
                                        editable={!updateRestaurantMutation.isPending}
                                        onFocus={() => setFocusedInput("serviceCharge")}
                                        onBlur={() => setFocusedInput(null)}
                                    />
                                </View>
                            </View>

                            {restaurantError && (
                                <View style={styles.errorContainer}>
                                    <Ionicons name="alert-circle" size={18} color="#ff4444" />
                                    <Text style={styles.error}>{restaurantError}</Text>
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
                                updateRestaurantMutation.isPending && styles.buttonDisabled
                            ]}
                            onPress={onClose}
                            disabled={updateRestaurantMutation.isPending}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.modalButton, 
                                styles.saveButton,
                                updateRestaurantMutation.isPending && styles.buttonDisabled,
                                {backgroundColor: "#104A9c"}
                            ]}
                            onPress={handleUpdateRestaurant}
                            disabled={updateRestaurantMutation.isPending}
                        >
                            {updateRestaurantMutation.isPending ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <>
                                    <Ionicons name="checkmark-circle" size={20} color="#fff" style={styles.buttonIcon} />
                                    <Text style={styles.saveButtonText}>Save Changes</Text>
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

export default EditRestaurantModal;

const styles = StyleSheet.create({
    keyboardAvoidingView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        paddingHorizontal: 20,
    },
    modalContainer: {
        backgroundColor: '#fff',
        borderRadius: 20,
        width: '100%',
        maxWidth: 500,
        maxHeight: '90%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 10,
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    headerIcon: {
        marginRight: 10,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1a1a1a',
        letterSpacing: -0.3,
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#f5f5f5',
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollView: {
        maxHeight: '75%',
    },
    formContent: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 8,
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 8,
        color: '#333',
        letterSpacing: 0.1,
    },
    optionalText: {
        fontSize: 12,
        fontWeight: '400',
        color: '#999',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#e0e0e0',
        borderRadius: 10,
        backgroundColor: '#fafafa',
        paddingHorizontal: 4,
        minHeight: 48,
        maxHeight: "90%"
    },
    inputContainerFocused: {
        borderColor: '#007AFF',
        backgroundColor: '#fff',
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 2,
    },
    inputContainerError: {
        borderColor: '#ff4444',
    },
    textAreaContainer: {
        alignItems: 'flex-start',
        minHeight: 90,
        maxHeight: "97%",

    },
    inputIcon: {
        marginLeft: 10,
        marginRight: 6,
    },
    textAreaIcon: {
        marginTop: 10,
    },
    input: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 6,
        fontSize: 15,
        color: '#333',
        outline:'none',
    },
    textArea: {
        height: 70,
        textAlignVertical: 'top',
        paddingTop: 12,
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff5f5',
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ffebee',
        gap: 6,
        marginTop: 4,
    },
    error: {
        color: '#ff4444',
        fontSize: 13,
        fontWeight: '500',
        flex: 1,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 16,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        gap: 10,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 6,
        minHeight: 48,
        maxHeight: 90,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    cancelButton: {
        backgroundColor: '#f5f5f5',
    },
    cancelButtonText: {
        color: '#333',
        fontSize: 15,
        fontWeight: '600',
    },
    saveButton: {
        backgroundColor: '#007AFF',
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    buttonIcon: {
        marginRight: -2,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },
});

