import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { useAppColors } from '@/hooks/use-theme-color';
import { useSettingsStore } from '@/stores/settings';
import { type NumericMode, formatNumericDisplay, sanitizeNumeric } from '@/utils/format/number';

type ThemedInputProps = TextInputProps & {
  label?: string;
  error?: string | null;
  /**
   * Turns the input into a numeric field: non-numeric characters are rejected as
   * the user types and `onChangeText` always receives the raw numeric string.
   * `currency`/`percent` additionally show a formatted display value.
   */
  numeric?: NumericMode;
};

const KEYBOARD_BY_MODE: Record<NumericMode, TextInputProps['keyboardType']> = {
  integer: 'number-pad',
  decimal: 'decimal-pad',
  currency: 'decimal-pad',
  percent: 'decimal-pad',
  ipv4: 'number-pad',
};

export function ThemedInput({
  style,
  placeholderTextColor,
  label,
  error,
  numeric,
  value,
  onChangeText,
  keyboardType,
  ...props
}: ThemedInputProps) {
  const palette = useAppColors();
  const currency = useSettingsStore((s) => s.currency);

  const rawValue = typeof value === 'string' ? value : '';
  const displayValue = numeric ? formatNumericDisplay(rawValue, numeric, currency) : value;

  const handleChangeText = numeric
    ? (text: string) => onChangeText?.(sanitizeNumeric(text, numeric, currency))
    : onChangeText;

  const hasValue = typeof displayValue === 'string' ? displayValue.length > 0 : false;
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
        value={displayValue}
        onChangeText={handleChangeText}
        keyboardType={keyboardType ?? (numeric ? KEYBOARD_BY_MODE[numeric] : undefined)}
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
