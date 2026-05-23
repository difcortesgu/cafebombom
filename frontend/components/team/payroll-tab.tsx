import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { t } from '@/i18n';
import type { Employee, PayrollEntry } from '@/types/types';

type PayrollTabProps = {
    payroll: PayrollEntry[];
    employees: Employee[];
    cardWidth: number;
    gap: number;
    palette: {
        card: string;
        border: string;
        mutedText: string;
        inputBackground: string;
    };
};

export function PayrollTab({ payroll, employees, cardWidth, gap, palette }: PayrollTabProps) {
    if (payroll.length === 0) {
        return (
            <View style={[styles.emptyCard, { backgroundColor: palette.inputBackground, borderColor: palette.border }]}>
                <ThemedText style={{ color: palette.mutedText }}>{t('accounts.payroll.recent')}</ThemedText>
            </View>
        );
    }

    return (
        <View style={[styles.grid, { gap }]}>
            {payroll.map((entry) => {
                const employeeName = employees.find((emp) => emp.id === entry.employee_id)?.name ?? `#${entry.employee_id}`;
                const date = new Date(entry.period_start * 1000).toLocaleDateString();
                return (
                    <View key={entry.id} style={[styles.card, { width: cardWidth, backgroundColor: palette.card, borderColor: palette.border }]}>
                        <ThemedText type="defaultSemiBold" numberOfLines={1}>{employeeName}</ThemedText>
                        <ThemedText style={[styles.amount, { color: palette.mutedText }]}>
                            ${Number(entry.amount).toFixed(2)}
                        </ThemedText>
                        <ThemedText style={[styles.date, { color: palette.mutedText }]}>{date}</ThemedText>
                    </View>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    card: {
        borderWidth: 1,
        borderRadius: 10,
        padding: 12,
        gap: 4,
    },
    amount: {
        fontSize: 15,
        fontWeight: '600',
    },
    date: {
        fontSize: 13,
    },
    emptyCard: {
        borderWidth: 1,
        borderRadius: 10,
        padding: 16,
        alignItems: 'center',
    },
});
