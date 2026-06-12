import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { toast } from 'sonner-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedCard } from '@/components/ui/themed-card';
import { t } from '@/i18n';
import { logger } from '@/services/logger';

export function DiagnosticsSection() {
    const [busy, setBusy] = useState(false);

    async function handleExport() {
        try {
            setBusy(true);
            const location = await logger.exportLogsToFile();
            const name = location ? location.split('/').pop() ?? location : '';
            toast.success(t('diagnostics.exported', { name }));
        } catch (error) {
            logger.error('Falló la exportación de registros', error);
            toast.error(t('diagnostics.error'));
        } finally {
            setBusy(false);
        }
    }

    async function handleClear() {
        await logger.clear();
        toast.success(t('diagnostics.cleared'));
    }

    return (
        <ThemedCard style={styles.card}>
            <ThemedText type="subtitle">{t('diagnostics.title')}</ThemedText>
            <ThemedText style={styles.muted}>{t('diagnostics.help')}</ThemedText>
            <View style={styles.row}>
                <ThemedButton
                    icon="download-outline"
                    style={styles.flexBtn}
                    label={t('diagnostics.export')}
                    disabled={busy}
                    onPress={() => void handleExport()}
                />
                <ThemedButton
                    variant="secondary"
                    style={styles.flexBtn}
                    label={t('diagnostics.clear')}
                    disabled={busy}
                    onPress={() => void handleClear()}
                />
            </View>
        </ThemedCard>
    );
}

const styles = StyleSheet.create({
    card: { gap: 10 },
    muted: { opacity: 0.9, fontSize: 13 },
    row: { flexDirection: 'row', gap: 8 },
    flexBtn: { flex: 1 },
});

