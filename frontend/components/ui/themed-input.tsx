import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { useAppColors } from '@/hooks/use-theme-color';

type ThemedInputProps = TextInputProps & {
  label?: string;
  error?: string | null;
};

export function ThemedInput({ style, placeholderTextColor, label, error, ...props }: ThemedInputProps) {
  const palette = useAppColors();
  const hasValue = typeof props.value === 'string' ? props.value.length > 0 : false;
  const hasError = !!error;

  const borderColor = hasError
    ? palette.danger
    : hasValue
      ? palette.tint + '80'
      : palette.border;

  return (
    <View style={styles.wrapper}>
      {label ? (
        <Text
          style={[
            styles.label,
            { color: hasError ? palette.danger : hasValue ? palette.tint : palette.mutedText },
          ]}
        >
          {label}
        </Text>
      ) : null}
      <TextInput
        style={[
          styles.input,
          {
            borderColor,
            color: palette.text,
            backgroundColor: palette.inputBackground,
          },
          style,
        ]}
        placeholderTextColor={placeholderTextColor ?? palette.placeholder}
        {...props}
      />
      {hasError ? <Text style={[styles.error, { color: palette.danger }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginLeft: 2,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  error: {
    fontSize: 12,
    marginLeft: 2,
  },
});
