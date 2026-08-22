import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function ProfileSetupScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hoàn Thành Hồ Sơ</Text>
      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Tiếp Tục</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  button: { backgroundColor: '#B91D3A', padding: 15, borderRadius: 8 },
  buttonText: { color: '#FFF', fontWeight: 'bold' },
});
