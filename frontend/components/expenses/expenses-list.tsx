import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { t } from '@/i18n';
import type { Expense } from '@/types/types';

type ExpensesListProps = {
    expenses: Expense[];
    palette: {
        card: string;
        border: string;
        mutedText: string;
        tint: string;
    };
};

export function ExpensesList({ expenses, palette }: ExpensesListProps) {
    if (expenses.length === 0) {
        return (
            <View style={[styles.emptyCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
                <IconSymbol name="receipt.fill" size={24} color={palette.mutedText} />
                <ThemedText style={[styles.emptyText, { color: palette.mutedText }]}>{t('accounts.expenses.today')}: $0.00</ThemedText>
            </View>
        );
    }

    return (
        <View style={styles.listSection}>
            <View style={styles.sectionHeader}>
                <IconSymbol name="receipt.fill" size={16} color={palette.mutedText} />
                <ThemedText style={[styles.listSectionTitle, { color: palette.mutedText }]}>Registros del día</ThemedText>
            </View>
            {expenses.map((expense) => (
                <View key={expense.id} style={[styles.listItem, { backgroundColor: palette.card }]}>
                    <View style={[styles.listItemIcon, { backgroundColor: palette.tint + '22' }]}>
                        <IconSymbol name="tag.fill" size={20} color={palette.tint} />
                    </View>
                    <View style={styles.listItemInfo}>
                        <ThemedText type="defaultSemiBold">{expense.category}</ThemedText>
                        <ThemedText style={[styles.listItemSub, { color: palette.mutedText }]}>
                            {expense.description || t('accounts.expenses.noDescription')}
                        </ThemedText>
                    </View>
                    <ThemedText style={[styles.listItemAmount, { color: palette.tint }]}>
                        ${Number(expense.amount).toFixed(2)}
                    </ThemedText>
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    emptyCard: {
        padding: 24,
        borderRadius: 16,
        borderWidth: 1,
        alignItems: 'center',
        gap: 8,
    },
    emptyText: {
        fontSize: 14,
    },
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
    listItemSub: {
        fontSize: 12,
    },
    listItemAmount: {
        fontSize: 16,
        fontWeight: '700',
    },
});
