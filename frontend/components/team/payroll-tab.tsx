import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { EntityCard } from '@/components/ui/entity-card';
import { useMeasuredGrid } from '@/hooks/use-measured-grid';
import { t } from '@/i18n';
import type { Employee, PayrollEntry } from '@/types/types';
import { money } from '@/utils/money';

type PayrollTabProps = {
    payroll: PayrollEntry[];
    employees: Employee[];
    gap: number;
    palette: {
        card: string;
        border: string;
        mutedText: string;
        text: string;
        inputBackground: string;
    };
};

export function PayrollTab({ payroll, employees, gap, palette }: PayrollTabProps) {
    const { onLayout, cardWidth } = useMeasuredGrid(gap);

    if (payroll.length === 0) {
        return (
            <View style={[styles.emptyCard, { backgroundColor: palette.inputBackground, borderColor: palette.border }]}>
                <ThemedText style={{ color: palette.mutedText }}>{t('accounts.payroll.recent')}</ThemedText>
            </View>
        );
    }

    return (
        <View style={[styles.grid, { gap }]} onLayout={onLayout}>
            {payroll.map((entry) => {
                const employeeName = employees.find((emp) => emp.id === entry.employee_id)?.name ?? `#${entry.employee_id}`;
                const date = new Date(entry.period_start * 1000).toLocaleDateString();
                return (
                    <EntityCard
                        key={entry.id}
                        width={cardWidth}
                        title={employeeName}
                        style={{ backgroundColor: palette.card, borderColor: palette.border }}
                        info={(
                            <>
                                <ThemedText style={[styles.amount, { color: palette.text }]}>
                                    {money(entry.amount)}
                                </ThemedText>
                                <ThemedText style={[styles.date, { color: palette.mutedText }]}>{date}</ThemedText>
                            </>
                        )}
                    />
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
    amount: {
        fontSize: 15,
        fontWeight: '600',
    },
    date: {
        fontSize: 13,
        textAlign: 'right',
    },
    emptyCard: {
        borderWidth: 1,
        borderRadius: 10,
        padding: 16,
        alignItems: 'center',
    },
});
