import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { EntityCard } from '@/components/ui/entity-card';
import { useMeasuredGrid } from '@/hooks/use-measured-grid';
import { t } from '@/i18n';
import type { Employee } from '@/types/types';
import { money } from '@/utils/money';

type EmployeesTabProps = {
    employees: Employee[];
    gap: number;
    palette: {
        card: string;
        border: string;
        mutedText: string;
        text: string;
        inputBackground: string;
        danger: string;
        success: string;
    };
    onEdit: (employee: Employee) => void;
    onDelete: (id: string) => void;
    onToggleActive: (id: string, isActive: boolean) => void;
};

export function EmployeesTab({ employees, gap, palette, onEdit, onDelete, onToggleActive }: EmployeesTabProps) {
    const { onLayout, cardWidth } = useMeasuredGrid(gap);

    if (employees.length === 0) {
        return (
            <View style={[styles.emptyCard, { backgroundColor: palette.inputBackground, borderColor: palette.border }]}>
                <ThemedText style={{ color: palette.mutedText }}>{t('accounts.employees.roster')}</ThemedText>
            </View>
        );
    }

    return (
        <View style={[styles.grid, { gap }]} onLayout={onLayout}>
            {employees.map((emp) => (
                <EntityCard
                    key={emp.id}
                    width={cardWidth}
                    title={emp.name}
                    style={{ backgroundColor: palette.card, borderColor: palette.border, opacity: emp.is_active ? 1 : 0.6 }}
                    info={(
                        <>
                            <ThemedText style={[styles.rate, { color: palette.text }]}>
                                {money(emp.rate)}
                            </ThemedText>
                            <ThemedText style={[styles.muted, { color: palette.mutedText }]}>
                                {emp.salary_type === 'hourly' ? t('accounts.employees.hourly') : t('accounts.employees.monthly')}
                            </ThemedText>
                        </>
                    )}
                    actions={[
                        {
                            icon: 'create-outline',
                            label: t('setup.account.edit'),
                            onPress: () => onEdit(emp),
                        },
                        {
                            icon: emp.is_active ? 'pause-circle-outline' : 'checkmark-circle-outline',
                            label: emp.is_active ? t('common.disable') : t('common.enable'),
                            tone: emp.is_active ? 'warning' : 'success',
                            onPress: () => onToggleActive(emp.id, emp.is_active),
                        },
                        {
                            icon: 'trash-outline',
                            label: t('common.delete'),
                            tone: 'danger',
                            collapseOnNarrow: true,
                            onPress: () => onDelete(emp.id),
                        },
                    ]}
                />
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    muted: {
        fontSize: 13,
        textAlign: 'right',
    },
    rate: {
        fontSize: 15,
        fontWeight: '600',
    },
    emptyCard: {
        borderWidth: 1,
        borderRadius: 10,
        padding: 16,
        alignItems: 'center',
    },
});
