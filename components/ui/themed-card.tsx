import { StyleSheet, type ViewProps } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { useAppColors } from '@/hooks/use-theme-color';

type ThemedCardProps = ViewProps;

export function ThemedCard({ style, ...props }: ThemedCardProps) {
  const palette = useAppColors();

  return (
    <ThemedView
      style={[
        styles.card,
        {
          backgroundColor: palette.card,
          borderColor: palette.border,
        },
        style,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
});
