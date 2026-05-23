import { Ionicons } from '@expo/vector-icons';
import { Buffer } from 'buffer';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Image } from 'expo-image';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { DiscountPanelForm } from '@/components/operations/discount-panel-form';
import { DiscountsSection } from '@/components/operations/discounts-section';
import { PaymentMethodPanelForm } from '@/components/operations/payment-method-panel-form';
import { PaymentMethodsSection } from '@/components/operations/payment-methods-section';
import { SectionTabs, type OperationsSection } from '@/components/operations/section-tabs';
import { SurchargesSection } from '@/components/operations/surcharges-section';
import { TablePanelForm } from '@/components/operations/table-panel-form';
import { TablesSection } from '@/components/operations/tables-section';
import { ThemedText } from '@/components/themed-text';
import { SlidePanelShell } from '@/components/ui/slide-panel';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedCard } from '@/components/ui/themed-card';
import { ThemedInput } from '@/components/ui/themed-input';
import { ThemedSelect } from '@/components/ui/themed-select';
import { useCatalogGrid } from '@/hooks/use-catalog-grid';
import { usePanelLifecycle } from '@/hooks/use-panel-lifecycle';
import { useResponsiveOpen } from '@/hooks/use-responsive-open';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { printService, setupService } from '@/services';
import { useInventoryStore } from '@/stores/inventory';
import { useProductsStore } from '@/stores/products';
import { useSalesStore } from '@/stores/sales';
import { useSettingsStore } from '@/stores/settings';
import type { Discount } from '@/types/types';

const GRID_GAP = 12;

type OperationsPanelMode =
    | { type: 'table-create' }
    | { type: 'table-edit'; tableId: string }
    | { type: 'payment-method-add' }
    | { type: 'discount-add-global' }
    | { type: 'discount-add-product' }
    | { type: 'discount-edit'; discount: Discount }
    | { type: 'import' };

export default function OperationsScreen() {
    const palette = useAppColors();
    const router = useRouter();
    const { screenWidth, cardWidth } = useCatalogGrid();
    const { openOrNavigate } = useResponsiveOpen();
    const panel = usePanelLifecycle();
    const [panelMode, setPanelMode] = useState<OperationsPanelMode | null>(null);
    const [section, setSection] = useState<OperationsSection>('tables');

    const {
        hydrate: hydrateSales,
        tables,
        deleteTable,
    } = useSalesStore();
    const hydrateInventory = useInventoryStore((state) => state.hydrate);
    const { hydrate: hydrateProducts } = useProductsStore();
    const {
        deliverySurcharge,
        toGoSurcharge,
        businessName,
        businessAddress,
        businessPhone,
        businessNit,
        businessLogoUri,
        receiptFooterMessage,
        printerPaperWidth,
        taxRate,
        printerDeviceName,
        printerDeviceAddress,
        hydrateFromDb,
        setDeliverySurcharge,
        setToGoSurcharge,
        setBusinessInfo,
        setTaxRate,
        setPrinterDevice,
        setPrinterPaperWidth,
    } = useSettingsStore();

    const [tablesMessage, setTablesMessage] = useState<string | null>(null);
    const [deliveryInput, setDeliveryInput] = useState(deliverySurcharge.toFixed(2));
    const [toGoInput, setToGoInput] = useState(toGoSurcharge.toFixed(2));
    const [businessNameInput, setBusinessNameInput] = useState(businessName);
    const [businessAddressInput, setBusinessAddressInput] = useState(businessAddress);
    const [businessPhoneInput, setBusinessPhoneInput] = useState(businessPhone);
    const [businessNitInput, setBusinessNitInput] = useState(businessNit);
    const [businessLogoUriInput, setBusinessLogoUriInput] = useState(businessLogoUri ?? '');
    const [receiptFooterInput, setReceiptFooterInput] = useState(receiptFooterMessage);
    const [taxRateInput, setTaxRateInput] = useState((taxRate * 100).toFixed(2));
    const [printerNameInput, setPrinterNameInput] = useState(printerDeviceName);
    const [printerAddressInput, setPrinterAddressInput] = useState(printerDeviceAddress);
    const [printerTestBusy, setPrinterTestBusy] = useState(false);
    const [printerStatusMessage, setPrinterStatusMessage] = useState<string | null>(null);
    const [bondedPrintersBusy, setBondedPrintersBusy] = useState(false);
    const [bondedPrinters, setBondedPrinters] = useState<{ label: string; value: string }[]>([]);
    const [logoBusy, setLogoBusy] = useState(false);
    const [logoMessage, setLogoMessage] = useState<string | null>(null);
    const [importBusy, setImportBusy] = useState(false);
    const [importMessage, setImportMessage] = useState<string | null>(null);
    const [importIssues, setImportIssues] = useState<string[]>([]);


    const sectionLabels: { key: OperationsSection; label: string }[] = [
        { key: 'tables', label: t('tables.title') },
        { key: 'payment-methods', label: t('settings.paymentMethods.title') },
        { key: 'surcharges', label: t('settings.fees.title') },
        { key: 'discounts', label: t('products.discounts.title') },
        { key: 'receipt', label: t('settings.receipt.title') },
        { key: 'printer', label: t('settings.printer.title') },
    ];

    useEffect(() => {
        void hydrateFromDb();
    }, [hydrateFromDb]);

    useFocusEffect(
        useCallback(() => {
            void Promise.all([hydrateSales(), hydrateProducts()]);
        }, [hydrateSales, hydrateProducts]),
    );

    useEffect(() => { setDeliveryInput(deliverySurcharge.toFixed(2)); }, [deliverySurcharge]);
    useEffect(() => { setToGoInput(toGoSurcharge.toFixed(2)); }, [toGoSurcharge]);
    useEffect(() => { setBusinessNameInput(businessName); }, [businessName]);
    useEffect(() => { setBusinessAddressInput(businessAddress); }, [businessAddress]);
    useEffect(() => { setBusinessPhoneInput(businessPhone); }, [businessPhone]);
    useEffect(() => { setBusinessNitInput(businessNit); }, [businessNit]);
    useEffect(() => { setBusinessLogoUriInput(businessLogoUri ?? ''); }, [businessLogoUri]);
    useEffect(() => { setReceiptFooterInput(receiptFooterMessage); }, [receiptFooterMessage]);
    useEffect(() => { setTaxRateInput((taxRate * 100).toFixed(2)); }, [taxRate]);
    useEffect(() => { setPrinterNameInput(printerDeviceName); }, [printerDeviceName]);
    useEffect(() => { setPrinterAddressInput(printerDeviceAddress); }, [printerDeviceAddress]);

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
                setPrinterStatusMessage(String((error as Error).message || t('sales.receipt.error')));
            } finally {
                setBondedPrintersBusy(false);
            }
        })();
    }, [section]);

    const parseFee = (raw: string) => {
        const n = Number.parseFloat(raw);
        return (!Number.isFinite(n) || n < 0) ? 0 : Number(n.toFixed(2));
    };

    const commitDeliveryFee = () => {
        const value = parseFee(deliveryInput);
        setDeliverySurcharge(value);
        setDeliveryInput(value.toFixed(2));
    };

    const commitToGoFee = () => {
        const value = parseFee(toGoInput);
        setToGoSurcharge(value);
        setToGoInput(value.toFixed(2));
    };

    const commitBusinessInfo = () => {
        setBusinessInfo({
            name: businessNameInput.trim() || 'CafeBomBom',
            address: businessAddressInput.trim(),
            phone: businessPhoneInput.trim(),
            nit: businessNitInput.trim(),
            logoUri: businessLogoUriInput.trim() || null,
            footerMessage: receiptFooterInput.trim(),
        });
    };

    const commitTaxRate = () => {
        const numeric = Number.parseFloat(taxRateInput);
        const normalized = Number.isFinite(numeric) && numeric >= 0 ? numeric / 100 : taxRate;
        setTaxRate(normalized);
        setTaxRateInput((normalized * 100).toFixed(2));
    };

    const commitPrinterDevice = () => {
        setPrinterDevice({ name: printerNameInput, address: printerAddressInput });
        setPrinterStatusMessage(t('settings.receipt.printerSaved'));
    };

    const clearPrinterDevice = () => {
        setPrinterNameInput('');
        setPrinterAddressInput('');
        setPrinterDevice({ name: '', address: '' });
        setPrinterStatusMessage(t('settings.receipt.printerCleared'));
    };

    const refreshBondedPrinters = async () => {
        if (Platform.OS !== 'android') return;
        try {
            setBondedPrintersBusy(true);
            setPrinterStatusMessage(null);
            const devices = await printService.getBondedPrinters();
            setBondedPrinters(devices.map((d) => ({
                label: d.name?.trim() ? `${d.name} (${d.address})` : String(d.address),
                value: String(d.address),
            })));
        } catch (error) {
            setPrinterStatusMessage(String((error as Error).message || t('sales.receipt.error')));
        } finally {
            setBondedPrintersBusy(false);
        }
    };

    const runPrinterTest = async () => {
        try {
            setPrinterTestBusy(true);
            setPrinterStatusMessage(null);
            await printService.printTestReceipt(printerPaperWidth, { name: printerNameInput, address: printerAddressInput });
            setPrinterStatusMessage(t('settings.receipt.testPrinted'));
        } catch (error) {
            setPrinterStatusMessage(String((error as Error).message || t('sales.receipt.error')));
        } finally {
            setPrinterTestBusy(false);
        }
    };

    const resolveLogoExtension = (uri: string, mimeType?: string) => {
        const maybeExt = uri.split('.').pop()?.toLowerCase();
        if (maybeExt && maybeExt.length <= 5) return maybeExt;
        if (mimeType?.includes('png')) return 'png';
        if (mimeType?.includes('webp')) return 'webp';
        return 'jpg';
    };

    const pickBusinessLogo = async () => {
        try {
            setLogoBusy(true);
            setLogoMessage(null);
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
                setLogoMessage(t('settings.receipt.logoPermissionRequired'));
                return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 1,
            });
            if (result.canceled || result.assets.length === 0) return;
            const selected = result.assets[0];
            const targetWidth = printerPaperWidth === 58 ? 256 : 384;
            const transformed = await manipulateAsync(
                selected.uri,
                [{ resize: { width: targetWidth } }],
                { compress: 0.92, format: SaveFormat.PNG, base64: Platform.OS === 'web' },
            );
            let persistedUri = transformed.uri;
            if (businessLogoUriInput && Platform.OS !== 'web' && FileSystem.documentDirectory && businessLogoUriInput.startsWith(FileSystem.documentDirectory)) {
                try { await FileSystem.deleteAsync(businessLogoUriInput, { idempotent: true }); } catch { /* ignore */ }
            }
            if (Platform.OS === 'web') {
                if (transformed.base64) persistedUri = `data:image/png;base64,${transformed.base64}`;
            } else if (FileSystem.documentDirectory) {
                const logoDir = `${FileSystem.documentDirectory}receipt-logo/`;
                await FileSystem.makeDirectoryAsync(logoDir, { intermediates: true });
                const ext = resolveLogoExtension(transformed.uri, selected.mimeType);
                const destination = `${logoDir}logo-${Date.now()}.${ext}`;
                await FileSystem.copyAsync({ from: transformed.uri, to: destination });
                persistedUri = destination;
            }
            setBusinessLogoUriInput(persistedUri);
            setBusinessInfo({ logoUri: persistedUri });
            setLogoMessage(t('settings.receipt.logoOptimized'));
        } catch (error) {
            setLogoMessage(String((error as Error).message || t('sales.receipt.error')));
        } finally {
            setLogoBusy(false);
        }
    };

    const removeBusinessLogo = () => {
        if (businessLogoUriInput && Platform.OS !== 'web' && FileSystem.documentDirectory && businessLogoUriInput.startsWith(FileSystem.documentDirectory)) {
            void FileSystem.deleteAsync(businessLogoUriInput, { idempotent: true });
        }
        setBusinessLogoUriInput('');
        setBusinessInfo({ logoUri: null });
        setLogoMessage(null);
    };

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
                const blob = new Blob([file.bytes], { type: file.contentType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
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
                await FileSystem.writeAsStringAsync(destination, Buffer.from(file.bytes).toString('base64'), { encoding: FileSystem.EncodingType.Base64 });
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
            await FileSystem.writeAsStringAsync(destination, Buffer.from(file.bytes).toString('base64'), { encoding: FileSystem.EncodingType.Base64 });
            setImportMessage(`Template saved to: ${destination}`);
        } catch (downloadError) {
            setImportMessage(`Template download failed: ${String((downloadError as Error)?.message ?? downloadError)}`);
        } finally {
            setImportBusy(false);
        }
    };

    return (
        <View style={styles.screenContainer}>
            <ScrollView contentContainerStyle={styles.container}>
                <View style={styles.headerRow}>
                    <View>
                        <ThemedText type="title">{t('operations.title')}</ThemedText>
                        <ThemedText>{t('operations.subtitle')}</ThemedText>
                    </View>
                    <ThemedButton
                        variant="secondary"
                        label={t('operations.importData')}
                        onPress={() => { setPanelMode({ type: 'import' }); panel.open(); }}
                    />
                </View>

                <SectionTabs section={section} labels={sectionLabels} onChange={setSection} />

                {section === 'tables' ? (
                    <TablesSection
                        tables={tables}
                        message={tablesMessage}
                        cardWidth={cardWidth}
                        gap={GRID_GAP}
                        onAdd={() => openOrNavigate(
                            () => { setPanelMode({ type: 'table-create' }); panel.open(); },
                            '/table-form',
                        )}
                        onEdit={(tableId) => openOrNavigate(
                            () => { setPanelMode({ type: 'table-edit', tableId }); panel.open(); },
                            { pathname: '/table-form', params: { id: tableId } },
                        )}
                        onDelete={(tableId) => {
                            void (async () => {
                                try {
                                    await deleteTable(tableId);
                                    setTablesMessage(t('tables.deleted'));
                                } catch {
                                    setTablesMessage(t('sales.error.tableHasLinkedSales'));
                                }
                            })();
                        }}
                    />
                ) : null}

                {section === 'payment-methods' ? (
                    <PaymentMethodsSection
                        cardWidth={cardWidth}
                        gap={GRID_GAP}
                        onAdd={() => openOrNavigate(
                            () => { setPanelMode({ type: 'payment-method-add' }); panel.open(); },
                            '/payment-methods',
                        )}
                    />
                ) : null}

                {section === 'surcharges' ? (
                    <SurchargesSection
                        deliveryInput={deliveryInput}
                        toGoInput={toGoInput}
                        onDeliveryChange={setDeliveryInput}
                        onToGoChange={setToGoInput}
                        onDeliveryBlur={commitDeliveryFee}
                        onToGoBlur={commitToGoFee}
                    />
                ) : null}

                {section === 'discounts' ? (
                    <DiscountsSection
                        cardWidth={cardWidth}
                        gap={GRID_GAP}
                        onAddGlobal={() => openOrNavigate(
                            () => { setPanelMode({ type: 'discount-add-global' }); panel.open(); },
                            '/discount-form',
                        )}
                        onAddProduct={() => openOrNavigate(
                            () => { setPanelMode({ type: 'discount-add-product' }); panel.open(); },
                            '/discount-form',
                        )}
                        onEdit={(discount) => openOrNavigate(
                            () => { setPanelMode({ type: 'discount-edit', discount }); panel.open(); },
                            '/discount-form',
                        )}
                    />
                ) : null}

                {section === 'receipt' ? (
                    <ThemedCard style={styles.card}>
                        <ThemedText type="subtitle">{t('settings.receipt.title')}</ThemedText>
                        <ThemedText style={styles.muted}>{t('settings.receipt.subtitle')}</ThemedText>
                        <ThemedInput
                            style={styles.receiptInput}
                            value={businessNameInput}
                            placeholder={t('settings.receipt.businessName')}
                            onChangeText={setBusinessNameInput}
                            onBlur={commitBusinessInfo}
                        />
                        <ThemedInput
                            style={styles.receiptInput}
                            value={businessAddressInput}
                            placeholder={t('settings.receipt.businessAddress')}
                            onChangeText={setBusinessAddressInput}
                            onBlur={commitBusinessInfo}
                        />
                        <ThemedInput
                            style={styles.receiptInput}
                            value={businessPhoneInput}
                            placeholder={t('settings.receipt.businessPhone')}
                            onChangeText={setBusinessPhoneInput}
                            onBlur={commitBusinessInfo}
                        />
                        <ThemedInput
                            style={styles.receiptInput}
                            value={businessNitInput}
                            placeholder={t('settings.receipt.businessNit')}
                            onChangeText={setBusinessNitInput}
                            onBlur={commitBusinessInfo}
                        />
                        <View style={styles.receiptActionRow}>
                            <ThemedButton
                                label={logoBusy ? `${t('settings.receipt.pickLogo')}...` : t('settings.receipt.pickLogo')}
                                onPress={() => void pickBusinessLogo()}
                                disabled={logoBusy}
                            />
                            {businessLogoUriInput ? (
                                <ThemedButton
                                    variant="secondary"
                                    style={styles.printerActionClearButton}
                                    labelStyle={[styles.printerActionClearText, { color: palette.danger }]}
                                    label={t('settings.receipt.removeLogo')}
                                    onPress={removeBusinessLogo}
                                    disabled={logoBusy}
                                />
                            ) : null}
                        </View>
                        {businessLogoUriInput ? (
                            <Image source={{ uri: businessLogoUriInput }} style={styles.logoPreview} contentFit="contain" />
                        ) : (
                            <View style={[styles.receiptHintCallout, { backgroundColor: `${palette.tint}14`, borderColor: `${palette.tint}33` }]}>
                                <Ionicons name="information-circle-outline" size={16} color={palette.tint} />
                                <ThemedText style={styles.receiptHintText}>{t('settings.receipt.noLogo')}</ThemedText>
                            </View>
                        )}
                        {logoMessage ? (
                            <View style={[styles.receiptStatusCallout, { backgroundColor: `${palette.inputBackground}` }]}>
                                <Ionicons name="information-circle-outline" size={16} color={logoMessage === t('settings.receipt.logoOptimized') ? palette.tint : palette.danger} />
                                <ThemedText style={styles.receiptStatusText}>{logoMessage}</ThemedText>
                            </View>
                        ) : null}
                        <ThemedInput
                            style={styles.receiptInput}
                            value={receiptFooterInput}
                            placeholder={t('settings.receipt.footerMessage')}
                            onChangeText={setReceiptFooterInput}
                            onBlur={commitBusinessInfo}
                        />
                        <View style={styles.receiptCompactControl}>
                            <ThemedText style={styles.feeLabel}>{t('settings.receipt.taxRate')}</ThemedText>
                            <ThemedInput
                                style={styles.receiptTaxInput}
                                keyboardType="decimal-pad"
                                value={taxRateInput}
                                onChangeText={setTaxRateInput}
                                onBlur={commitTaxRate}
                                placeholder="8.00"
                            />
                        </View>
                        <View style={styles.receiptCompactControl}>
                            <ThemedText style={styles.muted}>{t('settings.receipt.paperWidth')}</ThemedText>
                            <View style={styles.receiptPaperWidthRow}>
                                {[58, 80].map((width) => {
                                    const isActive = printerPaperWidth === width;
                                    return (
                                        <Pressable
                                            key={width}
                                            style={[styles.receiptPaperChip, { backgroundColor: isActive ? palette.tint : palette.inputBackground, borderColor: isActive ? palette.tint : palette.border }]}
                                            onPress={() => setPrinterPaperWidth(width as 58 | 80)}>
                                            <ThemedText style={{ color: isActive ? palette.card : palette.text, fontWeight: isActive ? '700' : '400' }}>
                                                {width}mm
                                            </ThemedText>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        </View>
                    </ThemedCard>
                ) : null}

                {section === 'printer' ? (
                    <ThemedCard style={styles.card}>
                        <ThemedText type="subtitle">{t('settings.printer.title')}</ThemedText>
                        <ThemedText style={styles.muted}>{t('settings.printer.subtitle')}</ThemedText>
                        <ThemedText style={styles.muted}>{t('settings.receipt.printerConfigTitle')}</ThemedText>
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
                                        setPrinterStatusMessage(null);
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
                        <ThemedInput
                            style={styles.printerInput}
                            value={printerNameInput}
                            placeholder={t('settings.receipt.printerName')}
                            onChangeText={setPrinterNameInput}
                            onBlur={commitPrinterDevice}
                        />
                        <ThemedInput
                            style={styles.printerInput}
                            value={printerAddressInput}
                            placeholder={t('settings.receipt.printerAddress')}
                            onChangeText={setPrinterAddressInput}
                            onBlur={commitPrinterDevice}
                            autoCapitalize="characters"
                        />
                        <View style={styles.printerActionRow}>
                            <View style={styles.printerSaveGroup}>
                                <ThemedButton label={t('settings.receipt.savePrinter')} onPress={commitPrinterDevice} />
                                {printerStatusMessage === t('settings.receipt.printerSaved') ? (
                                    <ThemedText style={styles.printerSavedContext}>{printerStatusMessage}</ThemedText>
                                ) : null}
                            </View>
                            <ThemedButton
                                variant="secondary"
                                style={styles.printerActionOutlineButton}
                                labelStyle={[styles.printerActionOutlineText, { color: palette.tint }]}
                                label={printerTestBusy ? t('settings.receipt.testingPrinter') : t('settings.receipt.testPrinter')}
                                disabled={printerTestBusy}
                                onPress={() => void runPrinterTest()}
                            />
                            <ThemedButton
                                variant="secondary"
                                style={styles.printerActionClearButton}
                                labelStyle={[styles.printerActionClearText, { color: palette.danger }]}
                                label={t('settings.receipt.clearPrinter')}
                                onPress={clearPrinterDevice}
                                disabled={printerTestBusy}
                            />
                        </View>
                        {printerStatusMessage && printerStatusMessage !== t('settings.receipt.printerSaved') ? (
                            <View style={[styles.printerStatusCallout, { backgroundColor: `${palette.inputBackground}` }]}>
                                <Ionicons name="information-circle-outline" size={16} color={palette.text} />
                                <ThemedText style={styles.printerStatusText}>{printerStatusMessage}</ThemedText>
                            </View>
                        ) : null}
                        <View style={[styles.printerHintCallout, { backgroundColor: `${palette.tint}14`, borderColor: `${palette.tint}33` }]}>
                            <Ionicons name="information-circle-outline" size={16} color={palette.tint} />
                            <ThemedText style={styles.printerHintText}>{t('settings.receipt.printerHint')}</ThemedText>
                        </View>
                    </ThemedCard>
                ) : null}


            </ScrollView>
            {panel.mounted ? (
                <SlidePanelShell
                    visible={panel.visible}
                    onClose={panel.close}
                    onExited={panel.onExited}
                    width={Math.min(Math.floor(screenWidth * 0.4), 520)}
                    backdropStyle={styles.backdrop}
                    panelStyle={styles.sidePanel}
                >
                    {(panelMode?.type === 'table-create' || panelMode?.type === 'table-edit') ? (
                        <TablePanelForm
                            mode={panelMode.type === 'table-edit' ? { tableId: panelMode.tableId } : 'create'}
                            onClose={panel.close}
                        />
                    ) : panelMode?.type === 'payment-method-add' ? (
                        <PaymentMethodPanelForm onClose={panel.close} />
                    ) : panelMode?.type === 'discount-add-global' ? (
                        <DiscountPanelForm initialScope="global" onClose={panel.close} />
                    ) : panelMode?.type === 'discount-add-product' ? (
                        <DiscountPanelForm initialScope="product" onClose={panel.close} />
                    ) : panelMode?.type === 'discount-edit' ? (
                        <DiscountPanelForm
                            discount={panelMode.discount}
                            onClose={panel.close}
                        />
                    ) : panelMode?.type === 'import' ? (
                        <View style={styles.importPanel}>
                            <View style={[styles.importPanelHeader, { borderBottomColor: palette.border }]}>
                                <View style={styles.importPanelTitle}>
                                    <Ionicons name="cloud-upload-outline" size={20} color={palette.tint} />
                                    <ThemedText type="subtitle">{t('operations.importData')}</ThemedText>
                                </View>
                                <Pressable style={styles.importPanelClose} onPress={panel.close} hitSlop={8}>
                                    <Ionicons name="close" size={22} color={palette.text} />
                                </Pressable>
                            </View>
                            <ScrollView contentContainerStyle={styles.importPanelContent}>
                                <ThemedText style={styles.muted}>{t('operations.importSubtitle')}</ThemedText>
                                <ThemedButton
                                    disabled={importBusy}
                                    label={importBusy ? 'Importando...' : t('operations.importAction')}
                                    onPress={() => void importSeedData()}
                                />
                                <ThemedButton
                                    variant="secondary"
                                    disabled={importBusy}
                                    label={t('operations.downloadTemplate')}
                                    onPress={() => void downloadImportTemplate()}
                                />
                                {importMessage ? <ThemedText style={styles.muted}>{importMessage}</ThemedText> : null}
                                {importIssues.map((issue) => (
                                    <ThemedText key={issue} style={[styles.muted, { color: palette.danger }]}>
                                        {issue}
                                    </ThemedText>
                                ))}
                            </ScrollView>
                        </View>
                    ) : null}
                </SlidePanelShell>
            ) : null}
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
    backdrop: {
        backgroundColor: 'rgba(0,0,0,0.35)',
    },
    sidePanel: {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        borderLeftWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: -4, height: 0 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 12,
    },
    card: {
        gap: 10,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
    },
    rowActions: {
        flexDirection: 'row',
        gap: 8,
    },
    feeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    feeLabel: {
        flex: 1,
    },
    feeInput: {
        width: 120,
        textAlign: 'right',
    },
    muted: {
        opacity: 0.9,
        fontSize: 13,
    },
    modeRow: {
        flexDirection: 'row',
        gap: 8,
    },
    modeChip: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
    },
    logoPreview: {
        width: '100%',
        height: 120,
        borderRadius: 8,
    },
    receiptInput: {
        width: '100%',
        maxWidth: 420,
        alignSelf: 'flex-start',
    },
    receiptCompactControl: {
        width: '100%',
        maxWidth: 420,
        alignSelf: 'flex-start',
        gap: 8,
    },
    receiptTaxInput: {
        width: 140,
        textAlign: 'right',
        alignSelf: 'flex-start',
    },
    receiptPaperWidthRow: {
        flexDirection: 'row',
        gap: 8,
    },
    receiptPaperChip: {
        width: 108,
        alignItems: 'center',
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
    },
    receiptActionRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        alignItems: 'center',
    },
    receiptStatusCallout: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 9,
        maxWidth: 520,
    },
    receiptStatusText: {
        flex: 1,
        fontSize: 12,
    },
    receiptHintCallout: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 9,
        maxWidth: 520,
    },
    receiptHintText: {
        flex: 1,
        fontSize: 12,
        opacity: 0.95,
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
    printerSaveGroup: {
        gap: 6,
        alignItems: 'flex-start',
    },
    printerSavedContext: {
        fontSize: 12,
        opacity: 0.7,
        marginLeft: 2,
        maxWidth: 280,
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
    printerStatusCallout: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 9,
    },
    printerStatusText: {
        flex: 1,
        fontSize: 12,
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
    importPanel: {
        flex: 1,
    },
    importPanelHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
    },
    importPanelTitle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    importPanelClose: {
        padding: 4,
    },
    importPanelContent: {
        padding: 16,
        gap: 12,
    },
});
