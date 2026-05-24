import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View, type PressableProps, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useAppColors } from '@/hooks/use-theme-color';

type ThemedButtonVariant = 'primary' | 'secondary';
type ThemedButtonTone = 'danger' | 'warning' | 'success';

type ThemedButtonProps = PressableProps & {
  label?: string;
  icon?: string;
  iconColor?: string;
  variant?: ThemedButtonVariant;
  tone?: ThemedButtonTone;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
};

export function ThemedButton({
  label,
  icon,
  iconColor,
  children,
  variant = 'primary',
  tone,
  style,
  labelStyle,
  ...props
}: ThemedButtonProps) {
  const palette = useAppColors();
  const isPrimary = variant === 'primary';
  const toneColor = tone ? palette[tone] : null;
  const defaultTextColor = isPrimary ? palette.card : palette.text;
  const textColor = toneColor ?? defaultTextColor;
  const resolvedIconColor = iconColor ?? textColor;
  const isIconOnly = icon && !label;

  return (
    <Pressable
      style={[
        styles.base,
        isPrimary
          ? { backgroundColor: palette.tint }
          : toneColor
            ? { backgroundColor: `${toneColor}18`, borderWidth: 1, borderColor: toneColor }
            : { backgroundColor: palette.inputBackground, borderWidth: 1, borderColor: palette.border },
        isIconOnly && styles.iconOnlyBase,
        style,
      ]}
      {...props}>
      {icon ? (
        <View style={styles.iconContainer}>
          <Ionicons name={icon as any} size={18} color={resolvedIconColor} />
          {label && (
            <ThemedText
              style={[
                styles.label,
                { marginLeft: 5, color: textColor },
                labelStyle,
              ]}>
              {label}
            </ThemedText>
          )}
        </View>
      ) : label ? (
        <ThemedText
          style={[
            styles.label,
            isPrimary ? { color: palette.card } : toneColor ? { color: toneColor } : undefined,
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
  iconOnlyBase: {
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  iconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
});
