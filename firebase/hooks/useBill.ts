import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import BillService, { CreateBillData } from '../services/BillService';
import type { Bill } from '../types';

export function useBill(billId: string) {
  const queryClient = useQueryClient();

  const query = useQuery<Bill>({
    queryKey: ['bill', billId],
    queryFn: () => BillService.fetchBill(billId),
    staleTime: Infinity,
    enabled: !!billId,
  });

  return query;
}

type UpdateBillVariables = { billId: string; updates: Partial<Bill> };

/**
 * Mutation hook to update a bill.
 * Uses optimistic update to keep react-query cache in sync.
 */
export function useUpdateBill() {
  const queryClient = useQueryClient();

  const mutation = useMutation<
    void,
    unknown,
    UpdateBillVariables,
    { previous?: Bill }
  >({
    mutationFn: (variables?: UpdateBillVariables) => {
      if (!variables) return Promise.reject(new Error('No variables provided'));
      const { billId, updates } = variables;
      return BillService.updateBill(billId, updates);
    },
    onMutate: async (variables?: UpdateBillVariables) => {
      if (!variables) return { previous: undefined };
      const { billId, updates } = variables;
      await queryClient.cancelQueries({ queryKey: ['bill', billId] });
      const previous = queryClient.getQueryData<Bill>(['bill', billId]);

      if (previous) {
        const optimistic = { ...previous, ...updates } as Bill;
        queryClient.setQueryData(['bill', billId], optimistic);
      }

      return { previous };
    },
    onError: (
      err: unknown,
      variables: UpdateBillVariables | undefined,
      context: { previous?: Bill } | undefined
    ) => {
      if (variables?.billId && context?.previous) {
        queryClient.setQueryData(['bill', variables.billId], context.previous);
      }
    },
    onSettled: (
      _data: void | undefined,
      _error: unknown,
      variables: UpdateBillVariables | undefined
    ) => {
      if (variables?.billId) {
        queryClient.invalidateQueries({ queryKey: ['bill', variables.billId] });
      }
    },
  });

  return mutation;
}

/**
 * Mutation hook to create a new bill.
 */
export function useCreateBill() {
  const queryClient = useQueryClient();

  const mutation = useMutation<
    Bill,
    unknown,
    { billId: string; billData: CreateBillData }
  >({
    mutationFn: ({ billId, billData }) => 
      BillService.createBill(billId, billData),
    onSuccess: (data, variables) => {
      // Set the new bill data in cache
      if (data && data.id) {
        queryClient.setQueryData(['bill', data.id], data);
      }
      // Invalidate and refetch bills list
      queryClient.invalidateQueries({ queryKey: ['bills'] });
    },
  });

  return mutation;
}

/**
 * Query hook to get all bills for a specific order.
 * Uses subscription for real-time updates.
 */
export function useBillsByOrder(orderId: string) {
  const queryClient = useQueryClient();

  const query = useQuery<Bill[]>({
    queryKey: ['billsByOrder', orderId],
    queryFn: () => BillService.getBillsByOrder(orderId),
    enabled: !!orderId,
  });

  useEffect(() => {
    if (!orderId) return;
    const unsub = BillService.subscribeToBillsByOrder(orderId, (bills) => {
      queryClient.setQueryData(['billsByOrder', orderId], bills);
    });
    return () => unsub();
  }, [orderId, queryClient]);

  return query;
}

/**
 * Mutation hook to delete a bill.
 */
export function useDeleteBill() {
  const queryClient = useQueryClient();

  const mutation = useMutation<
    void,
    unknown,
    { billId: string }
  >({
    mutationFn: ({ billId }) => 
      BillService.deleteBill(billId),
    onSuccess: (_data, variables) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: ['bill', variables.billId] });
      // Invalidate bills list
      queryClient.invalidateQueries({ queryKey: ['bills'] });
    },
  });

  return mutation;
}

/**
 * Mutation hook to mark a bill as paid.
 */
export function useMarkAsPaid() {
  const queryClient = useQueryClient();

  const mutation = useMutation<
    void,
    unknown,
    { billId: string }
  >({
    mutationFn: ({ billId }) => 
      BillService.markAsPaid(billId),
    onSuccess: (_data, variables) => {
      // Invalidate the specific bill to refetch
      queryClient.invalidateQueries({ queryKey: ['bill', variables.billId] });
    },
  });

  return mutation;
}