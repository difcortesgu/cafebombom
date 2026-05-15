import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { useAppColors } from '@/hooks/use-theme-color';

type ThemedInputProps = TextInputProps & {
  label?: string;
};

export function ThemedInput({ style, placeholderTextColor, label, ...props }: ThemedInputProps) {
  const palette = useAppColors();
  const hasValue = typeof props.value === 'string' ? props.value.length > 0 : false;

  return (
    <View style={styles.wrapper}>
      {label ? (
        <Text style={[styles.label, { color: hasValue ? palette.tint : palette.mutedText }]}>
          {label}
        </Text>
      ) : null}
      <TextInput
        style={[
          styles.input,
          {
            borderColor: hasValue ? palette.tint + '80' : palette.border,
            color: palette.text,
            backgroundColor: palette.inputBackground,
          },
          style,
        ]}
        placeholderTextColor={placeholderTextColor ?? palette.placeholder}
        {...props}
      />
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
});
