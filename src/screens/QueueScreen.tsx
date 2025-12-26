import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';
import { usePlayerStore } from '../store/player';
import { ActionSheet, ActionItem } from '../components/ActionSheet';
import * as Haptics from 'expo-haptics';

export default function QueueScreen() {
  const { queue, index, playAt, removeAt, enqueueNext } = usePlayerStore();
  const [sheet, setSheet] = useState<{ visible: boolean; row: number | null }>({ visible: false, row: null });

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={queue}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={<Text style={styles.header}>Queue</Text>}
      renderItem={({ item, index: i }) => (
        <TouchableOpacity style={[styles.row, i === index && styles.active]} onPress={() => playAt(i)} onLongPress={() => { Haptics.selectionAsync(); setSheet({ visible: true, row: i }); }}>
          <View style={styles.thumb} />
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.sub} numberOfLines={1}>{item.artist}</Text>
          </View>
          {i === index && <Text style={styles.now}>Now</Text>}
        </TouchableOpacity>
      )}
      ListEmptyComponent={<Text style={styles.empty}>Queue is empty</Text>}
    />
    <ActionSheet
      visible={sheet.visible}
      onClose={() => setSheet({ visible: false, row: null })}
      actions={([
        { key: 'playnext', content: <Text style={{ color: colors.text }}>Play next</Text>, onPress: () => { const i = sheet.row ?? -1; if (i >= 0) enqueueNext(queue[i]); } },
        { key: 'remove', content: <Text style={{ color: colors.text }}>Remove from queue</Text>, onPress: () => { const i = sheet.row ?? -1; if (i >= 0) removeAt(i); } },
      ]) as ActionItem[]}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16 },
  header: { color: colors.text, fontSize: 24, fontWeight: '800', marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  active: { backgroundColor: '#111' },
  thumb: { width: 48, height: 48, backgroundColor: colors.surface, borderRadius: 4, marginRight: 12 },
  title: { color: colors.text, fontWeight: '600' },
  sub: { color: '#A7A7A7', marginTop: 2, fontSize: 12 },
  now: { color: colors.primary, marginLeft: 8 },
  empty: { color: '#A7A7A7', textAlign: 'center', marginTop: 40 },
});
