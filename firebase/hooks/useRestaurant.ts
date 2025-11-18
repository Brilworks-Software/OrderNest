import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import RestaurantService, { CreateRestaurantData } from '../services/RestaurantService';
import type { Restaurant } from '../types';

export function useRestaurant(restaurantId: string) {
  const queryClient = useQueryClient();

  const query = useQuery<Restaurant>({
    queryKey: ['restaurant', restaurantId],
    queryFn: () => RestaurantService.fetchRestaurant(restaurantId),
    staleTime: Infinity,
    enabled: !!restaurantId,
  });

  useEffect(() => {
    if (!restaurantId) return;
    const unsub = RestaurantService.subscribeToRestaurant(restaurantId, (restaurant) => {
      queryClient.setQueryData(['restaurant', restaurantId], restaurant);
      // Optionally update a global store if available
    });
    return () => unsub();
  }, [restaurantId, queryClient]);

  return query;
}

type UpdateRestaurantVariables = { restaurantId: string; updates: Partial<Restaurant> };

/**
 * Mutation hook to update a restaurant.
 * Uses optimistic update to keep react-query cache in sync.
 */
export function useUpdateRestaurant() {
  const queryClient = useQueryClient();

  const mutation = useMutation<
    void,
    unknown,
    UpdateRestaurantVariables,
    { previous?: Restaurant }
  >({
    mutationFn: (variables?: UpdateRestaurantVariables) => {
      if (!variables) return Promise.reject(new Error('No variables provided'));
      const { restaurantId, updates } = variables;
      return RestaurantService.updateRestaurant(restaurantId, updates);
    },
    onMutate: async (variables?: UpdateRestaurantVariables) => {
      if (!variables) return { previous: undefined };
      const { restaurantId, updates } = variables;
      await queryClient.cancelQueries({ queryKey: ['restaurant', restaurantId] });
      const previous = queryClient.getQueryData<Restaurant>(['restaurant', restaurantId]);

      if (previous) {
        const optimistic = { ...previous, ...updates } as Restaurant;
        queryClient.setQueryData(['restaurant', restaurantId], optimistic);
      }

      return { previous };
    },
    onError: (
      err: unknown,
      variables: UpdateRestaurantVariables | undefined,
      context: { previous?: Restaurant } | undefined
    ) => {
      if (variables?.restaurantId && context?.previous) {
        queryClient.setQueryData(['restaurant', variables.restaurantId], context.previous);
      }
    },
    onSettled: (
      _data: void | undefined,
      _error: unknown,
      variables: UpdateRestaurantVariables | undefined
    ) => {
      if (variables?.restaurantId) {
        queryClient.invalidateQueries({ queryKey: ['restaurant', variables.restaurantId] });
      }
    },
  });

  return mutation;
}

/**
 * Mutation hook to create a new restaurant.
 */
export function useCreateRestaurant() {
  const queryClient = useQueryClient();

  const mutation = useMutation<
    Partial<Restaurant>,
    unknown,
    { restaurantId: string; restaurantData: CreateRestaurantData }
  >({
    mutationFn: ({ restaurantId, restaurantData }) => 
      RestaurantService.createRestaurant(restaurantId, restaurantData),
    onSuccess: (data, variables) => {
      // Set the new restaurant data in cache
      if (data && data.id) {
        queryClient.setQueryData(['restaurant', data.id], data);
      }
      // Invalidate and refetch restaurants list
      queryClient.invalidateQueries({ queryKey: ['restaurants'] });
    },
  });

  return mutation;
}

/**
 * Query hook to get all restaurants.
 */
export function useRestaurants() {
  return useQuery<Restaurant[]>({
    queryKey: ['restaurants'],
    queryFn: () => RestaurantService.getAllRestaurants(),
  });
}

/**
 * Mutation hook to delete a restaurant.
 */
export function useDeleteRestaurant() {
  const queryClient = useQueryClient();

  const mutation = useMutation<
    void,
    unknown,
    { restaurantId: string }
  >({
    mutationFn: ({ restaurantId }) => 
      RestaurantService.deleteRestaurant(restaurantId),
    onSuccess: (_data, variables) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: ['restaurant', variables.restaurantId] });
      // Invalidate restaurants list
      queryClient.invalidateQueries({ queryKey: ['restaurants'] });
    },
  });

  return mutation;
}