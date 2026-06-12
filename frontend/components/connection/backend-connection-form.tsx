import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { toast } from 'sonner-native';

import { ConnectionQrScanner } from '@/components/operations/connection-qr-scanner';
import { ThemedText } from '@/components/themed-text';
import { useAppColors } from '@/hooks/use-theme-color';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedInput } from '@/components/ui/themed-input';
import { t } from '@/i18n';
import { buildApiBaseUrl, parsePairingPayload, saveConnection } from '@/services';
import { apiClient } from '@/services/api-client';

type BackendConnectionFormProps = {
    onConnected?: () => Promise<void> | void;
    showScanner?: boolean;
    style?: StyleProp<ViewStyle>;
};

export function BackendConnectionForm({ onConnected, showScanner = Platform.OS !== 'web', style }: BackendConnectionFormProps) {
    const palette = useAppColors();
    const [scannerOpen, setScannerOpen] = useState(false);
    const [scannerLocked, setScannerLocked] = useState(false);
    const [hostInput, setHostInput] = useState('');
    const [portInput, setPortInput] = useState('3000');
    const [busy, setBusy] = useState(false);
    const [manualOpen, setManualOpen] = useState(Platform.OS !== 'web');

    useEffect(() => {
        try {
            const currentBaseUrl = new URL(apiClient.getBaseUrl());
            setHostInput(currentBaseUrl.hostname);
            setPortInput(currentBaseUrl.port || '80');
        } catch {
            // Keep defaults when URL cannot be parsed.
        }
    }, []);

    const connectFromHostPort = async (nextHost: string, nextPort: string) => {
        const host = nextHost.trim();
        const port = Number.parseInt(nextPort.trim(), 10);

        if (!host || !Number.isFinite(port) || port < 1 || port > 65535) {
            toast.error(t('settings.connection.invalidInput'));
            return;
        }

        try {
            setBusy(true);
            await saveConnection({
                host,
                port,
                baseUrl: buildApiBaseUrl(host, port),
            });
            if (onConnected) {
                await onConnected();
            }
            toast.success(t('settings.connection.connected'));
            setScannerOpen(false);
            setScannerLocked(false);
        } catch (connectionError) {
            toast.error(String((connectionError as Error).message || t('settings.connection.connectFailed')));
        } finally {
            setBusy(false);
        }
    };

    const handleScannedPayload = (payload: string) => {
        if (scannerLocked) {
            return;
        }

        setScannerLocked(true);
        const parsed = parsePairingPayload(payload);
        if (!parsed) {
            toast.error(t('settings.connection.invalidQr'));
            setTimeout(() => setScannerLocked(false), 1200);
            return;
        }

        setHostInput(parsed.host);
        setPortInput(String(parsed.port));
        void connectFromHostPort(parsed.host, String(parsed.port));
    };

    return (
        <View style={[styles.container, style]}>
            {showScanner ? (
                !scannerOpen ? (
                    <ThemedButton
                        icon="qr-code-outline"
                        label={t('settings.connection.scanQr')}
                        disabled={busy}
                        onPress={() => {
                            setScannerOpen(true);
                            setScannerLocked(false);
                        }}
                    />
                ) : (
                    <ConnectionQrScanner
                        onPayloadScanned={handleScannedPayload}
                        onManualFallback={() => setScannerOpen(false)}
                        onClose={() => {
                            setScannerOpen(false);
                            setScannerLocked(false);
                        }}
                    />
                )
            ) : null}

            <Pressable
                style={styles.manualHeader}
                onPress={() => setManualOpen((prev) => !prev)}
                accessibilityRole="button">
                <Ionicons
                    name={manualOpen ? 'chevron-down-outline' : 'chevron-forward-outline'}
                    size={18}
                    color={palette.icon}
                />
                <ThemedText type="defaultSemiBold">{t('settings.connection.manualTitle')}</ThemedText>
            </Pressable>

            {manualOpen ? (
                <>
                    <View style={styles.row}>
                        <View style={styles.hostInput}>
                            <ThemedInput
                                value={hostInput}
                                label={t('settings.connection.hostLabel')}
                                placeholder={t('settings.connection.hostPlaceholder')}
                                onChangeText={setHostInput}
                                style={styles.input}
                                numeric="ipv4"
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                        </View>
                        <View style={styles.portInput}>
                            <ThemedInput
                                value={portInput}
                                label={t('settings.connection.portLabel')}
                                placeholder={t('settings.connection.portPlaceholder')}
                                onChangeText={setPortInput}
                                style={styles.input}
                                numeric="integer"
                            />
                        </View>
                    </View>
                    <ThemedButton
                        icon="link-outline"
                        label={busy ? t('settings.connection.connecting') : t('settings.connection.connectAction')}
                        disabled={busy}
                        onPress={() => {
                            void connectFromHostPort(hostInput, portInput);
                        }}
                    />
                </>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: 10,
    },
    manualHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 2,
    },
    row: {
        flexDirection: 'row',
        gap: 8,
        alignItems: 'flex-end',
    },
    input: {
        marginBottom: 0,
    },
    hostInput: {
        flex: 1,
    },
    portInput: {
        width: 110,
    },
});
