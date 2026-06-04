import { Ionicons } from '@expo/vector-icons';
import { Buffer } from 'buffer';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FormScreen } from '@/components/ui/form-screen';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedCard } from '@/components/ui/themed-card';
import { t } from '@/i18n';
import { setupService } from '@/services';
import { useInventoryStore } from '@/stores/inventory';
import { useProductsStore } from '@/stores/products';
import { useSalesStore } from '@/stores/sales';

export default function ImportDataScreen() {
    const router = useRouter();
    const { hydrate: hydrateInventory } = useInventoryStore();
    const { hydrate: hydrateProducts } = useProductsStore();
    const { hydrate: hydrateSales } = useSalesStore();

    const [importBusy, setImportBusy] = useState(false);
    const [importMessage, setImportMessage] = useState<string | null>(null);
    const [importIssues, setImportIssues] = useState<string[]>([]);

    useFocusEffect(
        useCallback(() => {
            setImportMessage(null);
            setImportIssues([]);
        }, []),
    );

    const importSeedData = async () => {
        try {
            setImportBusy(true);
            setImportMessage(null);
            setImportIssues([]);
            const result = await DocumentPicker.getDocumentAsync({
                type: [
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'application/vnd.ms-excel',
                ],
                multiple: false,
                copyToCacheDirectory: true,
            });
            if (result.canceled || result.assets.length === 0) return;
            const pickedFile = result.assets[0];
            const response = await fetch(pickedFile.uri);
            const buffer = await response.arrayBuffer();
            const importResult = await setupService.importSeedFromExcel(new Uint8Array(buffer));
            setImportMessage(
                `Imported/updated ${importResult.summary.suppliers.inserted + importResult.summary.suppliers.updated} providers, ${importResult.summary.employees.inserted + importResult.summary.employees.updated} employees, ${importResult.summary.categories.inserted + importResult.summary.categories.updated} categories, ${importResult.summary.ingredients.inserted + importResult.summary.ingredients.updated} ingredients, ${importResult.summary.products.inserted + importResult.summary.products.updated} products, and ${importResult.summary.restaurantTables.inserted + importResult.summary.restaurantTables.updated} tables.`,
            );
            setImportIssues(importResult.issues.map((issue) => issue.message));
            await Promise.all([hydrateInventory(), hydrateProducts(), hydrateSales()]);
        } catch (importError) {
            setImportMessage(`Import failed: ${String((importError as Error)?.message ?? importError)}`);
        } finally {
            setImportBusy(false);
        }
    };

    const downloadImportTemplate = async () => {
        try {
            setImportBusy(true);
            setImportMessage(null);
            const file = await setupService.downloadImportTemplate();
            if (Platform.OS === 'web') {
                const blob = new Blob([file.bytes], {
                    type: file.contentType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                });
                const url = URL.createObjectURL(blob);
                const anchor = document.createElement('a');
                anchor.href = url;
                anchor.download = file.fileName;
                anchor.click();
                URL.revokeObjectURL(url);
                setImportMessage('Template downloaded successfully.');
                return;
            }
            if (Platform.OS === 'android') {
                const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
                if (!permissions.granted) {
                    setImportMessage('Permission denied. Select Download folder to save the template.');
                    return;
                }
                const destination = await FileSystem.StorageAccessFramework.createFileAsync(
                    permissions.directoryUri,
                    file.fileName,
                    file.contentType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                );
                await FileSystem.writeAsStringAsync(destination, Buffer.from(file.bytes).toString('base64'), {
                    encoding: FileSystem.EncodingType.Base64,
                });
                setImportMessage(`Template saved in selected folder: ${file.fileName}`);
                return;
            }
            if (!FileSystem.documentDirectory) {
                setImportMessage('Could not access local storage.');
                return;
            }
            const templateDir = `${FileSystem.documentDirectory}templates/`;
            await FileSystem.makeDirectoryAsync(templateDir, { intermediates: true });
            const destination = `${templateDir}${file.fileName}`;
            await FileSystem.writeAsStringAsync(destination, Buffer.from(file.bytes).toString('base64'), {
                encoding: FileSystem.EncodingType.Base64,
            });
            setImportMessage(`Template saved to: ${destination}`);
        } catch (downloadError) {
            setImportMessage(`Template download failed: ${String((downloadError as Error)?.message ?? downloadError)}`);
        } finally {
            setImportBusy(false);
        }
    };

    return (
        <FormScreen>
            <ThemedText type="title">{t('operations.importData')}</ThemedText>
            <ThemedText>{t('operations.importSubtitle')}</ThemedText>

            <ThemedCard style={styles.card}>
                <ThemedButton
                    disabled={importBusy}
                    label={importBusy ? 'Importando...' : t('operations.importAction')}
                    icon="cloud-upload-outline"
                    onPress={() => void importSeedData()}
                />
                <ThemedButton
                    variant="secondary"
                    disabled={importBusy}
                    label={t('operations.downloadTemplate')}
                    icon="download-outline"
                    onPress={() => void downloadImportTemplate()}
                />
                {importMessage ? (
                    <ThemedText style={styles.message}>{importMessage}</ThemedText>
                ) : null}
                {importIssues.map((issue) => (
                    <ThemedText key={issue} style={[styles.message, { color: '#C62828' }]}>
                        <Ionicons name="warning-outline" size={13} /> {issue}
                    </ThemedText>
                ))}
            </ThemedCard>

            <ThemedButton
                variant="secondary"
                icon="arrow-back"
                label={t('common.back')}
                onPress={() => router.back()}
            />
        </FormScreen>
    );
}

const styles = StyleSheet.create({
    card: {
        gap: 12,
    },
    message: {
        fontSize: 13,
        opacity: 0.9,
    },
});
