import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { BackendConnectionForm } from '@/components/connection/backend-connection-form';
import { BackupsSection } from '@/components/operations/backups-section';
import { DiagnosticsSection } from '@/components/operations/diagnostics-section';
import { SectionTabs, type SettingsSection } from '@/components/operations/section-tabs';
import { ThemedText } from '@/components/themed-text';
import { CenteredPage } from '@/components/ui/centered-page';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedCard } from '@/components/ui/themed-card';
import { ThemedInput } from '@/components/ui/themed-input';
import { ThemedSelect } from '@/components/ui/themed-select';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { toast } from 'sonner-native';

import { loadPairingInfoFromBackend, printService } from '@/services';
import type { PairingInfo } from '@/services/connection';
import { useAuthStore } from '@/stores/auth';
import { useSettingsStore } from '@/stores/settings';

export default function SettingsScreen() {
    const palette = useAppColors();
    const isWeb = Platform.OS === 'web';
    const params = useLocalSearchParams<{ section?: string | string[] }>();
    const currentUser = useAuthStore((s) => s.currentUser);
    const isOwner = currentUser?.role === 'owner';
    const [section, setSection] = useState<SettingsSection>('printer');

    const {
        printerPaperWidth,
        printerDeviceName,
        printerDeviceAddress,
        hydrateFromDb,
        setPrinterDevice,
    } = useSettingsStore();

    const [printerNameInput, setPrinterNameInput] = useState(printerDeviceName);
    const [printerAddressInput, setPrinterAddressInput] = useState(printerDeviceAddress);
    const [printerTestBusy, setPrinterTestBusy] = useState(false);
    const [bondedPrintersBusy, setBondedPrintersBusy] = useState(false);
    const [bondedPrinters, setBondedPrinters] = useState<{ label: string; value: string }[]>([]);
    const [pairingInfo, setPairingInfo] = useState<PairingInfo | null>(null);
    const [pairingBusy, setPairingBusy] = useState(false);

    const sectionLabels: { key: SettingsSection; label: string }[] = [
        { key: 'printer', label: t('settings.printer.title') },
        { key: 'connection', label: t('settings.connection.title') },
        ...(isOwner
            ? [
                { key: 'backups' as const, label: t('backups.title') },
                { key: 'diagnostics' as const, label: t('diagnostics.title') },
            ]
            : []),
    ];

    useEffect(() => {
        void hydrateFromDb();
    }, [hydrateFromDb]);

    useEffect(() => { setPrinterNameInput(printerDeviceName); }, [printerDeviceName]);
    useEffect(() => { setPrinterAddressInput(printerDeviceAddress); }, [printerDeviceAddress]);

    useEffect(() => {
        const requestedSection = Array.isArray(params.section) ? params.section[0] : params.section;
        if (!requestedSection) return;
        if (requestedSection === 'printer' || requestedSection === 'connection') {
            setSection(requestedSection);
        } else if ((requestedSection === 'backups' || requestedSection === 'diagnostics') && isOwner) {
            setSection(requestedSection);
        }
    }, [params.section, isOwner]);

    useEffect(() => {
        if (section !== 'printer' || Platform.OS !== 'android') return;
        void (async () => {
            try {
                setBondedPrintersBusy(true);
                const devices = await printService.getBondedPrinters();
                setBondedPrinters(devices.map((d) => ({
                    label: d.name?.trim() ? `${d.name} (${d.address})` : String(d.address),
                    value: String(d.address),
                })));
            } catch (error) {
                toast.error(String((error as Error).message || t('sales.receipt.error')));
            } finally {
                setBondedPrintersBusy(false);
            }
        })();
    }, [section]);

    useEffect(() => {
        if (section !== 'connection') {
            return;
        }

        void (async () => {
            try {
                setPairingBusy(true);
                const info = await loadPairingInfoFromBackend();
                setPairingInfo(info);
            } catch {
                setPairingInfo(null);
            } finally {
                setPairingBusy(false);
            }
        })();
    }, [section]);

    const commitPrinterDevice = () => {
        setPrinterDevice({ name: printerNameInput, address: printerAddressInput });
        toast.success(t('settings.receipt.printerSaved'));
    };

    const clearPrinterDevice = () => {
        setPrinterNameInput('');
        setPrinterAddressInput('');
        setPrinterDevice({ name: '', address: '' });
        toast.success(t('settings.receipt.printerCleared'));
    };

    const refreshBondedPrinters = async () => {
        if (Platform.OS !== 'android') return;
        try {
            setBondedPrintersBusy(true);
            const devices = await printService.getBondedPrinters();
            setBondedPrinters(devices.map((d) => ({
                label: d.name?.trim() ? `${d.name} (${d.address})` : String(d.address),
                value: String(d.address),
            })));
        } catch (error) {
            toast.error(String((error as Error).message || t('sales.receipt.error')));
        } finally {
            setBondedPrintersBusy(false);
        }
    };

    const runPrinterTest = async () => {
        try {
            setPrinterTestBusy(true);
            await printService.printTestReceipt(printerPaperWidth, { name: printerNameInput, address: printerAddressInput });
            toast.success(t('settings.receipt.testPrinted'));
        } catch (error) {
            toast.error(String((error as Error).message || t('sales.receipt.error')));
        } finally {
            setPrinterTestBusy(false);
        }
    };

    return (
        <View style={styles.screenContainer}>
            <ScrollView contentContainerStyle={styles.container}>
                <CenteredPage style={styles.centered}>
                <View style={styles.headerTitle}>
                    <ThemedText type="title">{t('nav.tab.settings')}</ThemedText>
                    <ThemedText>{t('settings.tabSubtitle')}</ThemedText>
                </View>

                <SectionTabs section={section} labels={sectionLabels} onChange={setSection} />

                {section === 'printer' ? (
                    <ThemedCard style={styles.card}>
                        <View style={styles.sectionHeading}>
                            <Ionicons name="print-outline" size={20} color={palette.tint} />
                            <ThemedText type="subtitle">{t('settings.printer.title')}</ThemedText>
                        </View>
                        <ThemedText style={styles.muted}>{t('settings.printer.subtitle')}</ThemedText>
                        {!isWeb ? (
                            <ThemedText style={styles.muted}>{t('settings.receipt.printerConfigTitle')}</ThemedText>
                        ) : null}
                        {Platform.OS === 'android' ? (
                            <>
                                <ThemedSelect
                                    value={printerAddressInput}
                                    onValueChange={(value) => {
                                        const selected = bondedPrinters.find((item) => item.value === value);
                                        setPrinterAddressInput(value);
                                        if (selected) {
                                            const parsedName = selected.label.includes(' (') ? selected.label.split(' (')[0] : selected.label;
                                            setPrinterNameInput(parsedName);
                                        }
                                    }}
                                    items={bondedPrinters.length > 0 ? bondedPrinters : [{ label: t('settings.receipt.noBondedPrinters'), value: '' }]}
                                />
                                <ThemedButton
                                    variant="secondary"
                                    style={styles.printerActionOutlineButton}
                                    labelStyle={[styles.printerActionOutlineText, { color: palette.tint }]}
                                    label={bondedPrintersBusy ? t('settings.receipt.refreshingPrinters') : t('settings.receipt.refreshPrinters')}
                                    disabled={bondedPrintersBusy}
                                    onPress={() => void refreshBondedPrinters()}
                                />
                            </>
                        ) : null}
                        {!isWeb ? (
                            <>
                                <ThemedInput
                                    style={styles.printerInput}
                                    label={t('settings.receipt.printerName')}
                                    value={printerNameInput}
                                    placeholder={t('settings.receipt.printerName')}
                                    onChangeText={setPrinterNameInput}
                                    onBlur={commitPrinterDevice}
                                />
                                <ThemedInput
                                    style={styles.printerInput}
                                    label={t('settings.receipt.printerAddress')}
                                    value={printerAddressInput}
                                    placeholder={t('settings.receipt.printerAddress')}
                                    onChangeText={setPrinterAddressInput}
                                    onBlur={commitPrinterDevice}
                                    autoCapitalize="characters"
                                />
                            </>
                        ) : null}
                        <View style={styles.printerActionRow}>
                            {!isWeb ? (
                                <ThemedButton icon="save-outline" label={t('settings.receipt.savePrinter')} onPress={commitPrinterDevice} />
                            ) : null}
                            <ThemedButton
                                variant="secondary"
                                icon="print-outline"
                                iconColor={palette.tint}
                                style={styles.printerActionOutlineButton}
                                labelStyle={[styles.printerActionOutlineText, { color: palette.tint }]}
                                label={printerTestBusy ? t('settings.receipt.testingPrinter') : t('settings.receipt.testPrinter')}
                                disabled={printerTestBusy}
                                onPress={() => void runPrinterTest()}
                            />
                            <ThemedButton
                                variant="secondary"
                                icon="trash-outline"
                                iconColor={palette.danger}
                                style={styles.printerActionClearButton}
                                labelStyle={[styles.printerActionClearText, { color: palette.danger }]}
                                label={t('settings.receipt.clearPrinter')}
                                onPress={clearPrinterDevice}
                                disabled={printerTestBusy}
                            />
                        </View>
                        <View style={[styles.printerHintCallout, { backgroundColor: `${palette.tint}14`, borderColor: `${palette.tint}33` }]}>
                            <Ionicons name="information-circle-outline" size={16} color={palette.tint} />
                            <ThemedText style={styles.printerHintText}>{t('settings.receipt.printerHint')}</ThemedText>
                        </View>
                    </ThemedCard>
                ) : null}

                {section === 'connection' ? (
                    <ThemedCard style={styles.card}>
                        <View style={styles.sectionHeading}>
                            <Ionicons name="wifi-outline" size={20} color={palette.tint} />
                            <ThemedText type="subtitle">{t('settings.connection.title')}</ThemedText>
                        </View>
                        <ThemedText style={styles.muted}>{t('settings.connection.subtitle')}</ThemedText>

                        {Platform.OS === 'web' ? (
                            <View style={styles.connectionQrWrap}>
                                {pairingBusy ? (
                                    <ThemedText style={styles.muted}>{t('settings.connection.loadingPairing')}</ThemedText>
                                ) : pairingInfo?.payload ? (
                                    <>
                                        <QRCode value={pairingInfo.payload} size={220} />
                                        <ThemedText style={styles.connectionPayloadText}>{pairingInfo.payload}</ThemedText>
                                        <ThemedText style={styles.muted}>{t('settings.connection.desktopHint')}</ThemedText>
                                    </>
                                ) : (
                                    <ThemedText style={styles.muted}>{t('settings.connection.pairingUnavailable')}</ThemedText>
                                )}
                            </View>
                        ) : (
                            <BackendConnectionForm showScanner />
                        )}

                        {Platform.OS === 'web' ? <BackendConnectionForm showScanner={false} /> : null}
                    </ThemedCard>
                ) : null}

                {section === 'backups' && isOwner ? <BackupsSection /> : null}

                {section === 'diagnostics' && isOwner ? <DiagnosticsSection /> : null}
                </CenteredPage>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    screenContainer: {
        flex: 1,
    },
    container: {
        padding: 16,
        gap: 12,
    },
    centered: {
        gap: 12,
    },
    sectionHeading: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    card: {
        gap: 10,
    },
    headerTitle: {
        flex: 1,
        minWidth: 160,
    },
    muted: {
        opacity: 0.9,
        fontSize: 13,
    },
    printerInput: {
        width: '100%',
        maxWidth: 420,
        alignSelf: 'flex-start',
    },
    printerActionRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        alignItems: 'flex-start',
    },
    printerActionOutlineButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
    },
    printerActionOutlineText: {
        fontWeight: '600',
    },
    printerActionClearButton: {
        backgroundColor: 'transparent',
        paddingHorizontal: 4,
    },
    printerActionClearText: {
        fontWeight: '600',
    },
    printerHintCallout: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 9,
    },
    printerHintText: {
        flex: 1,
        fontSize: 12,
        opacity: 0.95,
    },
    connectionQrWrap: {
        alignItems: 'center',
        gap: 8,
        paddingVertical: 8,
    },
    connectionPayloadText: {
        fontWeight: '700',
    },
});
