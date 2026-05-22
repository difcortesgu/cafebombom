import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { t } from '@/i18n';
import type { Employee, PayrollEntry } from '@/types/types';

type PayrollListProps = {
    payroll: PayrollEntry[];
    employees: Employee[];
    palette: {
        card: string;
        mutedText: string;
        accent: string;
    };
};

export function PayrollList({ payroll, employees, palette }: PayrollListProps) {
    if (payroll.length === 0) {
        return null;
    }

    return (
        <View style={styles.listSection}>
            <View style={styles.sectionHeader}>
                <IconSymbol name="receipt.fill" size={16} color={palette.mutedText} />
                <ThemedText style={[styles.listSectionTitle, { color: palette.mutedText }]}>Registros del día</ThemedText>
            </View>
            {payroll.map((entry) => (
                <View key={entry.id} style={[styles.listItem, { backgroundColor: palette.card }]}>
                    <View style={[styles.listItemIcon, { backgroundColor: palette.accent + '22' }]}>
                        <IconSymbol name="person.fill" size={20} color={palette.accent} />
                    </View>
                    <View style={styles.listItemInfo}>
                        <ThemedText type="defaultSemiBold">
                            {employees.find((emp) => emp.id === entry.employee_id)?.name
                                ?? `${t('accounts.payroll.employeePrefix')} #${entry.employee_id}`}
                        </ThemedText>
                    </View>
                    <ThemedText style={[styles.listItemAmount, { color: palette.accent }]}>
                        ${Number(entry.amount).toFixed(2)}
                    </ThemedText>
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    listSection: {
        gap: 8,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    listSectionTitle: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        padding: 14,
        gap: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    listItemIcon: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    listItemInfo: {
        flex: 1,
        gap: 2,
    },
    listItemAmount: {
        fontSize: 16,
        fontWeight: '700',
    },
});
