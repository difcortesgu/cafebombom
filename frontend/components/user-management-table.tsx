import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedCard } from '@/components/ui/themed-card';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import type { ManagedUser } from '@/types/auth';

type UserManagementTableProps = {
  users: ManagedUser[];
  listTitle: string;
  emptyText: string;
  roleLabel: (role: ManagedUser['role']) => string;
  activeStatusLabel: string;
  inactiveStatusLabel: string;
  renderActions: (user: ManagedUser) => ReactNode;
};

export function UserManagementTable({
  users,
  listTitle,
  emptyText,
  roleLabel,
  activeStatusLabel,
  inactiveStatusLabel,
  renderActions,
}: UserManagementTableProps) {
  const palette = useAppColors();

  return (
    <View style={styles.wrap}>
      <ThemedText type="defaultSemiBold">{listTitle}</ThemedText>
      {users.length === 0 ? (
        <ThemedText style={styles.muted}>{emptyText}</ThemedText>
      ) : (
        <ThemedCard style={styles.tableWrap}>
          <View style={[styles.tableHeaderRow, { borderBottomColor: palette.border }]}>
            <ThemedText type="defaultSemiBold" style={styles.nameCol}>{t('userManagement.columns.name')}</ThemedText>
            <ThemedText type="defaultSemiBold" style={styles.roleCol}>{t('userManagement.columns.role')}</ThemedText>
            <ThemedText type="defaultSemiBold" style={styles.statusCol}>{t('userManagement.columns.status')}</ThemedText>
            <ThemedText type="defaultSemiBold" style={styles.actionsCol}>{t('userManagement.columns.actions')}</ThemedText>
          </View>

          {users.map((user, index) => (
            <View
              key={user.id}
              style={[
                styles.tableDataRow,
                { borderBottomColor: palette.border },
                index === users.length - 1 ? styles.tableDataRowLast : null,
              ]}>
              <ThemedText style={[styles.muted, styles.nameCol]}>{user.name}</ThemedText>
              <ThemedText style={[styles.muted, styles.roleCol]}>{roleLabel(user.role)}</ThemedText>
              <ThemedText
                style={[
                  styles.muted,
                  styles.statusCol,
                  { color: user.isActive ? palette.tint : palette.danger },
                ]}>
                {user.isActive ? activeStatusLabel : inactiveStatusLabel}
              </ThemedText>
              <View style={styles.actionsCol}>{renderActions(user)}</View>
            </View>
          ))}
        </ThemedCard>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 4,
    marginTop: 2,
  },
  muted: {
    opacity: 0.9,
    fontSize: 13,
  },
  tableWrap: {
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
    paddingVertical: 0,
    paddingHorizontal: 10,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    minHeight: 38,
    gap: 8,
  },
  tableDataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    minHeight: 52,
    paddingVertical: 8,
    gap: 10,
  },
  tableDataRowLast: {
    borderBottomWidth: 0,
  },
  nameCol: {
    flex: 1.2,
  },
  roleCol: {
    flex: 0.9,
  },
  statusCol: {
    flex: 0.9,
  },
  actionsCol: {
    flex: 1.6,
    alignItems: 'flex-start',
  },
});
