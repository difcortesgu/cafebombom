import { Pressable, StyleSheet, type PressableProps, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useAppColors } from '@/hooks/use-theme-color';

type ThemedButtonVariant = 'primary' | 'secondary';

type ThemedButtonProps = PressableProps & {
  label?: string;
  variant?: ThemedButtonVariant;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
};

export function ThemedButton({
  label,
  children,
  variant = 'primary',
  style,
  labelStyle,
  ...props
}: ThemedButtonProps) {
  const palette = useAppColors();
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      style={[
        styles.base,
        isPrimary
          ? { backgroundColor: palette.tint }
          : { borderColor: palette.border, borderWidth: 1, backgroundColor: 'transparent' },
        style,
      ]}
      {...props}>
      {label ? (
        <ThemedText
          style={[
            styles.label,
            isPrimary ? { color: palette.card } : undefined,
            labelStyle,
          ]}>
          {label}
        </ThemedText>
      ) : (
        children
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: '700',
  },
});
