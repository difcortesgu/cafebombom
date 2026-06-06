import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ConnectionQrScanner } from '@/components/operations/connection-qr-scanner';
import { ThemedText } from '@/components/themed-text';
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
    const [scannerOpen, setScannerOpen] = useState(false);
    const [scannerLocked, setScannerLocked] = useState(false);
    const [hostInput, setHostInput] = useState('');
    const [portInput, setPortInput] = useState('3000');
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

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
            setMessage(t('settings.connection.invalidInput'));
            return;
        }

        try {
            setBusy(true);
            setMessage(null);
            await saveConnection({
                host,
                port,
                baseUrl: buildApiBaseUrl(host, port),
            });
            if (onConnected) {
                await onConnected();
            }
            setMessage(t('settings.connection.connected'));
            setScannerOpen(false);
            setScannerLocked(false);
        } catch (connectionError) {
            setMessage(String((connectionError as Error).message || t('settings.connection.connectFailed')));
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
            setMessage(t('settings.connection.invalidQr'));
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

            <ThemedText type="defaultSemiBold">{t('settings.connection.manualTitle')}</ThemedText>
            <View style={styles.row}>
                <ThemedInput
                    value={hostInput}
                    placeholder={t('settings.connection.hostPlaceholder')}
                    onChangeText={setHostInput}
                    style={[styles.input, styles.hostInput]}
                    autoCapitalize="none"
                    autoCorrect={false}
                />
                <ThemedInput
                    value={portInput}
                    placeholder={t('settings.connection.portPlaceholder')}
                    onChangeText={setPortInput}
                    style={[styles.input, styles.portInput]}
                    numeric="integer"
                />
            </View>
            <ThemedButton
                icon="link-outline"
                label={busy ? t('settings.connection.connecting') : t('settings.connection.connectAction')}
                disabled={busy}
                onPress={() => {
                    void connectFromHostPort(hostInput, portInput);
                }}
            />
            {message ? <ThemedText style={styles.message}>{message}</ThemedText> : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: 10,
    },
    row: {
        flexDirection: 'row',
        gap: 8,
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
    message: {
        fontSize: 12,
    },
});
