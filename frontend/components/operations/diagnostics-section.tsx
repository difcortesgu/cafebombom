import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedCard } from '@/components/ui/themed-card';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { logger } from '@/services/logger';

/**
 * Lets the user export the app's recent logs to a file (so they can send them
 * to support) or clear them. Backed by the frontend `logger` buffer.
 */
export function DiagnosticsSection() {
    const palette = useAppColors();
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<{ kind: 'info' | 'error'; text: string } | null>(null);

    async function handleExport() {
        try {
            setBusy(true);
            setMessage(null);
            const location = await logger.exportLogsToFile();
            const name = location ? location.split('/').pop() ?? location : '';
            setMessage({ kind: 'info', text: t('diagnostics.exported', { name }) });
        } catch (error) {
            logger.error('Falló la exportación de registros', error);
            setMessage({ kind: 'error', text: t('diagnostics.error') });
        } finally {
            setBusy(false);
        }
    }

    async function handleClear() {
        await logger.clear();
        setMessage({ kind: 'info', text: t('diagnostics.cleared') });
    }

    return (
        <ThemedCard style={styles.card}>
            <ThemedText type="subtitle">{t('diagnostics.title')}</ThemedText>
            <ThemedText style={styles.muted}>{t('diagnostics.help')}</ThemedText>
            {message ? (
                <ThemedText style={{ color: message.kind === 'error' ? palette.danger : palette.tint }}>
                    {message.text}
                </ThemedText>
            ) : null}
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
