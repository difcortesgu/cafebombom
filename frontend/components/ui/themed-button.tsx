import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View, type PressableProps, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useAppColors } from '@/hooks/use-theme-color';

type ThemedButtonVariant = 'primary' | 'secondary';

type ThemedButtonProps = PressableProps & {
  label?: string;
  icon?: string;
  variant?: ThemedButtonVariant;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
};

export function ThemedButton({
  label,
  icon,
  children,
  variant = 'primary',
  style,
  labelStyle,
  ...props
}: ThemedButtonProps) {
  const palette = useAppColors();
  const isPrimary = variant === 'primary';
  const textColor = isPrimary ? palette.card : palette.text;
  const isIconOnly = icon && !label;

  return (
    <Pressable
      style={[
        styles.base,
        isPrimary
          ? { backgroundColor: palette.tint }
          : { backgroundColor: palette.inputBackground },
        isIconOnly && styles.iconOnlyBase,
        style,
      ]}
      {...props}>
      {icon ? (
        <View style={styles.iconContainer}>
          <Ionicons name={icon as any} size={20} color={textColor} />
          {label && (
            <ThemedText
              style={[
                styles.label,
                { marginLeft: 6 },
                isPrimary ? { color: palette.card } : undefined,
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
    fontWeight: '700',
  },
});
