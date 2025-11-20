import React, { useState } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, Switch, Image, TouchableOpacity } from 'react-native';
import { useMenuItems, useUpdateMenuItem } from '@/firebase/hooks/useMenuItem';
import { Container } from '@/components/Container';
import { useAuth } from '@/firebase/hooks/useAuth';
import { useUser } from '@/firebase/hooks/useUsers';
import type { MenuItem } from '@/firebase/types';
import { MaterialIcons } from '@expo/vector-icons';

export default function MenuItems() {
  const { currentUser } = useAuth();
  const userData = useUser(currentUser?.uid || '').data;
  const restaurantId = userData?.restaurantId || '';
  const { data: items, isLoading } = useMenuItems(restaurantId);
  const update = useUpdateMenuItem();
  const [togglingItems, setTogglingItems] = useState<Set<string>>(new Set());

  const toggleAvailability = (id: string) => {
    // Prevent rapid toggling
    if (togglingItems.has(id) || update.isPending) return;
    
    const item = items?.find(i => i.id === id);
    if (!item) return;
    
    setTogglingItems(prev => new Set(prev).add(id));
    update.mutate(
      { menuItemId: id, updates: { available: !item.available } },
      {
        onSettled: () => {
          setTogglingItems(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        },
      }
    );
  };

  const MenuItemCard = ({ item }: { item: MenuItem }) => {
    const isToggling = togglingItems.has(item.id);
    const isUnavailable = !item.available;
    
    return (
      <View style={[styles.card, isUnavailable && styles.unavailableCard]}>
        <View style={styles.imageContainer}>
          {item.image_url ? (
            <Image
              source={{ uri: item.image_url }}
              style={[styles.image, isUnavailable && styles.unavailableImage]}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.imagePlaceholder, isUnavailable && styles.unavailableImage]}>
              <MaterialIcons name="restaurant-menu" size={32} color="#999" />
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
            <View style={styles.nameContainer}>
              <Text style={[styles.name, isUnavailable && styles.unavailableName]} numberOfLines={1}>
                {item.name}
              </Text>
              {isUnavailable && (
                <View style={styles.unavailableBadge}>
                  <Text style={styles.unavailableBadgeText}>Unavailable</Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              style={[styles.toggleContainer, isToggling && styles.toggleContainerDisabled]}
              onPress={() => toggleAvailability(item.id)}
              disabled={isToggling}
              activeOpacity={0.7}
            >
              {isToggling ? (
                <ActivityIndicator size="small" color="#ff6b35" />
              ) : (
                <Switch
                  value={item.available}
                  onValueChange={() => toggleAvailability(item.id)}
                  trackColor={{ false: '#ccc', true: '#ff6b35aa' }}
                  thumbColor={item.available ? '#ff6b35' : '#999'}
                  ios_backgroundColor="#fee2e2"
                  disabled={isToggling}
                />
              )}
            </TouchableOpacity>
          </View>
          {item.description ? (
            <Text style={[styles.desc, isUnavailable && styles.unavailableDesc]} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}
          <View style={styles.footerRow}>
            <View style={styles.priceContainer}>
              <Text style={[styles.price, isUnavailable && styles.unavailablePrice]}>
                ₹{item.price.toFixed(2)}
              </Text>
            </View>
            <View style={styles.availabilityContainer}>
              <View style={[styles.statusIndicator, item.available ? styles.availableIndicator : styles.unavailableIndicator]} />
              <Text style={[styles.availText, !item.available && styles.unavailableText]}>
                {item.available ? 'Available' : 'Unavailable'}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  if (isLoading) {
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
        <Text style={styles.header}>Menu Items</Text>
      </View>
      <View style={styles.container}>
        {/* <View style={styles.headerContainer}>
          <Text style={styles.header}>Menu Items</Text>
          <Text style={styles.subHeader}>
            {items?.length || 0} {items?.length === 1 ? 'item' : 'items'}
          </Text>
        </View> */}

        <FlatList
          data={items ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MenuItemCard item={item} />}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="restaurant-menu" size={64} color="#999" />
              <Text style={styles.emptyTitle}>No menu items</Text>
              <Text style={styles.emptyMessage}>
                Menu items will appear here when they are added
              </Text>
            </View>
          }
        />
      </View>
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 12,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContainer: {
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  header: {
    fontSize: 22,
    fontWeight: '800',
    color: '#333',
    letterSpacing: -0.5,
  },
  subHeader: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    fontWeight: '500',
  },
  listContent: {
    paddingBottom: 16,
  },
  separator: {
    height: 12,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginHorizontal:2
  },
  unavailableCard: {
    backgroundColor: '#fafafa',
    opacity: 0.95,
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
  unavailableImage: {
    opacity: 0.6,
  },
  imagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(255, 107, 53, 0.9)',
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
  nameContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginRight: 8,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    flexShrink: 1,
  },
  unavailableName: {
    color: '#666',
  },
  unavailableBadge: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 6,
  },
  unavailableBadgeText: {
    color: '#ef4444',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  toggleContainer: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 50,
  },
  toggleContainerDisabled: {
    opacity: 0.6,
  },
  desc: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginBottom: 8,
  },
  unavailableDesc: {
    color: '#999',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
  },
  priceContainer: {
    backgroundColor: '#fff3f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ff6b35',
  },
  unavailablePrice: {
    color: '#999',
  },
  availabilityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  availableIndicator: {
    backgroundColor: '#ff6b35',
  },
  unavailableIndicator: {
    backgroundColor: '#ef4444',
  },
  availText: {
    fontSize: 12,
    color: '#ff6b35',
    fontWeight: '600',
    marginRight: 4,
  },
  unavailableText: {
    color: '#ef4444',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});

