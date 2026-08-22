import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useSelector } from 'react-redux';

export default function ScheduleScreen() {
  const { schedule } = useSelector((state) => state.schedule);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Lịch Học</Text>
      {schedule.length === 0 ? (
        <Text style={styles.emptyText}>Chưa có lịch học</Text>
      ) : (
        <FlatList
          data={schedule}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.courseName}>{item.courseName}</Text>
              <Text style={styles.time}>{item.startTime} - {item.endTime}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5', padding: 15 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  card: { backgroundColor: '#FFF', padding: 15, borderRadius: 8, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: '#B91D3A' },
  courseName: { fontSize: 16, fontWeight: 'bold' },
  time: { fontSize: 14, color: '#666', marginTop: 5 },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#999' },
});
