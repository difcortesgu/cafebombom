import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { t } from '@/i18n';
import type { Employee } from '@/types/types';
import { money } from '@/utils/money';

type EmployeesTabProps = {
    employees: Employee[];
    cardWidth: number;
    gap: number;
    palette: {
        card: string;
        border: string;
        mutedText: string;
        inputBackground: string;
        danger: string;
        success: string;
    };
    onEdit: (employee: Employee) => void;
    onDelete: (id: string) => void;
    onToggleActive: (id: string, isActive: boolean) => void;
};

export function EmployeesTab({ employees, cardWidth, gap, palette, onEdit, onDelete, onToggleActive }: EmployeesTabProps) {
    if (employees.length === 0) {
        return (
            <View style={[styles.emptyCard, { backgroundColor: palette.inputBackground, borderColor: palette.border }]}>
                <ThemedText style={{ color: palette.mutedText }}>{t('accounts.employees.roster')}</ThemedText>
            </View>
        );
    }

    return (
        <View style={[styles.grid, { gap }]}>
            {employees.map((emp) => (
                <View key={emp.id} style={[styles.card, { width: cardWidth, backgroundColor: palette.card, borderColor: palette.border, opacity: emp.is_active ? 1 : 0.6 }]}>
                    <ThemedText type="defaultSemiBold" numberOfLines={1}>{emp.name}</ThemedText>
                    <ThemedText style={[styles.muted, { color: palette.mutedText }]}>
                        {emp.salary_type === 'hourly' ? t('accounts.employees.hourly') : t('accounts.employees.monthly')}
                    </ThemedText>
                    <ThemedText style={[styles.rate, { color: palette.mutedText }]}>
                        {money(emp.rate)}
                    </ThemedText>
                    <View style={styles.actions}>
                        <ThemedButton
                            icon="create-outline"
                            label={t('setup.account.edit')}
                            variant="secondary"
                            style={styles.actionBtn}
                            onPress={() => onEdit(emp)}
                        />
                        <ThemedButton
                            icon="trash-outline"
                            label={t('common.delete')}
                            tone="danger"
                            variant="secondary"
                            style={styles.actionBtn}
                            onPress={() => onDelete(emp.id)}
                        />
                    </View>
                    <ThemedButton
                        variant="secondary"
                        tone={emp.is_active ? 'warning' : 'success'}
                        icon={emp.is_active ? 'pause-circle-outline' : 'checkmark-circle-outline'}
                        style={styles.toggleBtn}
                        label={emp.is_active ? t('common.disable') : t('common.enable')}
                        onPress={() => onToggleActive(emp.id, emp.is_active)}
                    />
                </View>
            ))}
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
    muted: {
        fontSize: 13,
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
    actions: {
        flexDirection: 'row',
        gap: 6,
        marginTop: 6,
    },
    actionBtn: {
        flex: 1,
    },
    toggleBtn: {
        marginTop: 6,
        paddingVertical: 7,
        paddingHorizontal: 10,
    },
});
