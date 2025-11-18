import { useMutation, useQueryClient } from "@tanstack/react-query";
import InviteUserService, { CreateInviteUserData } from "../services/InviteUserService";
import type { InviteUser } from "../types";

/**
 * Mutation hook to create a new invited user.
 */
export function useCreateInviteUser() {
  const queryClient = useQueryClient();

  const mutation = useMutation<
    Partial<InviteUser>,
    unknown,
    { userId: string; userData: CreateInviteUserData }
  >({
    mutationFn: ({ userId, userData }) =>
      InviteUserService.createInviteUser(userId, userData),

    onSuccess: (data) => {
      // Store new document in cache
      if (data && data.id) {
        queryClient.setQueryData(["inviteUser", data.id], data);
      }

      // Refresh invite user list if exists
      queryClient.invalidateQueries({ queryKey: ["inviteUsers"] });
    },
  });

  return mutation;
}
