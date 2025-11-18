import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import {
  authService,
  type AuthCredentials,
  type RegisterCredentials,
} from '../services/AuthService';
import { useCreateUser } from './useUsers';
import type { User } from 'firebase/auth';
import { userStore } from '../stores/userStore';

export const useAuth = () => {
  const queryClient = useQueryClient();
  const createUserMutation = useCreateUser();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [fcmTokenRegistered, setFcmTokenRegistered] = useState(false);

  // Set up real-time auth state listener
  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged(async (user) => {
        console.log();
        
      setCurrentUser(user);
      setIsLoadingUser(false);
      
      // Update userStore when auth state changes
      if (user) {
        // User is signed in - invalidate queries to refetch user data
        queryClient.invalidateQueries({ queryKey: ['currentUser'] });
        queryClient.invalidateQueries({ queryKey: ['user', user.uid] });
        
        
      } else {
        // User is signed out - clear user data and reset FCM token flag
        userStore.clearUser();
        queryClient.clear();
        setFcmTokenRegistered(false);
      }
    });

    return unsubscribe;
  }, [queryClient, fcmTokenRegistered]);

  const signInMutation = useMutation({
    mutationFn: (credentials: AuthCredentials) =>
      authService.signIn(credentials),
    // Auth state listener will handle query invalidation
  });

  const signUpMutation = useMutation({
    mutationFn: async (credentials: RegisterCredentials) => {
      // First, create the Firebase Auth user
      const userCredential = await authService.signUp(credentials);
      
      // Then, create the user document in Firestore
      if (userCredential.user) {
        await createUserMutation.mutateAsync({
          userId: userCredential.user.uid,
          userData: {
            email: credentials.email,
            type: credentials.type,
          }
        });
        
        // FCM token will be added automatically by the auth state listener
      }
      
      return userCredential;
    },
    // Auth state listener will handle query invalidation
  });

  const signOutMutation = useMutation({
    mutationFn: async () => {      
      // Then sign out
      return authService.signOut();
    },
    // Auth state listener will handle query invalidation
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {      
      // Then delete the account
      return authService.deleteAccount();
    },
    // Auth state listener will handle query invalidation
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (email: string) => authService.resetPassword(email),
  });

  const reauthMutation = useMutation({
    mutationFn: (password: string) => authService.reauthenticate(password),
  });

  const updatePasswordMutation = useMutation({
    mutationFn: (newPassword: string) => authService.updatePassword(newPassword),
  });

  return {
    currentUser,
    isLoadingUser,
    signIn: signInMutation.mutateAsync,
    isSigningIn: signInMutation.isPending,
    signInError: signInMutation.error,
    signUp: signUpMutation.mutateAsync,
    isSigningUp: signUpMutation.isPending,
    signUpError: signUpMutation.error,
    signOut: signOutMutation.mutateAsync,
    isSigningOut: signOutMutation.isPending,
    signOutError: signOutMutation.error,
    deleteAccount: deleteAccountMutation.mutateAsync,
    isDeletingAccount: deleteAccountMutation.isPending,
    deleteAccountError: deleteAccountMutation.error,
    resetPassword: resetPasswordMutation.mutateAsync,
    isResettingPassword: resetPasswordMutation.isPending,
    resetPasswordError: resetPasswordMutation.error,
    reauthenticate: reauthMutation.mutateAsync,
    isReauthenticating: reauthMutation.isPending,
    reauthenticateError: reauthMutation.error,
    updatePassword: updatePasswordMutation.mutateAsync,
    isUpdatingPassword: updatePasswordMutation.isPending,
    updatePasswordError: updatePasswordMutation.error,
    // User document creation functionality
    createUser: createUserMutation.mutateAsync,
    isCreatingUser: createUserMutation.isPending,
    createUserError: createUserMutation.error,
  };
};
