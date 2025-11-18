import React, { useState, useEffect } from 'react'
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Image,
    Switch,
    ActivityIndicator,
    TouchableOpacity,
} from 'react-native'
import { useMenuItems, useUpdateMenuItem, useCreateMenuItem } from '../../firebase/hooks/useMenuItem'
import { SafeAreaView } from 'react-native-safe-area-context'
import AddMenuItemModal, { MenuItemPayload } from '../../components/AddMenuItemModal'
import { MenuItem } from '../../firebase/types'
import { useAuth } from '@/firebase/hooks/useAuth'
import { useUser } from '@/firebase/hooks/useUsers'
import { MaterialIcons } from '@expo/vector-icons'

export default function MenuItems() {
    const { currentUser, isLoadingUser } = useAuth();
    const userData = useUser(currentUser?.uid || '').data;
    const restaurantId = userData?.restaurantId || '';
    const { data: items, isLoading } = useMenuItems(restaurantId)
    const update = useUpdateMenuItem()
    const create = useCreateMenuItem?.() // expecting a hook; safe-guard if not provided

    // modal visibility only (form moved into AddMenuItemModal)
    const [modalVisible, setModalVisible] = useState(false)
    const [editingItem, setEditingItem] = useState<MenuItemPayload | null>(null)

    useEffect(() => {
        // close modal after successful create or update
        if (create?.isSuccess || update?.isSuccess) {
            setModalVisible(false)
            setEditingItem(null)
        }
    }, [create?.isSuccess, update?.isSuccess])

    function toggleAvailability(id: string) {
        const it = items?.find(i => i.id === id)
        if (!it) return
        update.mutate({ menuItemId: id, updates: { available: !it.available } })
    }

    function toPayload(it: MenuItem): MenuItemPayload {
        return {
            id: it.id,
            restaurant_id: restaurantId,
            name: it.name,
            category: it.category ?? '',
            description: it.description ?? '',
            price: it.price,
            image_url: it.image_url ?? '',
            available: it.available,
        }
    }

    function renderItem({ item }: { item: MenuItem }) {
        return (
            <TouchableOpacity
                style={styles.card}
                activeOpacity={0.7}
                onPress={() => {
                    setEditingItem(toPayload(item))
                    setModalVisible(true)
                }}
            >
                <View style={styles.imageContainer}>
                    {item.image_url ? (
                        <Image
                            source={{ uri: item.image_url }}
                            style={styles.image}
                            resizeMode="cover"
                        />
                    ) : (
                        <View style={styles.imagePlaceholder}>
                            <MaterialIcons name="restaurant-menu" size={32} color="#abb5c3" />
                        </View>
                    )}
                    {item.category && (
                        <View style={styles.categoryBadge}>
                            <Text style={styles.categoryText}>{item.category}</Text>
                        </View>
                    )}
                </View>
                <View style={styles.info}>
                    <View style={styles.headerRow}>
                        <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                        <TouchableOpacity
                            style={styles.editButton}
                            onPress={(e) => {
                                e.stopPropagation()
                                setEditingItem(toPayload(item))
                                setModalVisible(true)
                            }}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <MaterialIcons name="edit" size={20} color="#104A9c" />
                        </TouchableOpacity>
                    </View>
                    {item.description ? (
                        <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
                    ) : null}
                    <View style={styles.footerRow}>
                        <View style={styles.priceContainer}>
                            <Text style={styles.price}>${item.price.toFixed(2)}</Text>
                        </View>
                        <View style={styles.availabilityContainer}>
                            <View style={[styles.statusIndicator, item.available ? styles.availableIndicator : styles.unavailableIndicator]} />
                            <Text style={[styles.availText, !item.available && styles.unavailableText]}>
                                {item.available ? 'Available' : 'Unavailable'}
                            </Text>
                            <View style={{ marginLeft: 6 }}>
                            <Switch
                                value={item.available}
                                onValueChange={() => toggleAvailability(item.id)}
                                trackColor={{ false: '#DFE0ED', true: '#104A9c' }}
                                thumbColor={item.available ? '#fff' : '#f4f3f4'}
                                ios_backgroundColor="#DFE0ED"
                            />
                            </View>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        )
    }

    function handleSave(item: MenuItemPayload) {
        const exists = items?.some(i => i.id === item.id)
        if (exists) {
            // send only updatable fields
            const { name, category, description, price, image_url, available } = item
            update.mutate({ menuItemId: item.id, updates: { name, category, description, price, image_url, available } })
            return
        }

        if (!create) {
            setModalVisible(false)
            setEditingItem(null)
            return
        }
        // create hook expects { menuItemId, menuItemData } per original code
        create.mutate({ menuItemId: item.id, menuItemData: item })
    }

    if (isLoading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" />
            </View>
        )
    }

    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
            {/* <View style={styles.header}>
                <Text style={styles.headerSubtitle}>
                    {items?.length || 0} {items?.length === 1 ? 'item' : 'items'}
                </Text>
            </View> */}
            
            <FlatList
                data={items ?? []}
                keyExtractor={i => i.id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={() => (
                    <View style={styles.emptyContainer}>
                        <MaterialIcons name="restaurant-menu" size={64} color="#DFE0ED" />
                        <Text style={styles.emptyTitle}>No menu items yet</Text>
                        <Text style={styles.emptySubtitle}>
                            Tap the + button to add your first menu item
                        </Text>
                    </View>
                )}
            />
        </View>

        <TouchableOpacity
          style={styles.fab}
          onPress={() => {
              setEditingItem(null)
              setModalVisible(true)
          }}
          activeOpacity={0.8}
          accessibilityLabel="Add menu item"
          accessibilityRole="button"
        >
          <MaterialIcons name="add" size={28} color="#fff" />
        </TouchableOpacity>

        {/* Add / Edit Menu Item Modal (extracted) */}
        <AddMenuItemModal
            visible={modalVisible}
            onClose={() => { setModalVisible(false); setEditingItem(null); }}
            onSave={handleSave}
            restaurantId={restaurantId}
            initialItem={editingItem}
        />
      </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#f5f6fa' },
    container: { flex: 1, backgroundColor: '#f5f6fa' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        backgroundColor: '#fff',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#DFE0ED',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: '#1d304b',
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#abb5c3',
        fontWeight: '500',
    },
    list: { padding: 16, paddingBottom: 100 },
    card: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    imageContainer: {
        position: 'relative',
    },
    image: {
        width: 100,
        height: 100,
        borderRadius: 12,
        backgroundColor: '#f0f0f0',
    },
    imagePlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 12,
        backgroundColor: '#f5f6fa',
        justifyContent: 'center',
        alignItems: 'center',
    },
    categoryBadge: {
        position: 'absolute',
        top: 8,
        left: 8,
        backgroundColor: 'rgba(16, 74, 156, 0.9)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    categoryText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    info: {
        flex: 1,
        marginLeft: 12,
        justifyContent: 'space-between',
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 4,
    },
    name: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1d304b',
        flex: 1,
        marginRight: 8,
    },
    editButton: {
        padding: 4,
    },
    desc: {
        fontSize: 13,
        color: '#6b7280',
        lineHeight: 18,
        marginBottom: 8,
    },
    footerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 'auto',
    },
    priceContainer: {
        backgroundColor: '#f5f6fa',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    price: {
        fontSize: 16,
        fontWeight: '700',
        color: '#104A9c',
    },
    availabilityContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    availableIndicator: {
        backgroundColor: '#10b981',
    },
    unavailableIndicator: {
        backgroundColor: '#ef4444',
    },
    availText: {
        fontSize: 12,
        color: '#10b981',
        fontWeight: '600',
        marginRight: 4,
    },
    unavailableText: {
        color: '#ef4444',
    },
    separator: { height: 12 },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 60,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1d304b',
        marginTop: 16,
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#abb5c3',
        textAlign: 'center',
        lineHeight: 20,
    },
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 24,
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#104A9c',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#104A9c',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
})