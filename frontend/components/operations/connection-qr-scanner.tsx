import { CameraView, useCameraPermissions } from 'expo-camera';
import { Platform, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { t } from '@/i18n';

type ConnectionQrScannerProps = {
    onPayloadScanned: (payload: string) => void;
    onManualFallback: () => void;
    onClose: () => void;
};

export function ConnectionQrScanner({ onPayloadScanned, onManualFallback, onClose }: ConnectionQrScannerProps) {
    const [permission, requestPermission] = useCameraPermissions();

    if (Platform.OS === 'web') {
        return null;
    }

    if (!permission) {
        return <ThemedText style={styles.helpText}>{t('settings.connection.cameraLoading')}</ThemedText>;
    }

    if (!permission.granted) {
        return (
            <View style={styles.container}>
                <ThemedText style={styles.helpText}>{t('settings.connection.cameraPermission')}</ThemedText>
                <View style={styles.actionRow}>
                    <ThemedButton
                        icon="camera-outline"
                        label={t('settings.connection.requestCamera')}
                        onPress={() => {
                            void requestPermission();
                        }}
                    />
                    <ThemedButton
                        variant="secondary"
                        icon="create-outline"
                        label={t('settings.connection.manualEntry')}
                        onPress={onManualFallback}
                    />
                    <ThemedButton
                        variant="secondary"
                        icon="close-outline"
                        label={t('shared.close')}
                        onPress={onClose}
                    />
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ThemedText style={styles.helpText}>{t('settings.connection.scanHint')}</ThemedText>
            <CameraView
                style={styles.camera}
                facing="back"
                barcodeScannerSettings={{
                    barcodeTypes: ['qr'],
                }}
                onBarcodeScanned={({ data }) => {
                    onPayloadScanned(data);
                }}
            />
            <View style={styles.actionRow}>
                <ThemedButton
                    variant="secondary"
                    icon="create-outline"
                    label={t('settings.connection.manualEntry')}
                    onPress={onManualFallback}
                />
                <ThemedButton
                    variant="secondary"
                    icon="close-outline"
                    label={t('shared.close')}
                    onPress={onClose}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: 10,
    },
    camera: {
        width: '100%',
        minHeight: 280,
        borderRadius: 12,
        overflow: 'hidden',
    },
    helpText: {
        fontSize: 13,
        opacity: 0.9,
    },
    actionRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
});
