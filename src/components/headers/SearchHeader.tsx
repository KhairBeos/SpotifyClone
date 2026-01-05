import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { Ionicons } from '@expo/vector-icons';

export function SearchHeader() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Search</Text>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color="#A7A7A7" />
        <Text style={styles.placeholder}>What do you want to listen to?</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, backgroundColor: colors.background },
  title: { color: colors.text, fontSize: 28, fontWeight: '800', marginBottom: 12 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F1F1F',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 42,
  },
  placeholder: { color: '#A7A7A7', marginLeft: 8 },
});
