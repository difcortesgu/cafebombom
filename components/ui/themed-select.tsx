import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedInput } from '@/components/ui/themed-input';
import { useAppColors } from '@/hooks/use-theme-color';

type ThemedSelectProps = {
  label?: string;
  value: string;
  onValueChange: (value: string) => void;
  items: { label: string; value: string }[];
  placeholder?: string;
};

export function ThemedSelect({ label, value, onValueChange, items, placeholder }: ThemedSelectProps) {
  const palette = useAppColors();
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState('');

  const selectedItem = items.find((item) => item.value === value);
  const filteredItems = items.filter((item) => item.label.toLowerCase().includes(searchText.toLowerCase()));

  return (
    <>
      {label ? <ThemedText style={styles.label}>{label}</ThemedText> : null}
      <Pressable
        style={[styles.button, { borderColor: palette.border, backgroundColor: palette.inputBackground }]}
        onPress={() => setIsOpen(true)}>
        <ThemedText style={[styles.buttonText, selectedItem ? {} : { color: palette.placeholder }]}>
          {selectedItem?.label || placeholder || 'Select...'}
        </ThemedText>
      </Pressable>

      <Modal visible={isOpen} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setIsOpen(false)}>
          <View style={[styles.modal, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <ThemedText type="subtitle" style={styles.modalTitle}>
              Select an ingredient
            </ThemedText>

            <ThemedInput
              placeholder="Search..."
              value={searchText}
              onChangeText={setSearchText}
              style={styles.searchInput}
            />

            <ScrollView style={styles.itemList} nestedScrollEnabled>
              {filteredItems.map((item) => (
                <Pressable
                  key={item.value}
                  style={[
                    styles.modalItem,
                    { borderBottomColor: palette.border },
                    selectedItem?.value === item.value ? { backgroundColor: palette.tint } : {},
                  ]}
                  onPress={() => {
                    onValueChange(item.value);
                    setIsOpen(false);
                    setSearchText('');
                  }}>
                  <ThemedText
                    style={selectedItem?.value === item.value ? { color: palette.card, fontWeight: 'bold' } : {}}>
                    {item.label}
                  </ThemedText>
                </Pressable>
              ))}
            </ScrollView>

            <ThemedButton
              label="Close"
              style={styles.closeButton}
              onPress={() => {
                setIsOpen(false);
                setSearchText('');
              }}
            />
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
    marginBottom: 2,
  },
  button: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginVertical: 0,
  },
  buttonText: {
    fontSize: 14,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: '85%',
    maxHeight: '65%',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  modalTitle: {
    marginBottom: 8,
    fontSize: 14,
  },
  searchInput: {
    marginBottom: 8,
  },
  itemList: {
    maxHeight: '60%',
    marginBottom: 8,
  },
  modalItem: {
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: '100%',
  },
});

