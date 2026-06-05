import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedCard } from '@/components/ui/themed-card';
import { ThemedInput } from '@/components/ui/themed-input';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { backupService } from '@/services';
import type { BackupFile, BackupSettings } from '@/services/backup';

const FREQUENCIES: { value: 'daily' | 'weekly'; label: string }[] = [
    { value: 'daily', label: t('backups.frequency.daily') },
    { value: 'weekly', label: t('backups.frequency.weekly') },
];

function formatDateTime(iso: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString();
}

function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function BackupsSection() {
    const palette = useAppColors();

    const [settings, setSettings] = useState<BackupSettings | null>(null);
    const [destinationDraft, setDestinationDraft] = useState('');
    const [retentionDraft, setRetentionDraft] = useState('7');
    const [backups, setBackups] = useState<BackupFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<{ kind: 'info' | 'error'; text: string } | null>(null);
    const [pendingRestore, setPendingRestore] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        try {
            const [s, list] = await Promise.all([backupService.getSettings(), backupService.listBackups()]);
            setSettings(s);
            setDestinationDraft(s.destinationPath ?? '');
            setRetentionDraft(String(s.retention));
            setBackups(list);
        } catch {
            setMessage({ kind: 'error', text: t('backups.error.load') });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    const persist = useCallback(async (patch: Parameters<typeof backupService.saveSettings>[0]) => {
        const updated = await backupService.saveSettings(patch);
        setSettings(updated);
        return updated;
    }, []);

    async function handlePickFolder() {
        try {
            setBusy(true);
            setMessage(null);
            const result = await backupService.pickFolder();
            if (result.status === 'ok' && result.path) {
                setDestinationDraft(result.path);
                await persist({ destinationPath: result.path });
                setMessage({ kind: 'info', text: t('backups.info.folderSaved') });
            } else {
                setMessage({ kind: 'info', text: t('backups.info.pickerUnsupported') });
            }
        } catch {
            setMessage({ kind: 'error', text: t('backups.error.save') });
        } finally {
            setBusy(false);
        }
    }

    async function handleSaveDestination() {
        try {
            setBusy(true);
            setMessage(null);
            await persist({ destinationPath: destinationDraft.trim() || null });
            setMessage({ kind: 'info', text: t('backups.info.folderSaved') });
        } catch {
            setMessage({ kind: 'error', text: t('backups.error.save') });
        } finally {
            setBusy(false);
        }
    }

    async function handleToggleSchedule(value: boolean) {
        try {
            await persist({ scheduleEnabled: value });
        } catch {
            setMessage({ kind: 'error', text: t('backups.error.save') });
        }
    }

    async function handleFrequency(value: 'daily' | 'weekly') {
        try {
            await persist({ frequency: value });
        } catch {
            setMessage({ kind: 'error', text: t('backups.error.save') });
        }
    }

    async function handleRetentionBlur() {
        const parsed = Math.max(1, Math.floor(Number(retentionDraft) || 1));
        setRetentionDraft(String(parsed));
        try {
            await persist({ retention: parsed });
        } catch {
            setMessage({ kind: 'error', text: t('backups.error.save') });
        }
    }

    async function handleBackupNow() {
        try {
            setBusy(true);
            setMessage(null);
            const result = await backupService.runBackup();
            setMessage({ kind: 'info', text: t('backups.info.created', { name: result.fileName }) });
            await refresh();
        } catch (error) {
            setMessage({ kind: 'error', text: String((error as Error).message || t('backups.error.run')) });
        } finally {
            setBusy(false);
        }
    }

    async function handleConfirmRestore() {
        if (!pendingRestore) return;
        const fileName = pendingRestore;
        try {
            setBusy(true);
            setMessage(null);
            await backupService.restore(fileName);
            setPendingRestore(null);
            setMessage({ kind: 'info', text: t('backups.info.restoring') });
        } catch (error) {
            setMessage({ kind: 'error', text: String((error as Error).message || t('backups.error.restore')) });
        } finally {
            setBusy(false);
        }
    }

    if (loading) {
        return (
            <View style={styles.loading}>
                <ActivityIndicator color={palette.tint} />
            </View>
        );
    }

    return (
        <View style={styles.wrapper}>
            {message ? (
                <ThemedText style={{ color: message.kind === 'error' ? palette.danger : palette.tint }}>
                    {message.text}
                </ThemedText>
            ) : null}

            {/* Destination */}
            <ThemedCard style={styles.card}>
                <ThemedText type="subtitle">{t('backups.destination.title')}</ThemedText>
                <ThemedText style={styles.muted}>{t('backups.destination.help')}</ThemedText>
                <ThemedInput
                    label={t('backups.destination.label')}
                    value={destinationDraft}
                    onChangeText={setDestinationDraft}
                    placeholder={t('backups.destination.placeholder')}
                    autoCapitalize="none"
                />
                <View style={styles.row}>
                    <ThemedButton
                        variant="secondary"
                        icon="folder-open-outline"
                        style={styles.flexBtn}
                        label={t('backups.destination.browse')}
                        disabled={busy}
                        onPress={() => void handlePickFolder()}
                    />
                    <ThemedButton
                        style={styles.flexBtn}
                        label={t('backups.destination.save')}
                        disabled={busy}
                        onPress={() => void handleSaveDestination()}
                    />
                </View>
            </ThemedCard>

            {/* Automatic */}
            <ThemedCard style={styles.card}>
                <View style={styles.switchRow}>
                    <View style={styles.flex1}>
                        <ThemedText type="subtitle">{t('backups.auto.title')}</ThemedText>
                        <ThemedText style={styles.muted}>{t('backups.auto.help')}</ThemedText>
                    </View>
                    <Switch
                        value={settings?.scheduleEnabled ?? false}
                        onValueChange={(v) => void handleToggleSchedule(v)}
                        trackColor={{ true: palette.tint }}
                    />
                </View>

                <ThemedText style={styles.smallLabel}>{t('backups.auto.frequency')}</ThemedText>
                <View style={styles.row}>
                    {FREQUENCIES.map((f) => {
                        const active = settings?.frequency === f.value;
                        return (
                            <Pressable
                                key={f.value}
                                style={[
                                    styles.chip,
                                    {
                                        backgroundColor: active ? palette.tint : palette.inputBackground,
                                        borderColor: active ? palette.tint : palette.border,
                                    },
                                ]}
                                onPress={() => void handleFrequency(f.value)}>
                                <ThemedText style={{ color: active ? palette.card : palette.text, fontWeight: active ? '700' : '400' }}>
                                    {f.label}
                                </ThemedText>
                            </Pressable>
                        );
                    })}
                </View>

                <ThemedInput
                    label={t('backups.auto.retention')}
                    value={retentionDraft}
                    onChangeText={setRetentionDraft}
                    onBlur={() => void handleRetentionBlur()}
                    keyboardType="number-pad"
                />
            </ThemedCard>

            {/* Backup now */}
            <ThemedCard style={styles.card}>
                <ThemedText type="subtitle">{t('backups.now.title')}</ThemedText>
                <ThemedText style={styles.muted}>
                    {t('backups.now.last')}: {formatDateTime(settings?.lastBackupAt ?? null)}
                    {settings?.lastBackupStatus ? ` (${settings.lastBackupStatus})` : ''}
                </ThemedText>
                <ThemedButton
                    icon="cloud-upload-outline"
                    label={busy ? t('backups.now.running') : t('backups.now.button')}
                    disabled={busy}
                    onPress={() => void handleBackupNow()}
                />
            </ThemedCard>

            {/* Restore */}
            <ThemedCard style={styles.card}>
                <ThemedText type="subtitle">{t('backups.restore.title')}</ThemedText>
                {backups.length === 0 ? (
                    <ThemedText style={styles.muted}>{t('backups.restore.empty')}</ThemedText>
                ) : (
                    backups.map((file) => (
                        <View key={file.fileName} style={[styles.backupItem, { borderColor: palette.border }]}>
                            <View style={styles.flex1}>
                                <ThemedText type="defaultSemiBold" numberOfLines={1}>{file.fileName}</ThemedText>
                                <ThemedText style={styles.muted}>
                                    {formatDateTime(file.createdAt)} · {formatSize(file.sizeBytes)}
                                </ThemedText>
                            </View>
                            {pendingRestore === file.fileName ? (
                                <View style={styles.confirmRow}>
                                    <ThemedButton
                                        variant="secondary"
                                        style={styles.smallBtn}
                                        label={t('common.cancel')}
                                        disabled={busy}
                                        onPress={() => setPendingRestore(null)}
                                    />
                                    <ThemedButton
                                        tone="danger"
                                        variant="secondary"
                                        style={styles.smallBtn}
                                        label={t('backups.restore.confirm')}
                                        disabled={busy}
                                        onPress={() => void handleConfirmRestore()}
                                    />
                                </View>
                            ) : (
                                <ThemedButton
                                    variant="secondary"
                                    style={styles.smallBtn}
                                    label={t('backups.restore.button')}
                                    disabled={busy}
                                    onPress={() => setPendingRestore(file.fileName)}
                                />
                            )}
                        </View>
                    ))
                )}
                {pendingRestore ? (
                    <View style={[styles.warningBox, { borderColor: palette.danger }]}>
                        <Ionicons name="warning-outline" size={16} color={palette.danger} />
                        <ThemedText style={{ color: palette.danger, flex: 1 }}>{t('backups.restore.warning')}</ThemedText>
                    </View>
                ) : null}
            </ThemedCard>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: { gap: 12 },
    loading: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
    card: { gap: 10 },
    muted: { opacity: 0.9, fontSize: 13 },
    row: { flexDirection: 'row', gap: 8 },
    flexBtn: { flex: 1 },
    flex1: { flex: 1 },
    switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    smallLabel: { fontSize: 13, fontWeight: '600', opacity: 0.8 },
    chip: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
    backupItem: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 10, padding: 10 },
    confirmRow: { flexDirection: 'row', gap: 6 },
    smallBtn: { paddingHorizontal: 10 },
    warningBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 8, padding: 10 },
});
