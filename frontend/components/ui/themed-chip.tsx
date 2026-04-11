import { Pressable, StyleSheet, type PressableProps, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useAppColors } from '@/hooks/use-theme-color';

type ThemedChipTone = 'tint' | 'accent';

type ThemedChipProps = PressableProps & {
  label: string;
  active?: boolean;
  tone?: ThemedChipTone;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
};

export function ThemedChip({
  label,
  active = false,
  tone = 'tint',
  style,
  labelStyle,
  ...props
}: ThemedChipProps) {
  const palette = useAppColors();

  const activeStyle =
    tone === 'accent'
      ? { backgroundColor: palette.accent, borderColor: palette.tint }
      : { backgroundColor: palette.tint, borderColor: palette.tint };

  const activeTextColor = tone === 'accent' ? palette.background : palette.card;

  return (
    <Pressable
      style={[
        styles.base,
        { borderColor: palette.border },
        active ? activeStyle : null,
        style,
      ]}
      {...props}>
      <ThemedText style={[styles.label, active ? { color: activeTextColor } : null, labelStyle]}>{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: '700',
    textTransform: 'capitalize',
  },
});
