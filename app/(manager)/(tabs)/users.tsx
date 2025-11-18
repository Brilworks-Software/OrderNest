import { StyleSheet, Text, View, ActivityIndicator, FlatList, TouchableOpacity } from 'react-native'
import React, { useState } from 'react'
import { useAuth } from '@/firebase/hooks/useAuth'
import { useUser, useUsersByRestaurant } from '@/firebase/hooks/useUsers'
import { useCreateInviteUser } from '@/firebase/hooks/useInviteUsers'
import type { InviteUser } from '@/firebase/types'
import { SafeAreaView } from 'react-native-safe-area-context'
import InviteUserModal from '@/components/InviteUserModal'
import { MaterialIcons } from '@expo/vector-icons'

export default function Users() {
  const { currentUser, isLoadingUser } = useAuth()
  const userData = useUser(currentUser?.uid || '').data
  const restaurantId = userData?.restaurantId || ''

  const {
    data: users = [],
    isLoading: isLoadingUsers,
    isError: isUsersError,
    error: usersError,
  } = useUsersByRestaurant(restaurantId, currentUser?.uid || '')

  const createInviteMutation = useCreateInviteUser()

  const loading = isLoadingUser || isLoadingUsers

  // Local UI state for the "Add Invite User" modal and form
  const [modalVisible, setModalVisible] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('') // <-- added password state
  const [type, setType] = useState<'staff' | 'chef'>('staff')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Keep locally-added invites so they appear immediately (optimistic UI)
  const [localUsers, setLocalUsers] = useState<InviteUser[]>([])

  // const combinedUsers = [...(users as InviteUser[]), ...localUsers]

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (!restaurantId) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>No restaurantId provided</Text>
      </View>
    )
  }

  if (isUsersError) {
    const message = usersError instanceof Error ? usersError.message : String(usersError)
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{message}</Text>
      </View>
    )
  }

  // Simple validation
  const validate = () => {
    if (!name.trim()) return 'Name is required'
    const e = email.trim()
    if (!e) return 'Email is required'
    // basic email check
    if (!/^\S+@\S+\.\S+$/.test(e)) return 'Email is invalid'
    // password validation: at least 6 chars
    if (password.trim().length < 6) return 'Password must be at least 6 characters'
    return null
  }

  const handleInviteSubmit = async () => {
    const v = validate()
    if (v) {
      setError(v)
      return
    }
    setError(null)
    setSubmitting(true)

    try {
      // Create a simple local invite object. Replace this block with real invite API / Firestore call.
      const newInvite: InviteUser = {
        id: Date.now().toString(),
        name: name.trim(),
        email: email.trim(),
        password: password.trim(), // <-- include password
        type,
        restaurantId,
        createdAt: new Date(), // placeholder; replace with Firestore Timestamp when saving
      }

      // Optimistic UI update
      setLocalUsers(prev => [newInvite, ...prev])

      // Persist invite via backend / Firebase function
      // include password in payload when implementing backend call
      try {
        const serverResult = await createInviteMutation.mutateAsync({
          userId: currentUser?.uid || '',
          userData: {
            name: newInvite.name,
            email: newInvite.email,
            password: newInvite.password,
            type: newInvite.type,
            restaurantId: newInvite.restaurantId,
          },
        })

        // Replace optimistic entry with server-provided record (if any)
        if (serverResult && (serverResult as InviteUser).id) {
          setLocalUsers(prev =>
            prev.map(u => (u.id === newInvite.id ? (serverResult as InviteUser) : u))
          )
        }
      } catch (e) {
        // If backend call fails, keep optimistic UI but surface an error
        console.error('Failed to persist invite to backend', e)
        setError('Failed to send invite. It will remain locally visible.')
      }

      // Reset and close
      setName('')
      setEmail('')
      setPassword('') // <-- reset password
      setType('staff')
      setModalVisible(false)
    } catch (err) {
      console.error('Failed to create invite', err)
      setError('Failed to create invite')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Staff Members</Text>
          <Text style={styles.headerSubtitle}>
            {users.length} {users.length === 1 ? 'member' : 'members'}
          </Text>
        </View>

        <FlatList
          data={users}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="people-outline" size={64} color="#ccc" />
              <Text style={styles.emptyTitle}>No staff members yet</Text>
              <Text style={styles.emptySubtitle}>
                Tap the + button to invite your first team member
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.item}>
              <View style={styles.itemLeft}>
                <View
                  style={[
                    styles.avatarContainer,
                    item.type === 'chef' ? styles.avatarChef : styles.avatarStaff,
                  ]}
                >
                  <MaterialIcons
                    name={item.type === 'chef' ? 'restaurant' : 'person'}
                    size={24}
                    color="#fff"
                  />
                </View>
                <View style={styles.itemInfo}>
                  <Text style={styles.name}>{item.name}</Text>
                  {item.email ? <Text style={styles.email}>{item.email}</Text> : null}
                </View>
              </View>
              <View style={styles.typeBadge}>
                <Text
                  style={[
                    styles.typeText,
                    item.type === 'chef' ? styles.typeTextChef : styles.typeTextStaff,
                  ]}
                >
                  {item.type === 'chef' ? 'Chef' : 'Staff'}
                </Text>
              </View>
            </View>
          )}
        />
      </View>

      {/* Floating add button */}
      <TouchableOpacity
        style={styles.floatingButton}
        activeOpacity={0.8}
        onPress={() => {
          setModalVisible(true)
        }}
        accessibilityLabel="Add user"
      >
        <MaterialIcons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Add Invite User Modal */}
      <InviteUserModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSubmit={handleInviteSubmit}
        name={name}
        setName={setName}
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        type={type}
        setType={setType}
        error={error}
        submitting={submitting}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1d304b',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  item: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarStaff: {
    backgroundColor: '#104A9c',
  },
  avatarChef: {
    backgroundColor: '#ff6b35',
  },
  itemInfo: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#666',
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  typeTextStaff: {
    color: '#104A9c',
  },
  typeTextChef: {
    color: '#ff6b35',
  },
  error: {
    color: '#ff4444',
    fontSize: 14,
    marginTop: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  // Floating button styles
  floatingButton: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#104A9c',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#104A9c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
})