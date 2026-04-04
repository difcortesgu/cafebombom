import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useAppColors } from '@/hooks/use-theme-color';

type DateInputProps = {
  value: number | null;
  onChangeValue: (value: number | null) => void;
  placeholder?: string;
  endOfDay?: boolean;
  style?: StyleProp<ViewStyle>;
};

const toDisplay = (unix: number | null): string => {
  if (!unix) return '';
  const date = new Date(unix * 1000);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function DateInput({ value, onChangeValue, placeholder = 'Select date', endOfDay = false, style }: DateInputProps) {
  const palette = useAppColors();
  const [showPicker, setShowPicker] = useState(false);

  const pickerValue = useMemo(() => {
    if (value) {
      return new Date(value * 1000);
    }
    return new Date();
  }, [value]);

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (event.type === 'dismissed') {
      setShowPicker(false);
      return;
    }

    if (!selectedDate) {
      setShowPicker(false);
      return;
    }

    const normalized = new Date(selectedDate);
    if (endOfDay) {
      normalized.setHours(23, 59, 59, 0);
    } else {
      normalized.setHours(0, 0, 0, 0);
    }
    onChangeValue(Math.floor(normalized.getTime() / 1000));
    setShowPicker(false);
  };

  return (
    <View style={style}>
      <Pressable
        onPress={() => setShowPicker(true)}
        style={[
          styles.field,
          {
            borderColor: palette.border,
            backgroundColor: palette.inputBackground,
          },
        ]}>
        <ThemedText style={!value ? { color: palette.placeholder } : undefined}>{value ? toDisplay(value) : placeholder}</ThemedText>
      </Pressable>
      {showPicker ? (
        <DateTimePicker
          value={pickerValue}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    minHeight: 42,
    justifyContent: 'center',
  },
});