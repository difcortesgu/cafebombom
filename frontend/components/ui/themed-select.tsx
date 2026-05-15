import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';

import { ThemedText } from '@/components/themed-text';
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
  const { width: screenWidth } = useWindowDimensions();
  const isWide = screenWidth >= 768;
  const buttonRef = useRef<View>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [showAddNew, setShowAddNew] = useState(false);
  const [addNewText, setAddNewText] = useState('');
  const [anchor, setAnchor] = useState<{ top: number; left: number; minWidth: number } | null>(null);

  const selectedItem = items.find((item) => item.value === value);
  const filteredItems = items.filter((item) => item.label.toLowerCase().includes(searchText.toLowerCase()));

  function handleOpen() {
    if (isWide && buttonRef.current) {
      buttonRef.current.measure((_fx, _fy, width, height, px, py) => {
        const left = Math.min(px, screenWidth - Math.max(width, 200) - 8);
        setAnchor({ top: py + height + 2, left, minWidth: Math.max(width, 200) });
        setIsOpen(true);
      });
    } else {
      setAnchor(null);
      setIsOpen(true);
    }
  }

  function handleClose() {
    setIsOpen(false);
    setSearchText('');
    setShowAddNew(false);
    setAddNewText('');
  }

  const dropdownContent = (
    <View style={[styles.modal, { backgroundColor: palette.card, borderColor: palette.border }, anchor ? { position: 'absolute', top: anchor.top, left: anchor.left, minWidth: anchor.minWidth } : {}]}>
      {!anchor ? (
        <View style={styles.modalHeader}>
          <ThemedText type="subtitle" style={styles.modalTitle}>
            {modalTitle || label || t('shared.select.title')}
          </ThemedText>
          <Pressable onPress={handleClose} hitSlop={10} style={styles.closeIcon}>
            <MaterialIcons name="close" size={18} color={palette.mutedText} />
          </Pressable>
        </View>
      ) : null}

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
              { borderBottomColor: palette.border + '40' },
              selectedItem?.value === item.value ? { backgroundColor: palette.tint + '18', borderLeftWidth: 2, borderLeftColor: palette.tint } : {},
            ]}
            onPress={() => {
              onValueChange(item.value);
              handleClose();
            }}>
            <View style={styles.modalItemRow}>
              <ThemedText
                style={selectedItem?.value === item.value ? { color: palette.tint, fontWeight: '600' } : {}}>
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
            style={[styles.addNewButton, { borderTopColor: palette.border + '40' }]}
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
            <View style={[styles.addNewRow, { borderTopColor: palette.border + '40' }]}>
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
                  await onAddNew?.(trimmed);
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
              style={[styles.addNewButton, { borderTopColor: palette.border + '40' }]}
              onPress={() => setShowAddNew(true)}>
              <MaterialIcons name="add" size={18} color={palette.tint} />
              <ThemedText style={[styles.addNewLabel, { color: palette.tint }]}>
                {addNewLabel || t('shared.select.addNew')}
              </ThemedText>
            </Pressable>
          )
        )
      ) : null}
    </View>
  );

  return (
    <>
      {label ? <ThemedText style={styles.label}>{label}</ThemedText> : null}
      <Pressable
        ref={buttonRef}
        style={[styles.button, { borderColor: palette.border, backgroundColor: palette.inputBackground }]}
        onPress={handleOpen}>
        <ThemedText style={[styles.buttonText, selectedItem ? {} : { color: palette.placeholder }]}>
          {selectedItem?.label || placeholder || t('shared.select.placeholder')}
        </ThemedText>
      </Pressable>

      <Modal visible={isOpen} transparent animationType="fade">
        <View style={anchor ? styles.overlayTransparent : styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
          {dropdownContent}
        </View>
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
  overlayTransparent: {
    flex: 1,
  },
  modal: {
    minWidth: 200,
    maxWidth: '80%',
    maxHeight: '60%',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 13,
    flex: 1,
  },
  closeIcon: {
    padding: 2,
  },
  searchInput: {
    marginBottom: 4,
  },
  itemList: {
    maxHeight: '60%',
    marginBottom: 0,
  },
  modalItem: {
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
    paddingVertical: 7,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginBottom: 0,
  },
  addNewLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  addNewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 7,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginBottom: 0,
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

});

