import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { useAppColors } from '@/hooks/use-theme-color';

type ThemedInputProps = TextInputProps;

export function ThemedInput({ style, placeholderTextColor, ...props }: ThemedInputProps) {
  const palette = useAppColors();

  return (
    <TextInput
      style={[
        styles.input,
        {
          borderColor: palette.border,
          color: palette.text,
          backgroundColor: palette.inputBackground,
        },
        style,
      ]}
      placeholderTextColor={placeholderTextColor ?? palette.placeholder}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
});
