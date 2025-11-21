import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  ScrollView, 
  Alert, 
  Image, 
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Restaurant } from '../../firebase/types';
import { useAuth } from '@/firebase/hooks/useAuth';
import { useUploadImage } from '@/firebase/hooks/useImageUpload';
import { Container } from '@/components/Container';
import {useCreateRestaurant} from '@/firebase/hooks/useRestaurant';
import { useUpdateUser } from '@/firebase/hooks/useUsers';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Hotel } from 'lucide-react-native';

export default function Onboarding() {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [gstPercentage, setGstPercentage] = useState('0');
  const [serviceCharge, setServiceCharge] = useState('0');
  const [imageURL, setImageURL] = useState(''); // holds either http(s) URL or local file uri from picker
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  
  // Blur timeout ref to prevent immediate blur
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const { currentUser, isLoadingUser } = useAuth();
  const uploadMutation = useUploadImage();
  const createRestaurantMutation = useCreateRestaurant();
  const updateUserMutation = useUpdateUser();

  const validate = (): string | null => {
    if (!name.trim()) return 'Name is required';
    if (!address.trim()) return 'Address is required';
    if (!gstNumber.trim()) return 'GST number is required';
    if (isNaN(Number(gstPercentage)) || Number(gstPercentage) < 0) return 'Invalid GST percentage';
    if (isNaN(Number(serviceCharge)) || Number(serviceCharge) < 0) return 'Invalid service charge';
    if (!imageURL.trim()) {
      return 'Please select an image for the restaurant';
    }
    return null;
  };

  const uploadImageAsync = async (uri: string): Promise<string> => {
    
    if (!uri) return '';
    if (!uri) return '';
    // if already a remote http(s) URL, return as-is
    if (/^https?:\/\//i.test(uri)) return uri;

    // otherwise upload local file URI using hook
    try {
      const folderPath = `restaurants/${currentUser?.uid || 'public'}`;
      const customName = `${Date.now()}`;
      const uploadedUrl = await uploadMutation.mutateAsync({
        folderPath,
        fileUri: uri,
        customName,
      });
      console.log('Uploaded image URL:', uploadedUrl);
      return uploadedUrl;
    } catch (err) {
      console.error('Image upload failed', err);
      throw err;
    }
   }
  

  const handleCreate = async () => {
    const err = validate();
    if (err) {
      setError(err);
      if(Platform.OS === 'web') {
        alert(err);
        return;
      }
      Alert.alert('Validation', err);
      return;
    }
    setError(null);
    setLoading(true);
    let image_url = imageURL.trim();
      // upload if local uri (not http/https)
      if (image_url && !/^https?:\/\//i.test(image_url)) {
        try {
          image_url = await uploadImageAsync(image_url);
        } catch (uploadErr: any) {
          if(Platform.OS === 'web') {
            alert('Image upload failed: ' + (uploadErr?.message || uploadErr));
            setLoading(false);
            
          }else{
          Alert.alert('Image upload failed', uploadErr?.message || 'Failed to upload image');
          setLoading(false);
        }
      }
    }

    try {
      const restaurant: Restaurant  = {
        id: `${Date.now()}-${Math.floor(Math.random() * 10000)}`, // replace with uuid if you prefer
        name: name.trim(),
        address: address.trim(),
        gst_number: gstNumber.trim(),
        gst_percentage: Number(gstPercentage),
        service_charge: Number(serviceCharge),
        legal_docs: [], // add upload/URI handling if needed
        userId: currentUser?.uid || '',
        photoURL: image_url,
      };

      // TODO: replace this stub with your firebase persistence function
      // e.g. import { createRestaurantInFirestore } from '../../lib/firebaseRestaurantHelpers'
      // if imageURL is a local file uri you likely need to upload it to storage and save the remote URL
      console.log('Create restaurant:', restaurant);
      await createRestaurantMutation.mutateAsync({restaurantId: restaurant.id, restaurantData: restaurant });
      // mark user as onboarded
      await updateUserMutation.mutateAsync({
        userId: currentUser?.uid || '',
        updates: { isOnboarded: true, restaurantId: restaurant.id },
      });

      if(Platform.OS === 'web') {
        alert('Restaurant created successfully!');
      } else {
      Alert.alert('Success', 'Restaurant created successfully!');
      }

      router.replace('/');
      
      // optionally navigate away or mark user as onboarded
    } catch (e: any) {
      if(Platform.OS === 'web') {
        alert('Failed to create restaurant: ' + (e?.message || e));
      } else {
      Alert.alert('Error', e?.message || 'Failed to create restaurant');
      }
    } finally {
      setLoading(false);
    }
  };

  // open image picker and set imageURL to returned uri (supports newer and older result shapes)
  const pickImage = async () => {
    if(loading) return;
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission required', 'Permission to access media library is required to select an image.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        quality: 0.8,
        allowsEditing: false,
        allowsMultipleSelection: false,
      });
      console.log(result);
      

      // support both old (cancelled/uri) and new (canceled/assets) result shapes
      if (!result.canceled && 'assets' in result && result.assets && result.assets.length > 0) {
        setImageURL(result.assets[0].uri);
      } else if (!result.canceled && 'uri' in result && (result as any).uri) {
        setImageURL((result as any).uri);
      }
    } catch (err) {
      console.warn('Image picker error', err);
      Alert.alert('Error', 'Failed to pick image.');
    }
  };

  return (
    <Container style={{ backgroundColor: '#f3f4f6', padding: 0 }}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 20}
        enabled
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Hotel size={32} color="#104A9c" />
            </View>
            <Text style={styles.title}>Restaurant Setup</Text>
            <Text style={styles.subtitle}>Let's get your restaurant ready to serve</Text>
          </View>

          <View style={styles.card}>
            <View>
              <Text style={styles.label}>Restaurant Name</Text>
              <View 
                style={[
                  styles.inputContainer,
                  focusedInput === 'name' && styles.inputContainerFocused
                ]}
                pointerEvents="box-none"
              >
                <Ionicons 
                  name="restaurant" 
                  size={20} 
                  color={focusedInput === 'name' ? '#3b82f6' : '#104A9c'} 
                  style={styles.icon} 
                />
                <TextInput
                  style={[styles.input, {outline:'none'}]}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter restaurant name"
                  placeholderTextColor="#9ca3af"
                  editable={!loading}
                  returnKeyType="next"
                />
              </View>
            </View>

            <View>
              <Text style={styles.label}>Address</Text>
              <View 
                style={[
                  styles.inputContainer,
                  focusedInput === 'address' && styles.inputContainerFocused
                ]}
                pointerEvents="box-none"
              >
                <Ionicons 
                  name="location" 
                  size={20} 
                  color={focusedInput === 'address' ? '#3b82f6' : '#104A9c'} 
                  style={styles.icon} 
                />
                <TextInput
                  style={[styles.input, styles.multilineInput, {outline:'none'}]}
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Enter restaurant address"
                  placeholderTextColor="#9ca3af"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  editable={!loading}
                  returnKeyType="next"
                />
              </View>
            </View>

            <View>
              <Text style={styles.label}>GST Number</Text>
              <View 
                style={[
                  styles.inputContainer,
                  focusedInput === 'gstNumber' && styles.inputContainerFocused
                ]}
                pointerEvents="box-none"
              >
                <Ionicons 
                  name="document-text" 
                  size={20} 
                  color={focusedInput === 'gstNumber' ? '#3b82f6' : '#104A9c'} 
                  style={styles.icon} 
                />
                <TextInput
                  style={[styles.input, {outline:'none'}]}
                  value={gstNumber}
                  onChangeText={setGstNumber}
                  placeholder="Enter GST number"
                  placeholderTextColor="#9ca3af"
                  editable={!loading}
                  returnKeyType="next"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.halfWidth}>
                <Text style={styles.label}>GST Percentage</Text>
                <View 
                  style={[
                    styles.inputContainer,
                    focusedInput === 'gstPercentage' && styles.inputContainerFocused
                  ]}
                  pointerEvents="box-none"
                >
                  <Ionicons 
                    name="calculator" 
                    size={20} 
                    color={focusedInput === 'gstPercentage' ? '#3b82f6' : '#104A9c'} 
                    style={styles.icon} 
                  />
                  <TextInput
                    style={[styles.input, {outline:'none'}]}
                    value={gstPercentage}
                    onChangeText={setGstPercentage}
                    placeholder="e.g. 18"
                    placeholderTextColor="#9ca3af"
                    keyboardType="numeric"
                    editable={!loading}
                    returnKeyType="next"
                  />
                </View>
              </View>

              <View style={styles.halfWidth}>
                <Text style={styles.label}>Service Charge (%)</Text>
                <View 
                  style={[
                    styles.inputContainer,
                    focusedInput === 'serviceCharge' && styles.inputContainerFocused
                  ]}
                  pointerEvents="box-none"
                >
                  <Ionicons 
                    name="card" 
                    size={20} 
                    color={focusedInput === 'serviceCharge' ? '#3b82f6' : '#104A9c'} 
                    style={styles.icon} 
                  />
                  <TextInput
                    style={[styles.input, {outline:'none'}]}
                    value={serviceCharge}
                    onChangeText={setServiceCharge}
                    placeholder="e.g. 5"
                    placeholderTextColor="#9ca3af"
                    keyboardType="numeric"
                    editable={!loading}
                    returnKeyType="done"
                  />
                </View>
              </View>
            </View>

            <View style={styles.imageSection}>
              <Text style={styles.imageLabel}>Restaurant Image</Text>
              <TouchableOpacity
                style={[styles.imagePickerButton,{borderColor: "#104A9c", backgroundColor: "#104A9c15"}]}
                onPress={pickImage}
                disabled={loading}
                activeOpacity={0.7}
              >
                <Ionicons name="image-outline" size={24} color="#104A9c" />
                <Text style={styles.imagePickerText}>
                  {imageURL ? 'Change Image' : 'Select Image'}
                </Text>
              </TouchableOpacity>

              {imageURL.trim() ? (
                <View style={styles.imagePreviewContainer}>
                  <Image
                    source={{ uri: imageURL.trim() }}
                    style={styles.imagePreview}
                    resizeMode="cover"
                    onError={() => {
                      /* ignore preview load errors; validation will prevent bad URLs on submit */
                    }}
                  />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => setImageURL('')}
                    disabled={loading}
                  >
                    <Ionicons name="close-circle" size={24} color="#dc2626" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="image" size={48} color="#d1d5db" />
                  <Text style={styles.imagePlaceholderText}>No image selected</Text>
                </View>
              )}
            </View>

            {error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={18} color="#dc2626" />
                <Text style={styles.error}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleCreate}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={styles.buttonContent}>
                  <Text style={styles.buttonText}>Create Restaurant</Text>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" style={styles.buttonIcon} />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 40,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 28,
    marginBottom: 8,
    fontWeight: '700',
    textAlign: 'center',
    color: '#111827',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    color: '#6b7280',
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  card: {
    padding: 28,
    borderRadius: 16,
    backgroundColor: '#fff',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    marginTop: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 0,
    marginBottom: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    paddingRight: 12,
  },
  inputContainerFocused: {
    borderColor: '#3b82f6',
    backgroundColor: '#fff',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  icon: {
    marginLeft: 14,
  },
  input: {
    flex: 1,
    height: 52,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  multilineInput: {
    height: 100,
    paddingTop: 16,
    paddingBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  halfWidth: {
    flex: 1,
  },
  imageSection: {
    marginTop: 24,
  },
  imageLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  imagePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#3b82f6',
    borderStyle: 'dashed',
    backgroundColor: '#eff6ff',
    marginBottom: 16,
  },
  imagePickerText: {
    color: '#104A9c',
    fontSize: 16,
    fontWeight: '600',
  },
  imagePreviewContainer: {
    position: 'relative',
    alignItems: 'center',
    marginTop: 8,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 4,
  },
  imagePlaceholder: {
    height: 200,
    borderRadius: 12,
    backgroundColor: '#f9fafb',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  imagePlaceholderText: {
    marginTop: 12,
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '500',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    gap: 8,
  },
  error: {
    flex: 1,
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  button: {
    marginTop: 24,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#104A9c',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  buttonIcon: {
    marginLeft: 4,
  },
});