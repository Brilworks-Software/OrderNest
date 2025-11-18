import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import MenuItemService, { CreateMenuItemData } from '../services/MenuItemService';
import type { MenuItem } from '../types';

export function useMenuItem(menuItemId: string) {
  const queryClient = useQueryClient();

  const query = useQuery<MenuItem>({
    queryKey: ['menuItem', menuItemId],
    queryFn: () => MenuItemService.fetchMenuItem(menuItemId),
    staleTime: Infinity,
    enabled: !!menuItemId,
  });

  return query;
}

type UpdateMenuItemVariables = { menuItemId: string; updates: Partial<MenuItem> };

/**
 * Mutation hook to update a menu item.
 * Uses optimistic update to keep react-query cache in sync.
 */
export function useUpdateMenuItem() {
  const queryClient = useQueryClient();

  const mutation = useMutation<
    void,
    unknown,
    UpdateMenuItemVariables,
    { previous?: MenuItem }
  >({
    mutationFn: (variables?: UpdateMenuItemVariables) => {
      if (!variables) return Promise.reject(new Error('No variables provided'));
      const { menuItemId, updates } = variables;
      return MenuItemService.updateMenuItem(menuItemId, updates);
    },
    onMutate: async (variables?: UpdateMenuItemVariables) => {
      if (!variables) return { previous: undefined };
      const { menuItemId, updates } = variables;
      await queryClient.cancelQueries({ queryKey: ['menuItem', menuItemId] });
      const previous = queryClient.getQueryData<MenuItem>(['menuItem', menuItemId]);

      if (previous) {
        const optimistic = { ...previous, ...updates } as MenuItem;
        queryClient.setQueryData(['menuItem', menuItemId], optimistic);
      }

      return { previous };
    },
    onError: (
      err: unknown,
      variables: UpdateMenuItemVariables | undefined,
      context: { previous?: MenuItem } | undefined
    ) => {
      if (variables?.menuItemId && context?.previous) {
        queryClient.setQueryData(['menuItem', variables.menuItemId], context.previous);
      }
    },
    onSettled: (
      _data: void | undefined,
      _error: unknown,
      variables: UpdateMenuItemVariables | undefined
    ) => {
      if (variables?.menuItemId) {
        queryClient.invalidateQueries({ queryKey: ['menuItem', variables.menuItemId] });
      }
    },
  });

  return mutation;
}

/**
 * Mutation hook to create a new menu item.
 */
export function useCreateMenuItem() {
  const queryClient = useQueryClient();

  const mutation = useMutation<
    Partial<MenuItem>,
    unknown,
    { menuItemId: string; menuItemData: CreateMenuItemData }
  >({
    mutationFn: ({ menuItemId, menuItemData }) => 
      MenuItemService.createMenuItem(menuItemId, menuItemData),
    onSuccess: (data, variables) => {
      // Set the new menu item data in cache
      if (data && data.id) {
        queryClient.setQueryData(['menuItem', data.id], data);
      }
      // Invalidate and refetch menu items list
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
    },
  });

  return mutation;
}

/**
 * Query hook to get all menu items for a specific restaurant.
 * Updated to take restaurantId and use the correct service method with subscription.
 */
export function useMenuItems(restaurantId: string) {
  const queryClient = useQueryClient();

  const query = useQuery<MenuItem[]>({
    queryKey: ['menuItems', restaurantId],
    queryFn: () => MenuItemService.getMenuItemsByRestaurant(restaurantId),
    enabled: !!restaurantId,
  });

  useEffect(() => {
    if (!restaurantId) return;
    const unsub = MenuItemService.subscribeToMenuItems(restaurantId, (menuItems) => {
      queryClient.setQueryData(['menuItems', restaurantId], menuItems);
    });
    return () => unsub();
  }, [restaurantId, queryClient]);

  return query;
}

/**
 * Mutation hook to delete a menu item.
 */
export function useDeleteMenuItem() {
  const queryClient = useQueryClient();

  const mutation = useMutation<
    void,
    unknown,
    { menuItemId: string }
  >({
    mutationFn: ({ menuItemId }) => 
      MenuItemService.deleteMenuItem(menuItemId),
    onSuccess: (_data, variables) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: ['menuItem', variables.menuItemId] });
      // Invalidate menu items list
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
    },
  });

  return mutation;
}