import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { useSelector } from 'react-redux';

export default function MarketplaceScreen() {
  const { listings } = useSelector((state) => state.marketplace);

  return (
    <View style={styles.container}>
      <TextInput style={styles.searchInput} placeholder="Tìm sách..." />
      <TouchableOpacity style={styles.newListingButton}>
        <Text style={styles.newListingText}>+ Đăng Sách</Text>
      </TouchableOpacity>
      
      <FlatList
        data={listings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.listingCard}>
            <Text style={styles.bookTitle}>{item.title}</Text>
            <Text style={styles.author}>{item.author}</Text>
            <Text style={styles.price}>{item.price} VND</Text>
            <Text style={styles.condition}>Điều kiện: {item.condition}</Text>
          </View>
        )}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5', paddingHorizontal: 15 },
  searchInput: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 12, marginVertical: 15 },
  newListingButton: { backgroundColor: '#B91D3A', padding: 15, borderRadius: 8, marginBottom: 15 },
  newListingText: { color: '#FFF', fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
  listContent: { paddingVertical: 10 },
  listingCard: { backgroundColor: '#FFF', padding: 15, marginBottom: 10, borderRadius: 8 },
  bookTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
  author: { fontSize: 14, color: '#666', marginBottom: 8 },
  price: { fontSize: 16, fontWeight: 'bold', color: '#B91D3A', marginBottom: 5 },
  condition: { fontSize: 12, color: '#999' },
});
