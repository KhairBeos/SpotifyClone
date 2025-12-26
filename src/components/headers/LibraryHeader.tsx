import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../../theme/colors';
import { Ionicons } from '@expo/vector-icons';

export function LibraryHeader() {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.avatar} />
        <Text style={styles.title}>Your Library</Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity>
          <Ionicons name="search" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, backgroundColor: colors.background },
  row: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.surface, marginRight: 8 },
  title: { color: colors.text, fontSize: 22, fontWeight: '800' },
});
