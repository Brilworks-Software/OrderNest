import React, { useEffect, useState } from 'react'
import {
    View,
    Text,
    Modal,
    TextInput,
    ScrollView,
    Pressable,
    Switch,
    StyleSheet,
    Image,
    Alert,
    Platform,
    KeyboardAvoidingView,
} from 'react-native'
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

        // validate required fields
        if (!name.trim()) {
            if (Platform.OS === 'web') {
                alert('Validation error: Name is required.')
            } else {
                Alert.alert('Validation error', 'Name is required.')
            }
            setIsLoading(false)
            return
        }

        if (!category.trim()) {
            if (Platform.OS === 'web') {
                alert('Validation error: Category is required.')
            } else {
                Alert.alert('Validation error', 'Category is required.')
            }
            setIsLoading(false)
            return
        }

        if (!description.trim()) {
            if (Platform.OS === 'web') {
                alert('Validation error: Description is required.')
            } else {
                Alert.alert('Validation error', 'Description is required.')
            }
            setIsLoading(false)
            return
        }

        const parsedPrice = parseFloat(price || '')
        if (isNaN(parsedPrice) || parsedPrice < 0) {
            if (Platform.OS === 'web') {
                alert('Validation error: Please enter a valid non-negative price.')
            } else {
                Alert.alert('Validation error', 'Please enter a valid non-negative price.')
            }
            setIsLoading(false)
            return
        }

        const id = initialItem?.id ?? `${restaurantId}-${Date.now().toString()}`

        let finalImageUrl = imageUrl.trim()
        if (finalImageUrl === '') {
            if (Platform.OS === 'web') {
                alert('Validation error: Please select an image for the menu item.')
            } else {
                Alert.alert('Validation error', 'Please select an image for the menu item.')
            }
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
                if (Platform.OS === 'web') {
                    alert('Upload failed: Could not upload image. Please try again.')
                } else {
                    Alert.alert('Upload failed', 'Could not upload image. Please try again.')
                }
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
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <KeyboardAvoidingView 
                style={{ flex: 1 }} 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <View style={localStyles.modalContainer}>
                    <View style={localStyles.modalContent}>
                        <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
                        <Text style={localStyles.header}>{isEdit ? 'Edit Menu Item' : 'Add Menu Item'}</Text>

                        <Text style={localStyles.label}>Name</Text>
                        <TextInput style={localStyles.input} value={name} onChangeText={setName} placeholder="Item name" />

                        <Text style={localStyles.label}>Category</Text>
                        <TextInput style={localStyles.input} value={category} onChangeText={setCategory} placeholder="e.g. Drinks, ice-creams" />

                        <Text style={localStyles.label}>Description</Text>
                        <TextInput style={[localStyles.input, { height: 80 }]} multiline value={description} onChangeText={setDescription} placeholder="Describe item" />

                        <Text style={localStyles.label}>Price</Text>
                        <TextInput
                            style={localStyles.input}
                            value={price}
                            onChangeText={t => setPrice(t.replace(/[^0-9.]/g, ''))}
                            keyboardType="decimal-pad"
                            placeholder="0.00"
                        />

                        <Text style={localStyles.label}>Image</Text>

                        {imageUrl ? (
                            <View style={{ marginBottom: 8 }}>
                                <Image source={{ uri: imageUrl }} style={localStyles.previewImage} resizeMode="cover" />
                                
                            </View>
                        ) : null}

                        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                            <Pressable onPress={pickImage} style={[localStyles.saveButton, { backgroundColor: '#0078d4', paddingHorizontal: 12 }]}>
                                <Text style={{ color: '#fff' }}>Select Image</Text>
                            </Pressable>
                            <Pressable onPress={() => setImageUrl('')} style={[localStyles.cancelButton, { paddingHorizontal: 12 }]}>
                                <Text style={{ color: '#333' }}>Clear</Text>
                            </Pressable>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
                            <Text style={localStyles.label}>Available</Text>
                            <Switch value={available} onValueChange={setAvailable} />
                        </View>

                        <View style={localStyles.modalButtons}>
                            <Pressable style={localStyles.cancelButton} onPress={onClose}>
                                <Text style={{ color: '#333' }}>Cancel</Text>
                            </Pressable>
                            <Pressable style={localStyles.saveButton} onPress={handleSave} disabled={isLoading || !name.trim()}>
                                <Text style={{ color: '#fff' }}>{isLoading ? 'Uploading...' : (isEdit ? 'Save' : 'Create')}</Text>
                            </Pressable>
                        </View>
                    </ScrollView>
                </View>
            </View>
            </KeyboardAvoidingView>
        </Modal>
    )
}

const localStyles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 16,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        maxHeight: '90%',
    },
    header: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
    label: {
        fontSize: 13,
        color: '#333',
        marginTop: 8,
        marginBottom: 6,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        fontSize: 14,
        backgroundColor: '#fff',
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        marginTop: 16,
    },
    cancelButton: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 8,
        backgroundColor: '#eee',
        marginRight: 8,
    },
    saveButton: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 8,
        backgroundColor: '#0078d4',
    },
    previewImage: {
        width: 120,
        height: 80,
        borderRadius: 6,
        marginBottom: 6,
        backgroundColor: '#f0f0f0',
    },
})