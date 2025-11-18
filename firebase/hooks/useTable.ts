import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import TableService, { CreateTableData } from '../services/TableService';
import type { Table } from '../types';

export function useTable(tableId: string) {
  const queryClient = useQueryClient();

  const query = useQuery<Table>({
    queryKey: ['table', tableId],
    queryFn: () => TableService.fetchTable(tableId),
    staleTime: Infinity,
    enabled: !!tableId,
  });

  return query;
}

type UpdateTableVariables = { tableId: string; updates: Partial<Table> };

/**
 * Mutation hook to update a table.
 * Uses optimistic update to keep react-query cache in sync.
 */
export function useUpdateTable() {
  const queryClient = useQueryClient();

  const mutation = useMutation<
    void,
    unknown,
    UpdateTableVariables,
    { previous?: Table }
  >({
    mutationFn: (variables?: UpdateTableVariables) => {
      if (!variables) return Promise.reject(new Error('No variables provided'));
      const { tableId, updates } = variables;
      return TableService.updateTable(tableId, updates);
    },
    onMutate: async (variables?: UpdateTableVariables) => {
      if (!variables) return { previous: undefined };
      const { tableId, updates } = variables;
      await queryClient.cancelQueries({ queryKey: ['table', tableId] });
      const previous = queryClient.getQueryData<Table>(['table', tableId]);

      if (previous) {
        const optimistic = { ...previous, ...updates } as Table;
        queryClient.setQueryData(['table', tableId], optimistic);
      }

      return { previous };
    },
    onError: (
      err: unknown,
      variables: UpdateTableVariables | undefined,
      context: { previous?: Table } | undefined
    ) => {
      if (variables?.tableId && context?.previous) {
        queryClient.setQueryData(['table', variables.tableId], context.previous);
      }
    },
    onSettled: (
      _data: void | undefined,
      _error: unknown,
      variables: UpdateTableVariables | undefined
    ) => {
      if (variables?.tableId) {
        queryClient.invalidateQueries({ queryKey: ['table', variables.tableId] });
      }
    },
  });

  return mutation;
}

/**
 * Mutation hook to create a new table.
 */
export function useCreateTable() {
  const queryClient = useQueryClient();

  const mutation = useMutation<
    Partial<Table>,
    unknown,
    { tableId: string; tableData: CreateTableData }
  >({
    mutationFn: ({ tableId, tableData }) => 
      TableService.createTable(tableId, tableData),
    onSuccess: (data, variables) => {
      // Set the new table data in cache
      if (data && data.id) {
        queryClient.setQueryData(['table', data.id], data);
      }
      // Invalidate and refetch tables list
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    },
  });

  return mutation;
}

/**
 * Query hook to get all tables for a specific restaurant.
 * Uses subscription for real-time updates.
 */
export function useTables(restaurantId: string) {
  const queryClient = useQueryClient();

  const query = useQuery<Table[]>({
    queryKey: ['tables', restaurantId],
    queryFn: () => TableService.getTablesByRestaurant(restaurantId),
    enabled: !!restaurantId,
  });

  useEffect(() => {
    if (!restaurantId) return;
    const unsub = TableService.subscribeToTables(restaurantId, (tables) => {
      queryClient.setQueryData(['tables', restaurantId], tables);
    });
    return () => unsub();
  }, [restaurantId, queryClient]);

  return query;
}

/**
 * Mutation hook to delete a table.
 */
export function useDeleteTable() {
  const queryClient = useQueryClient();

  const mutation = useMutation<
    void,
    unknown,
    { tableId: string }
  >({
    mutationFn: ({ tableId }) => 
      TableService.deleteTable(tableId),
    onSuccess: (_data, variables) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: ['table', variables.tableId] });
      // Invalidate tables list
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    },
  });

  return mutation;
}

/**
 * Mutation hook to assign a waiter to a table.
 */
export function useAssignWaiter() {
  const queryClient = useQueryClient();

  const mutation = useMutation<
    void,
    unknown,
    { tableId: string; waiterId: string }
  >({
    mutationFn: ({ tableId, waiterId }) => 
      TableService.assignWaiter(tableId, waiterId),
    onSuccess: (_data, variables) => {
      // Invalidate the specific table to refetch
      queryClient.invalidateQueries({ queryKey: ['table', variables.tableId] });
    },
  });

  return mutation;
}

/**
 * Mutation hook to update table status.
 */
export function useUpdateTableStatus() {
  const queryClient = useQueryClient();

  const mutation = useMutation<
    void,
    unknown,
    { tableId: string; status: string }
  >({
    mutationFn: ({ tableId, status }) => 
      TableService.updateTableStatus(tableId, status),
    onSuccess: (_data, variables) => {
      // Invalidate the specific table to refetch
      queryClient.invalidateQueries({ queryKey: ['table', variables.tableId] });
    },
  });

  return mutation;
}