import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React, { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';

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

export function DateInput({ value, onChangeValue, placeholder = t('shared.date.select'), endOfDay = false, style }: DateInputProps) {
  const isWeb = Platform.OS === 'web';
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

  // Fixed: Added proper React types and implemented local timezone splitting
  const handleWebDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateString = e.target.value; // "YYYY-MM-DD"

    if (!dateString) return;

    // Split to avoid UTC timezone parsing bugs
    const [year, month, day] = dateString.split('-');
    const selectedDate = new Date(Number(year), Number(month) - 1, Number(day));

    // Replicate the (event, date) signature of the native picker
    handleDateChange({
      type: 'set',
      nativeEvent: {
        timestamp: 0,
        utcOffset: 0
      }
    }, selectedDate);
  };

  return (
    <View style={style}>
      {isWeb ? (
        /* --- WEB FALLBACK --- */
        <input
          type="date"
          // Fixed: Use your existing helper to convert the Unix timestamp to YYYY-MM-DD
          value={toDisplay(value)}
          onChange={handleWebDateChange}
          // Fixed: Make the whole input clickable to open the calendar
          onClick={(e: React.MouseEvent<HTMLInputElement>) => {
            const target = e.target as HTMLInputElement & { showPicker?: () => void };
            if (typeof target.showPicker === 'function') {
              target.showPicker();
            }
          }}
          style={{
            borderColor: palette.border,
            backgroundColor: palette.inputBackground,
            color: palette.text,
            padding: '10px',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderRadius: '5px',
            boxSizing: 'border-box',
            width: '100%',
            fontFamily: 'inherit',
            fontSize: '16px',
            // Optional: Hide the native calendar icon since the whole input is now clickable
            // cursor: 'pointer' 
          }}
        />
      ) : (
        /* --- NATIVE IMPLEMENTATION --- */
        <>
          <Pressable
            onPress={() => setShowPicker(true)}
            style={[
              styles.field,
              {
                borderColor: palette.border,
                backgroundColor: palette.inputBackground,
              },
            ]}>
            <ThemedText style={!value ? { color: palette.placeholder } : undefined}>
              {value ? toDisplay(value) : placeholder}
            </ThemedText>
          </Pressable>
          {showPicker ? (
            <DateTimePicker
              value={pickerValue}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
            />
          ) : null}
        </>
      )}
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