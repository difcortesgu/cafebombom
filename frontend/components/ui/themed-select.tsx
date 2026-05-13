import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedInput } from '@/components/ui/themed-input';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';

type ThemedSelectProps = {
  label?: string;
  value: string;
  onValueChange: (value: string) => void;
  items: { label: string; value: string }[];
  placeholder?: string;
  modalTitle?: string;
  canItemAction?: (item: { label: string; value: string }) => boolean;
  onItemAction?: (item: { label: string; value: string }) => void | Promise<void>;
  onAddNew?: (name: string) => Promise<void> | void;
  addNewPlaceholder?: string;
  onAddNewPress?: () => Promise<void> | void;
  addNewLabel?: string;
};

export function ThemedSelect({
  label,
  value,
  onValueChange,
  items,
  placeholder,
  modalTitle,
  canItemAction,
  onItemAction,
  onAddNew,
  addNewPlaceholder,
  onAddNewPress,
  addNewLabel,
}: ThemedSelectProps) {
  const palette = useAppColors();
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [showAddNew, setShowAddNew] = useState(false);
  const [addNewText, setAddNewText] = useState('');

  const selectedItem = items.find((item) => item.value === value);
  const filteredItems = items.filter((item) => item.label.toLowerCase().includes(searchText.toLowerCase()));

  function handleClose() {
    setIsOpen(false);
    setSearchText('');
    setShowAddNew(false);
    setAddNewText('');
  }

  return (
    <>
      {label ? <ThemedText style={styles.label}>{label}</ThemedText> : null}
      <Pressable
        style={[styles.button, { borderColor: palette.border, backgroundColor: palette.inputBackground }]}
        onPress={() => setIsOpen(true)}>
        <ThemedText style={[styles.buttonText, selectedItem ? {} : { color: palette.placeholder }]}>
          {selectedItem?.label || placeholder || t('shared.select.placeholder')}
        </ThemedText>
      </Pressable>

      <Modal visible={isOpen} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={handleClose}>
          <View
            style={[styles.modal, { backgroundColor: palette.card, borderColor: palette.border }]}
            onStartShouldSetResponder={() => true}
            onTouchEnd={(e) => e.stopPropagation()}>
            <ThemedText type="subtitle" style={styles.modalTitle}>
              {modalTitle || label || t('shared.select.title')}
            </ThemedText>

            <ThemedInput
              placeholder={t('shared.search.placeholder')}
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
                    handleClose();
                  }}>
                  <View style={styles.modalItemRow}>
                    <ThemedText
                      style={selectedItem?.value === item.value ? { color: palette.card, fontWeight: 'bold' } : {}}>
                      {item.label}
                    </ThemedText>
                    {onItemAction && (canItemAction?.(item) ?? true) ? (
                      <Pressable
                        onPress={async (e) => {
                          e.stopPropagation();
                          await onItemAction(item);
                        }}
                        hitSlop={8}>
                        <MaterialIcons name="delete" size={20} color="#ef4444" />
                      </Pressable>
                    ) : null}
                  </View>
                </Pressable>
              ))}
            </ScrollView>

            {onAddNew || onAddNewPress ? (
              onAddNewPress ? (
                <Pressable
                  style={[styles.addNewButton, { borderTopColor: palette.border }]}
                  onPress={async () => {
                    await onAddNewPress();
                    handleClose();
                  }}>
                  <MaterialIcons name="add" size={18} color={palette.tint} />
                  <ThemedText style={[styles.addNewLabel, { color: palette.tint }]}>
                    {addNewLabel || t('shared.select.addNew')}
                  </ThemedText>
                </Pressable>
              ) : (
              showAddNew ? (
                <View style={[styles.addNewRow, { borderTopColor: palette.border }]}>
                  <ThemedInput
                    placeholder={addNewPlaceholder || t('shared.select.addNewPlaceholder')}
                    value={addNewText}
                    onChangeText={setAddNewText}
                    style={styles.addNewInput}
                    autoFocus
                  />
                  <Pressable
                    style={[styles.addNewConfirm, { backgroundColor: palette.tint }]}
                    onPress={async () => {
                      const trimmed = addNewText.trim();
                      if (!trimmed) return;
                      await onAddNew(trimmed);
                      setAddNewText('');
                      setShowAddNew(false);
                    }}>
                    <MaterialIcons name="check" size={20} color="#fff" />
                  </Pressable>
                  <Pressable
                    style={[styles.addNewCancel, { backgroundColor: palette.border }]}
                    onPress={() => {
                      setShowAddNew(false);
                      setAddNewText('');
                    }}>
                    <MaterialIcons name="close" size={20} color={palette.text} />
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  style={[styles.addNewButton, { borderTopColor: palette.border }]}
                  onPress={() => setShowAddNew(true)}>
                  <MaterialIcons name="add" size={18} color={palette.tint} />
                  <ThemedText style={[styles.addNewLabel, { color: palette.tint }]}>
                    {addNewLabel || t('shared.select.addNew')}
                  </ThemedText>
                </Pressable>
              )
              )
            ) : null}

            <ThemedButton
              label={t('shared.close')}
              style={styles.closeButton}
              onPress={handleClose}
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
  modalItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  addNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    borderTopWidth: 1,
    marginBottom: 8,
  },
  addNewLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  addNewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    marginBottom: 8,
  },
  addNewInput: {
    flex: 1,
  },
  addNewConfirm: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addNewCancel: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    width: '100%',
  },
});

