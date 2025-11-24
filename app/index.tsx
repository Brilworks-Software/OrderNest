import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Hotel } from 'lucide-react-native';
import { useAuth } from '../firebase/hooks/useAuth';
import {userStore, UserStore} from '@/firebase/stores/userStore';
import { useUser } from '@/firebase/hooks/useUsers';
import { Container } from '@/components/Container';

export default function IndexScreen() {
  const { currentUser, isLoadingUser } = useAuth();
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoadingUserType, setIsLoadingUserType] = useState(true);
  const [userType, setUserType] = useState<'manager' | 'staff' | 'chef' | null>(null);
  const userData = useUser(currentUser?.uid || '').data;

  useEffect(() => {
    // Fetch user_type from AsyncStorage
    const fetchUserType = async () => {
      setIsLoadingUserType(true);
      try {
        const type = await UserStore.getUserType();
        setUserType(type);
      } catch (error) {
        console.error('Failed to fetch user type:', error);
        setUserType(null);
      } finally {
        setIsLoadingUserType(false);
      }
    };

    fetchUserType();
  }, []);

  useEffect(() => {
    // Give a moment for auth state to initialize
    const timer = setTimeout(() => {
      setIsInitializing(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isInitializing && !isLoadingUser) {
      if (currentUser) {
        if (userData) {
          console.log(userData);
          console.log(userData.isOnboarded);
          
          
          if(userData.isOnboarded === false) {
            router.replace('/(auth)/onboarding');
          }
          else if(userData.type === 'manager') {
            router.replace('/(manager)/(tabs)/home');
          }
          else if(userData.type === 'staff'){
            router.replace('/(staff)/(tabs)/home')
          }
          else if(userData.type === 'chef'){
            router.replace('/(chef)/(tabs)/home')
          }
        }
        
        
      } else {
        router.replace('/(auth)/login');
      }
    }
  }, [currentUser, isLoadingUser, isInitializing, userData]);

  if (isInitializing || isLoadingUser || isLoadingUserType) {
    return (
      <Container style={{ backgroundColor: userType === "chef" ? "#ff6b35dd" : userType === 'manager' ? "#104A9cdd" : userType === 'staff' ? "#10b981dd" : "#fff", padding: 0 }}>
        <View style={styles.loadingContainer}>
          <View style={[styles.logo, { backgroundColor: userType === "chef" ? "#ff6b35" : userType === 'manager' ? "#104A9c" : userType === 'staff' ? "#10b981" : "#fff"}]}>
            <Hotel size={40} color="#ffffff" />
          </View>
          <Text style={styles.appName}>Order Nest</Text>
          <Text style={styles.tagline}>Manage your Restaurant</Text>
          <View style={styles.loadingDots}>
            <View style={[styles.dot, styles.dot1]} />
            <View style={[styles.dot, styles.dot2]} />
            <View style={[styles.dot, styles.dot3]} />
          </View>
        </View>
      </Container>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  appName: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 48,
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  dot1: {
    opacity: 1,
  },
  dot2: {
    opacity: 0.7,
  },
  dot3: {
    opacity: 0.4,
  },
});