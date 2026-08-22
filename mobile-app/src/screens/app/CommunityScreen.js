import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useSelector } from 'react-redux';

export default function CommunityScreen() {
  const { posts } = useSelector((state) => state.community);

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.newPostButton}>
        <Text style={styles.newPostText}>+ Tạo Bài Viết</Text>
      </TouchableOpacity>
      
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.postCard}>
            <Text style={styles.author}>{item.author}</Text>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.content} numberOfLines={3}>{item.content}</Text>
            <View style={styles.stats}>
              <Text style={styles.stat}>❤️ {item.likeCount}</Text>
              <Text style={styles.stat}>💬 {item.commentCount}</Text>
            </View>
          </View>
        )}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  newPostButton: { backgroundColor: '#B91D3A', padding: 15, margin: 15, borderRadius: 8 },
  newPostText: { color: '#FFF', fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
  listContent: { paddingHorizontal: 15 },
  postCard: { backgroundColor: '#FFF', padding: 15, marginBottom: 10, borderRadius: 8 },
  author: { fontSize: 12, color: '#999', marginBottom: 5 },
  title: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  content: { fontSize: 14, color: '#333', marginBottom: 10 },
  stats: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { fontSize: 12, color: '#666' },
});
