import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import OrderService, { CreateOrderData } from '../services/OrderService';
import type { Order, OrderItem } from '../types';
import { useTables } from './useTable';

export function useOrder(orderId: string) {
  const queryClient = useQueryClient();

  const query = useQuery<Order>({
    queryKey: ['order', orderId],
    queryFn: () => OrderService.fetchOrder(orderId),
    staleTime: Infinity,
    enabled: !!orderId,
  });

  useEffect(() => {
    if (!orderId) return;
    const unsub = OrderService.subscribeToOrder(orderId, (order) => {
      if (order) {
        queryClient.setQueryData(['order', orderId], order);
      } else {
        queryClient.removeQueries({ queryKey: ['order', orderId] });
      }
    });
    return () => unsub();
  }, [orderId, queryClient]);

  return query;
}

type UpdateOrderVariables = { orderId: string; updates: Partial<Order> };

/**
 * Mutation hook to update an order.
 * Uses optimistic update to keep react-query cache in sync.
 */
export function useUpdateOrder() {
  const queryClient = useQueryClient();

  const mutation = useMutation<
    void,
    unknown,
    UpdateOrderVariables,
    { previous?: Order }
  >({
    mutationFn: (variables?: UpdateOrderVariables) => {
      if (!variables) return Promise.reject(new Error('No variables provided'));
      const { orderId, updates } = variables;
      return OrderService.updateOrder(orderId, updates);
    },
    onMutate: async (variables?: UpdateOrderVariables) => {
      if (!variables) return { previous: undefined };
      const { orderId, updates } = variables;
      await queryClient.cancelQueries({ queryKey: ['order', orderId] });
      const previous = queryClient.getQueryData<Order>(['order', orderId]);

      if (previous) {
        const optimistic = { ...previous, ...updates } as Order;
        queryClient.setQueryData(['order', orderId], optimistic);
        
        // Also update in ordersByRestaurant cache if it exists
        queryClient.setQueriesData<Order[]>(
          { queryKey: ['ordersByRestaurant'] },
          (old) => {
            if (!old) return old;
            return old.map(o => o.id === orderId ? optimistic : o);
          }
        );
      }

      return { previous };
    },
    onError: (
      err: unknown,
      variables: UpdateOrderVariables | undefined,
      context: { previous?: Order } | undefined
    ) => {
      if (variables?.orderId && context?.previous) {
        queryClient.setQueryData(['order', variables.orderId], context.previous);
      }
    },
    onSettled: (
      _data: void | undefined,
      _error: unknown,
      variables: UpdateOrderVariables | undefined
    ) => {
      if (variables?.orderId) {
        queryClient.invalidateQueries({ queryKey: ['order', variables.orderId] });
        // Also invalidate orders list queries to refresh the list
        queryClient.invalidateQueries({ queryKey: ['ordersByWaiter'] });
        queryClient.invalidateQueries({ queryKey: ['ordersByTable'] });
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        queryClient.invalidateQueries({ queryKey: ['ordersByRestaurant'] });
      }
    },
  });

  return mutation;
}

/**
 * Mutation hook to create a new order.
 */
export function useCreateOrder() {
  const queryClient = useQueryClient();

  const mutation = useMutation<
    Partial<Order>,
    unknown,
    {orderData: CreateOrderData }
  >({
    mutationFn: ({ orderData }) => 
      OrderService.createOrder(orderData),
    onSuccess: (data, variables) => {
      // Set the new order data in cache
      if (data && data.id) {
        queryClient.setQueryData(['order', data.id], data);
      }
      // Invalidate and refetch orders list
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  return mutation;
}

/**
 * Query hook to get all orders for a specific table.
 * Uses subscription for real-time updates.
 */
export function useOrdersByTable(tableId: string) {
  const queryClient = useQueryClient();

  const query = useQuery<Order[]>({
    queryKey: ['ordersByTable', tableId],
    queryFn: () => OrderService.getOrdersByTable(tableId),
    enabled: !!tableId,
  });

  useEffect(() => {
    if (!tableId) return;
    const unsub = OrderService.subscribeToOrdersByTable(tableId, (orders) => {
      queryClient.setQueryData(['ordersByTable', tableId], orders);
    });
    return () => unsub();
  }, [tableId, queryClient]);

  return query;
}

/**
 * Query hook to get all orders by waiter.
 * Uses subscription for real-time updates.
 */
export function useOrdersByWaiter(waiterId: string) {
  const queryClient = useQueryClient();

  const query = useQuery<Order[]>({
    queryKey: ['ordersByWaiter', waiterId],
    queryFn: () => OrderService.getOrdersByWaiter(waiterId),
    enabled: !!waiterId,
  });

  useEffect(() => {
    if (!waiterId) return;
    const unsub = OrderService.subscribeToOrdersByWaiter(waiterId, (orders) => {
      queryClient.setQueryData(['ordersByWaiter', waiterId], orders);
    });
    return () => unsub();
  }, [waiterId, queryClient]);

  return query;
}

/**
 * Mutation hook to delete an order.
 */
export function useDeleteOrder() {
  const queryClient = useQueryClient();

  const mutation = useMutation<
    void,
    unknown,
    { orderId: string }
  >({
    mutationFn: ({ orderId }) => 
      OrderService.deleteOrder(orderId),
    onSuccess: (_data, variables) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: ['order', variables.orderId] });
      // Invalidate orders list
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  return mutation;
}

/**
 * Mutation hook to update order status.
 */
export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  const mutation = useMutation<
    void,
    unknown,
    { orderId: string; status: string }
  >({
    mutationFn: ({ orderId, status }) => 
      OrderService.updateOrderStatus(orderId, status),
    onSuccess: (_data, variables) => {
      // Invalidate the specific order to refetch
      queryClient.invalidateQueries({ queryKey: ['order', variables.orderId] });
    },
  });

  return mutation;
}

/**
 * Mutation hook to add items to an existing order.
 */
export function useAddItemsToOrder() {
  const queryClient = useQueryClient();

  const mutation = useMutation<
    void,
    unknown,
    { orderId: string; newItems: OrderItem[]; gst_percentage: number; service_charge_percentage: number }
  >({
    mutationFn: ({ orderId, newItems, gst_percentage, service_charge_percentage }) => 
      OrderService.addItemsToOrder(orderId, newItems, gst_percentage, service_charge_percentage),
    onSuccess: (_data, variables) => {
      // Invalidate the specific order to refetch
      queryClient.invalidateQueries({ queryKey: ['order', variables.orderId] });
    },
  });

  return mutation;
}

/**
 * Query hook to get all orders for a restaurant.
 * Uses subscription for real-time updates.
 */
export function useOrdersByRestaurant(restaurantId: string) {
  const queryClient = useQueryClient();
  const { data: tables } = useTables(restaurantId);
  
  const tableIds = useMemo(() => {
    return tables?.map(table => table.id) || [];
  }, [tables]);

  const query = useQuery<Order[]>({
    queryKey: ['ordersByRestaurant', restaurantId],
    queryFn: () => OrderService.getOrdersByTables(tableIds),
    enabled: !!restaurantId && tableIds.length > 0,
  });

  useEffect(() => {
    if (!restaurantId || tableIds.length === 0) return;
    const unsub = OrderService.subscribeToOrdersByTables(tableIds, (orders) => {
      queryClient.setQueryData(['ordersByRestaurant', restaurantId], orders);
    });
    return () => unsub();
  }, [restaurantId, tableIds, queryClient]);

  return query;
}