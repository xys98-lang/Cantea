import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../../store/slices/authSlice';

export default function ProfileScreen() {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.name}>{user?.firstName || 'User'} {user?.lastName || ''}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={() => dispatch(logout())}>
        <Text style={styles.logoutText}>Đăng Xuất</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF', padding: 20 },
  header: { alignItems: 'center', marginTop: 40 },
  name: { fontSize: 20, fontWeight: 'bold', marginBottom: 5 },
  email: { fontSize: 14, color: '#666' },
  logoutButton: { backgroundColor: '#B91D3A', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 40 },
  logoutText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
