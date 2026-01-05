import React, { useEffect } from 'react';
import { Modal, View, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { colors } from '../theme/colors';

export type ActionItem = { key: string; content: React.ReactNode; onPress?: () => void };

type Props = {
  visible: boolean;
  onClose: () => void;
  actions: ActionItem[];
};

export function ActionSheet({ visible, onClose, actions }: Props) {
  const translateY = useSharedValue(300);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withTiming(0, { duration: 200 });
      opacity.value = withTiming(1, { duration: 150 });
    } else {
      translateY.value = withTiming(300, { duration: 200 });
      opacity.value = withTiming(0, { duration: 150 });
    }
  }, [visible]);

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const dimStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, dimStyle]}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>
        <Animated.View style={[styles.sheet, sheetStyle]}>
          {actions.map((a) => (
            <TouchableWithoutFeedback
              key={a.key}
              onPress={() => {
                a.onPress?.();
                onClose();
              }}
            >
              <View style={styles.row}>{a.content}</View>
            </TouchableWithoutFeedback>
          ))}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, paddingBottom: 24, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
