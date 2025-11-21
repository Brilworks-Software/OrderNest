import React, { useEffect, useState } from 'react'
import {
    View,
    Text,
    Modal,
    TextInput,
    ScrollView,
    Switch,
    StyleSheet,
    Image,
    Platform,
    KeyboardAvoidingView,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { useUploadImage } from '../firebase/hooks/useImageUpload' // added

export type MenuItemPayload = {
    id: string
    restaurant_id: string
    name: string
    category: string
    description: string
    price: number
    image_url: string
    available: boolean
}

export default function AddMenuItemModal({
    visible,
    onClose,
    onSave,
    loading,
    restaurantId = 'demo-restaurant',
    initialItem = null,
}: {
    visible: boolean
    onClose: () => void
    onSave: (item: MenuItemPayload) => void
    loading?: boolean
    restaurantId?: string
    initialItem?: MenuItemPayload | null
}) {
    const [name, setName] = useState('')
    const [category, setCategory] = useState('')
    const [description, setDescription] = useState('')
    const [price, setPrice] = useState('0.00')
    const [imageUrl, setImageUrl] = useState('') // may hold local uri or remote url
    const [available, setAvailable] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [focusedInput, setFocusedInput] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string>('');

    // hook to upload image
    const upload = useUploadImage()

    useEffect(() => {
        // when modal opens with an initialItem, populate fields for editing
        if (visible && initialItem) {
            console.log("initial Item: ", JSON.stringify(initialItem));
            
            setName(initialItem.name ?? '')
            setCategory(initialItem.category ?? '')
            setDescription(initialItem.description ?? '')
            setPrice((initialItem.price ?? 0).toFixed(2))
            setImageUrl(initialItem.image_url ?? '')
            setAvailable(Boolean(initialItem.available))
            return
        }

        if (!visible) {
            // reset when modal closes
            setName('')
            setCategory('')
            setDescription('')
            setPrice('0.00')
            setImageUrl('')
            setAvailable(true)
            setErrorMessage('')
            setFocusedInput(null)
        }
    }, [visible, initialItem])

    async function pickImage() {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
            if (status !== 'granted') return

            const res = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: 'images',
                quality: 0.8,
            })

            // handle both old (res.cancelled + res.uri) and new (res.canceled + res.assets) shapes
            if ((res as any).cancelled === true || (res as any).canceled === true) return

            const uri =
                (res as any).uri ??
                ((res as any).assets && (res as any).assets[0]?.uri) ??
                ''

            if (!uri) return
            setImageUrl(uri)
        } catch (err) {
            // silent fail
            console.log(err);
            
        }
    }

    async function handleSave() {
        // basic validation
        setIsLoading(true)
        setErrorMessage('')

        // validate required fields
        if (!name.trim()) {
            setErrorMessage('Name is required.')
            setIsLoading(false)
            return
        }

        if (!category.trim()) {
            setErrorMessage('Category is required.')
            setIsLoading(false)
            return
        }

        if (!description.trim()) {
            setErrorMessage('Description is required.')
            setIsLoading(false)
            return
        }

        const parsedPrice = parseFloat(price || '')
        if (isNaN(parsedPrice) || parsedPrice < 0) {
            setErrorMessage('Please enter a valid non-negative price.')
            setIsLoading(false)
            return
        }

        const id = initialItem?.id ?? `${restaurantId}-${Date.now().toString()}`

        let finalImageUrl = imageUrl.trim()
        if (finalImageUrl === '') {
            setErrorMessage('Please select an image for the menu item.')
            setIsLoading(false)
            return
        }

        // if the imageUrl is a local file uri (not an http(s) remote url), upload it
        const isLocalFile = finalImageUrl && !/^https?:\/\//i.test(finalImageUrl)
        if (isLocalFile) {
            try {
                // folder path could be restaurant-specific
                const folderPath = `${restaurantId}/menu-items`
                // use mutateAsync to await the upload result
                finalImageUrl = await upload.mutateAsync({ folderPath, fileUri: finalImageUrl, customName: id })
            } catch (err) {
                console.log(err)
                setErrorMessage('Could not upload image. Please try again.')
                setIsLoading(false)
                return
            }
        }

        const newItem: MenuItemPayload = {
            id,
            restaurant_id: restaurantId,
            name: name.trim(),
            category: category.trim(),
            description: description.trim(),
            price: Number(parsedPrice),
            image_url: finalImageUrl,
            available,
        }

        onSave(newItem)
        setIsLoading(false)
    }

    const isEdit = Boolean(initialItem)

    return (
        <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
            <KeyboardAvoidingView 
                style={localStyles.keyboardAvoidingView}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <View style={localStyles.modalOverlay}>
                    <SafeAreaView style={localStyles.modalContainer} edges={['top', 'bottom']}>
                        {/* Header */}
                        <View style={localStyles.modalHeader}>
                            <View style={localStyles.headerContent}>
                                <Ionicons 
                                    name="restaurant-outline" 
                                    size={24} 
                                    color="#104A9c" 
                                    style={localStyles.headerIcon} 
                                />
                                <Text style={localStyles.modalTitle}>
                                    {isEdit ? 'Edit Menu Item' : 'Add Menu Item'}
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={localStyles.closeButton}
                                onPress={onClose}
                                disabled={isLoading}
                            >
                                <Ionicons name="close" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>

                        {/* Form Content */}
                        <ScrollView 
                            style={localStyles.scrollView}
                            contentContainerStyle={localStyles.scrollContent}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                        >
                            <View style={localStyles.formContent}>
                                {/* Name */}
                                <View style={localStyles.inputGroup}>
                                    <Text style={localStyles.label}>Name</Text>
                                    <View style={[
                                        localStyles.inputContainer,
                                        focusedInput === 'name' && {borderColor: "#104A9c"},
                                        errorMessage && localStyles.inputContainerError
                                    ]}>
                                        <Ionicons 
                                            name="restaurant-outline" 
                                            size={20} 
                                            color={focusedInput === 'name' ? '#104A9c' : '#999'} 
                                            style={localStyles.inputIcon}
                                        />
                                        <TextInput
                                            style={[localStyles.input, {outline: "none"}]}
                                            value={name}
                                            onChangeText={(t) => {
                                                setName(t)
                                                if (errorMessage) setErrorMessage('')
                                            }}
                                            placeholder="Item name"
                                            placeholderTextColor="#999"
                                            editable={!isLoading}
                                            onFocus={() => setFocusedInput("name")}
                                            onBlur={() => setFocusedInput(null)}
                                        />
                                    </View>
                                </View>

                                {/* Category */}
                                <View style={localStyles.inputGroup}>
                                    <Text style={localStyles.label}>Category</Text>
                                    <View style={[
                                        localStyles.inputContainer,
                                        focusedInput === 'category' && {borderColor: "#104A9c"},
                                        errorMessage &&  localStyles.inputContainerError
                                    ]}>
                                        <Ionicons 
                                            name="grid-outline" 
                                            size={20} 
                                            color={focusedInput === 'category' ? '#104A9c' : '#999'} 
                                            style={localStyles.inputIcon}
                                        />
                                        <TextInput
                                            style={[localStyles.input, {outline: "none"}]}
                                            value={category}
                                            onChangeText={(t) => {
                                                setCategory(t)
                                                if (errorMessage) setErrorMessage('')
                                            }}
                                            placeholder="e.g. Drinks, Ice-creams"
                                            placeholderTextColor="#999"
                                            editable={!isLoading}
                                            onFocus={() => setFocusedInput("category")}
                                            onBlur={() => setFocusedInput(null)}
                                        />
                                    </View>
                                </View>

                                {/* Description */}
                                <View style={localStyles.inputGroup}>
                                    <Text style={localStyles.label}>Description</Text>
                                    <View style={[
                                        localStyles.inputContainer,
                                        localStyles.textAreaContainer,
                                        focusedInput === 'description' && {borderColor: "#104A9c"},
                                        errorMessage &&  localStyles.inputContainerError
                                    ]}>
                                        <Ionicons 
                                            name="document-text-outline" 
                                            size={20} 
                                            color={focusedInput === 'description' ? '#104A9c' : '#999'} 
                                            style={[localStyles.inputIcon, localStyles.textAreaIcon]}
                                        />
                                        <TextInput
                                            style={[localStyles.input, localStyles.textArea, {outline: "none"}]}
                                            value={description}
                                            onChangeText={(t) => {
                                                setDescription(t)
                                                if (errorMessage) setErrorMessage('')
                                            }}
                                            placeholder="Describe the item"
                                            placeholderTextColor="#999"
                                            multiline
                                            numberOfLines={4}
                                            editable={!isLoading}
                                            onFocus={() => setFocusedInput("description")}
                                            onBlur={() => setFocusedInput(null)}
                                        />
                                    </View>
                                </View>

                                {/* Price */}
                                <View style={localStyles.inputGroup}>
                                    <Text style={localStyles.label}>Price</Text>
                                    <View style={[
                                        localStyles.inputContainer,
                                        focusedInput === 'price' && {borderColor: "#104A9c"},
                                        errorMessage &&  localStyles.inputContainerError
                                    ]}>
                                        <Ionicons 
                                            name="cash-outline" 
                                            size={20} 
                                            color={focusedInput === 'price' ? '#104A9c' : '#999'} 
                                            style={localStyles.inputIcon}
                                        />
                                        <TextInput
                                            style={[localStyles.input, {outline: "none"}]}
                                            value={price}
                                            onChangeText={(t) => {
                                                setPrice(t.replace(/[^0-9.]/g, ''))
                                                if (errorMessage) setErrorMessage('')
                                            }}
                                            keyboardType="decimal-pad"
                                            placeholder="0.00"
                                            placeholderTextColor="#999"
                                            editable={!isLoading}
                                            onFocus={() => setFocusedInput("price")}
                                            onBlur={() => setFocusedInput(null)}
                                        />
                                    </View>
                                </View>

                                {/* Image */}
                                <View style={localStyles.inputGroup}>
                                    <Text style={localStyles.label}>Image</Text>
                                    {imageUrl ? (
                                        <View style={localStyles.imagePreviewContainer}>
                                            <Image 
                                                source={{ uri: imageUrl }} 
                                                style={localStyles.previewImage} 
                                                resizeMode="cover" 
                                            />
                                            <TouchableOpacity
                                                style={localStyles.removeImageButton}
                                                onPress={() => {
                                                    setImageUrl('')
                                                    if (errorMessage) setErrorMessage('')
                                                }}
                                                disabled={isLoading}
                                            >
                                                <Ionicons name="close-circle" size={24} color="#ff4444" />
                                            </TouchableOpacity>
                                        </View>
                                    ) : (
                                        <TouchableOpacity
                                            style={localStyles.imagePickerButton}
                                            onPress={pickImage}
                                            disabled={isLoading}
                                        >
                                            <Ionicons name="image-outline" size={32} color="#104A9c" />
                                            <Text style={localStyles.imagePickerText}>Select Image</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>

                                {/* Available Toggle */}
                                <View style={localStyles.switchContainer}>
                                    <View style={localStyles.switchLabelContainer}>
                                        <Ionicons 
                                            name={available ? "checkmark-circle" : "close-circle"} 
                                            size={20} 
                                            color={available ? "#104A9c" : "#999"} 
                                        />
                                        <Text style={localStyles.switchLabel}>Available</Text>
                                    </View>
                                    <Switch 
                                        value={available} 
                                        onValueChange={setAvailable}
                                        trackColor={{ false: '#ccc', true: '#104A9c20' }}
                                        thumbColor={available ? '#104A9c' : '#999'}
                                        disabled={isLoading}
                                    />
                                </View>

                                {/* Error Message */}
                                {errorMessage && (
                                    <View style={localStyles.errorContainer}>
                                        <Ionicons name="alert-circle" size={18} color="#ff4444" />
                                        <Text style={localStyles.errorText}>{errorMessage}</Text>
                                    </View>
                                )}
                            </View>
                        </ScrollView>

                        {/* Actions */}
                        <View style={localStyles.modalActions}>
                            <TouchableOpacity
                                style={[
                                    localStyles.modalButton,
                                    localStyles.cancelButton,
                                    isLoading && localStyles.buttonDisabled
                                ]}
                                onPress={onClose}
                                disabled={isLoading}
                            >
                                <Text style={localStyles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    localStyles.modalButton,
                                    localStyles.saveButton,
                                    (isLoading || !name.trim()) && localStyles.buttonDisabled,
                                    {backgroundColor: "#104A9c"}
                                ]}
                                onPress={handleSave}
                                disabled={isLoading || !name.trim()}
                            >
                                {isLoading ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <>
                                        <Ionicons 
                                            name={isEdit ? "checkmark-circle" : "add-circle"} 
                                            size={20} 
                                            color="#fff" 
                                            style={localStyles.buttonIcon} 
                                        />
                                        <Text style={localStyles.saveButtonText}>
                                            {isEdit ? 'Save' : 'Create'}
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </SafeAreaView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    )
}

const localStyles = StyleSheet.create({
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
        paddingHorizontal: 20,
        paddingTop: 20,
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
        fontSize: 22,
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
        maxHeight: '75%',
    },
    scrollContent: {
        paddingBottom: 8,
    },
    formContent: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 12,
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 10,
        color: '#333',
        letterSpacing: 0.2,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#e0e0e0',
        borderRadius: 12,
        backgroundColor: '#fafafa',
        paddingHorizontal: 4,
        minHeight: 52,
    },
    inputContainerFocused: {
        borderColor: '#007AFF',
        backgroundColor: '#fff',
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 2,
    },
    inputContainerError: {
        borderColor: '#ff4444',
    },
    textAreaContainer: {
        alignItems: 'flex-start',
        minHeight: 100,
    },
    inputIcon: {
        marginLeft: 12,
        marginRight: 8,
    },
    textAreaIcon: {
        marginTop: 12,
    },
    input: {
        flex: 1,
        paddingVertical: 14,
        paddingHorizontal: 8,
        fontSize: 16,
        color: '#333',
        outline:'none',
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
        paddingTop: 14,
    },
    imagePreviewContainer: {
        position: 'relative',
        width: '100%',
        height: 200,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#f0f0f0',
        marginTop: 4,
    },
    previewImage: {
        width: '100%',
        height: '100%',
    },
    removeImageButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 20,
        padding: 4,
    },
    imagePickerButton: {
        width: '100%',
        height: 150,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#104A9c',
        borderStyle: 'dashed',
        backgroundColor: '#fafafa',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 4,
        gap: 8,
    },
    imagePickerText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#104A9c',
        marginTop: 4,
    },
    switchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 4,
        borderRadius: 12,
        backgroundColor: '#fafafa',
        marginTop: 4,
    },
    switchLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    switchLabel: {
        fontSize: 16,
        fontWeight: '600',
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
    errorText: {
        color: '#ff4444',
        fontSize: 14,
        fontWeight: '500',
        flex: 1,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 20,
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
})