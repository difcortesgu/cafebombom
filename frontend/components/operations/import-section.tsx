import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedCard } from '@/components/ui/themed-card';
import { t } from '@/i18n';

type ImportSectionProps = {
    busy: boolean;
    message: string | null;
    issues: string[];
    dangerColor: string;
    onImport: () => void;
    onDownloadTemplate: () => void;
};

export function ImportSection({
    busy,
    message,
    issues,
    dangerColor,
    onImport,
    onDownloadTemplate,
}: ImportSectionProps) {
    return (
        <ThemedCard style={styles.card}>
            <ThemedText type="subtitle">{t('operations.import')}</ThemedText>
            <ThemedText style={styles.muted}>{t('operations.importSubtitle')}</ThemedText>
            <ThemedButton disabled={busy} label={busy ? 'Importando...' : t('operations.importAction')} onPress={onImport} />
            <ThemedButton variant="secondary" disabled={busy} label={t('operations.downloadTemplate')} onPress={onDownloadTemplate} />
            {message ? <ThemedText style={styles.muted}>{message}</ThemedText> : null}
            {issues.map((issue) => (
                <ThemedText key={issue} style={[styles.muted, { color: dangerColor }]}>
                    {issue}
                </ThemedText>
            ))}
        </ThemedCard>
    );
}

const styles = StyleSheet.create({
    card: {
        gap: 10,
    },
    muted: {
        opacity: 0.9,
        fontSize: 13,
    },
});
