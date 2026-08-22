import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useSelector } from 'react-redux';

export default function GradesScreen() {
  const { grades, semesterGPA } = useSelector((state) => state.grades);

  const getGradeColor = (score) => {
    if (score >= 8.5) return '#4CAF50';
    if (score >= 7.0) return '#2196F3';
    if (score >= 5.5) return '#FF9800';
    return '#F44336';
  };

  return (
    <View style={styles.container}>
      {semesterGPA && (
        <View style={styles.gpaCard}>
          <Text style={styles.gpaLabel}>GPA Kỳ Này</Text>
          <Text style={styles.gpaValue}>{semesterGPA.toFixed(2)}</Text>
        </View>
      )}
      <FlatList
        data={grades}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.gradeCard}>
            <Text style={styles.courseName}>{item.courseName}</Text>
            <Text style={[styles.grade, { color: getGradeColor(item.weightedAverage) }]}>
              {item.weightedAverage?.toFixed(1) || 'N/A'}
            </Text>
          </View>
        )}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  gpaCard: { backgroundColor: '#B91D3A', padding: 20, alignItems: 'center' },
  gpaLabel: { fontSize: 14, color: '#FFF', opacity: 0.8 },
  gpaValue: { fontSize: 40, fontWeight: 'bold', color: '#FFF' },
  listContent: { paddingHorizontal: 15, paddingVertical: 15 },
  gradeCard: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#FFF', padding: 15, marginBottom: 10, borderRadius: 8 },
  courseName: { fontSize: 16, fontWeight: 'bold', flex: 1 },
  grade: { fontSize: 18, fontWeight: 'bold' },
});
