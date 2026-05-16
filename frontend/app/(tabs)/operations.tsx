import { Buffer } from 'buffer';
import Constants from 'expo-constants';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Image } from 'expo-image';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { DateInput } from '@/components/ui/date-input';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { PaymentMethodsManager } from '@/components/payment-methods-manager';
import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/ui/themed-button';
import { ThemedCard } from '@/components/ui/themed-card';
import { ThemedChip } from '@/components/ui/themed-chip';
import { ThemedInput } from '@/components/ui/themed-input';
import { ThemedSelect } from '@/components/ui/themed-select';
import { useAppColors } from '@/hooks/use-theme-color';
import { t } from '@/i18n';
import { printService, setupService } from '@/services';
import { useInventoryStore } from '@/stores/inventory';
import { useProductsStore } from '@/stores/products';
import { useSalesStore } from '@/stores/sales';
import { useSettingsStore } from '@/stores/settings';

type Section = 'tables' | 'payment-methods' | 'surcharges' | 'discounts' | 'receipt' | 'import';

export default function OperationsScreen() {
    const palette = useAppColors();
    const router = useRouter();
    const [section, setSection] = useState<Section>('tables');

    const {
        hydrate: hydrateSales,
        tables,
        discounts,
        createDiscount,
        updateDiscount,
        deleteDiscount,
        deleteTable,
    } = useSalesStore();
    const hydrateInventory = useInventoryStore((state) => state.hydrate);
    const { hydrate: hydrateProducts, products } = useProductsStore();
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
    const [discountName, setDiscountName] = useState('');
    const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
    const [discountValue, setDiscountValue] = useState('0');
    const [discountMessage, setDiscountMessage] = useState<string | null>(null);
    const [productDiscountProductId, setProductDiscountProductId] = useState<string | null>(null);
    const [productDiscountName, setProductDiscountName] = useState('');
    const [productDiscountType, setProductDiscountType] = useState<'percentage' | 'fixed'>('percentage');
    const [productDiscountValue, setProductDiscountValue] = useState('0');
    const [productDiscountStartsAt, setProductDiscountStartsAt] = useState<number | null>(() => Math.floor(Date.now() / 1000));
    const [productDiscountEndsAt, setProductDiscountEndsAt] = useState<number | null>(null);
    const [productDiscountMessage, setProductDiscountMessage] = useState<string | null>(null);
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

    const globalDiscounts = discounts.filter((discount) => discount.scope === 'global');
    const productDiscounts = discounts.filter((discount) => discount.scope === 'product');

    const formatDiscountDate = (unix: number | null): string => {
        if (!unix) return t('productForm.discounts.open');
        const date = new Date(unix * 1000);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };

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
        if (section !== 'receipt' || Platform.OS !== 'android') return;
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
        <ScrollView contentContainerStyle={styles.container}>
            <ThemedText type="title">{t('operations.title')}</ThemedText>
            <ThemedText>{t('operations.subtitle')}</ThemedText>

            <View style={styles.tabRow}>
                {(
                    [
                        { key: 'tables', label: t('tables.title') },
                        { key: 'payment-methods', label: t('settings.paymentMethods.title') },
                        { key: 'surcharges', label: t('settings.fees.title') },
                        { key: 'discounts', label: t('products.discounts.title') },
                        { key: 'receipt', label: t('settings.receipt.title') },
                        { key: 'import', label: t('operations.import') },
                    ] as const
                ).map((item) => (
                    <ThemedChip
                        key={item.key}
                        style={styles.sectionButton}
                        label={item.label}
                        active={section === item.key}
                        onPress={() => setSection(item.key)}
                    />
                ))}
            </View>

            {section === 'tables' ? (
                <ThemedCard style={styles.card}>
                    <View style={styles.headerRow}>
                        <ThemedText type="subtitle">{t('tables.list')}</ThemedText>
                        <ThemedButton label={t('tables.add')} onPress={() => router.push('/table-form')} />
                    </View>
                    {tablesMessage ? <ThemedText style={styles.muted}>{tablesMessage}</ThemedText> : null}
                    {tables.length === 0 ? (
                        <ThemedText style={styles.muted}>{t('tables.empty')}</ThemedText>
                    ) : (
                        tables.map((table) => (
                            <View key={table.id} style={[styles.tableRow, { borderColor: palette.border }]}>
                                <View style={styles.tableTextWrap}>
                                    <ThemedText type="defaultSemiBold">{table.name}</ThemedText>
                                    <ThemedText style={styles.muted}>
                                        {table.table_type === 'to-go' ? t('tables.type.toGo') : table.table_type === 'delivery' ? t('tables.type.delivery') : t('tables.type.dineIn')}
                                    </ThemedText>
                                </View>
                                <View style={styles.rowActions}>
                                    <ThemedButton
                                        variant="secondary"
                                        style={styles.smallButton}
                                        label={t('tables.edit')}
                                        onPress={() => router.push({ pathname: '/table-form', params: { id: table.id } })}
                                    />
                                    <ThemedButton
                                        variant="secondary"
                                        style={styles.smallButton}
                                        icon="trash.fill"
                                        accessibilityLabel={t('tables.deleted')}
                                        onPress={async () => {
                                            try {
                                                await deleteTable(table.id);
                                                setTablesMessage(t('tables.deleted'));
                                            } catch {
                                                setTablesMessage(t('sales.error.tableHasLinkedSales'));
                                            }
                                        }}
                                    />
                                </View>
                            </View>
                        ))
                    )}
                </ThemedCard>
            ) : null}

            {section === 'payment-methods' ? (
                <ThemedCard style={styles.card}>
                    <PaymentMethodsManager compact />
                </ThemedCard>
            ) : null}

            {section === 'surcharges' ? (
                <ThemedCard style={styles.card}>
                    <ThemedText type="subtitle">{t('settings.fees.title')}</ThemedText>
                    <ThemedText style={styles.muted}>{t('settings.fees.subtitle')}</ThemedText>
                    <View style={styles.feeRow}>
                        <ThemedText style={styles.feeLabel}>{t('settings.fees.delivery')}</ThemedText>
                        <ThemedInput
                            style={styles.feeInput}
                            keyboardType="decimal-pad"
                            value={deliveryInput}
                            onChangeText={setDeliveryInput}
                            onBlur={commitDeliveryFee}
                            placeholder={t('settings.fees.placeholder')}
                        />
                    </View>
                    <View style={styles.feeRow}>
                        <ThemedText style={styles.feeLabel}>{t('settings.fees.toGo')}</ThemedText>
                        <ThemedInput
                            style={styles.feeInput}
                            keyboardType="decimal-pad"
                            value={toGoInput}
                            onChangeText={setToGoInput}
                            onBlur={commitToGoFee}
                            placeholder={t('settings.fees.placeholder')}
                        />
                    </View>
                </ThemedCard>
            ) : null}

            {section === 'discounts' ? (
                <ThemedCard style={styles.card}>
                    <ThemedText type="subtitle">{t('products.discounts.title')}</ThemedText>
                    <ThemedText style={styles.muted}>{t('products.discounts.subtitle')}</ThemedText>
                    <ThemedInput value={discountName} onChangeText={setDiscountName} placeholder={t('products.discounts.namePlaceholder')} />
                    <ThemedSelect
                        value={discountType}
                        onValueChange={(value) => setDiscountType(value as 'percentage' | 'fixed')}
                        items={[
                            { label: t('products.discounts.typePercentage'), value: 'percentage' },
                            { label: t('products.discounts.typeFixed'), value: 'fixed' },
                        ]}
                    />
                    <ThemedInput
                        value={discountValue}
                        onChangeText={setDiscountValue}
                        keyboardType="decimal-pad"
                        placeholder={t('products.discounts.valuePlaceholder')}
                    />
                    <ThemedButton
                        label={t('products.discounts.create')}
                        onPress={async () => {
                            const value = Number(discountValue);
                            if (!discountName.trim() || !Number.isFinite(value) || value <= 0) {
                                setDiscountMessage(t('products.discounts.invalid'));
                                return;
                            }
                            await createDiscount({
                                name: discountName.trim(),
                                scope: 'global',
                                productId: null,
                                type: discountType,
                                value,
                                startsAt: 0,
                                endsAt: null,
                                isActive: true,
                            });
                            setDiscountName('');
                            setDiscountType('percentage');
                            setDiscountValue('0');
                            setDiscountMessage(t('products.discounts.created'));
                        }}
                    />
                    {discountMessage ? <ThemedText style={styles.muted}>{discountMessage}</ThemedText> : null}
                    {globalDiscounts.map((discount) => (
                        <View key={discount.id} style={[styles.tableRow, { borderColor: palette.border }]}>
                            <View style={styles.tableTextWrap}>
                                <ThemedText type="defaultSemiBold">{discount.name}</ThemedText>
                                <ThemedText style={styles.muted}>
                                    {discount.type === 'percentage' ? `${discount.value}%` : `$${discount.value.toFixed(2)}`} · {discount.isActive ? t('products.discounts.active') : t('products.discounts.inactive')}
                                </ThemedText>
                            </View>
                            <View style={styles.rowActions}>
                                <ThemedButton
                                    variant="secondary"
                                    style={styles.smallButton}
                                    label={discount.isActive ? t('products.discounts.deactivate') : t('products.discounts.activate')}
                                    onPress={() => void updateDiscount({
                                        id: discount.id,
                                        name: discount.name,
                                        scope: 'global',
                                        productId: null,
                                        type: discount.type,
                                        value: discount.value,
                                        startsAt: 0,
                                        endsAt: null,
                                        isActive: !discount.isActive,
                                    })}
                                />
                                <ThemedButton
                                    variant="secondary"
                                    style={styles.smallButton}
                                    label={t('products.discounts.delete')}
                                    onPress={() => void deleteDiscount(discount.id)}
                                />
                            </View>
                        </View>
                    ))}

                    <View style={[styles.sectionDivider, { borderTopColor: palette.border }]} />
                    <ThemedText type="defaultSemiBold" style={styles.discountSubtitle}>{t('products.discounts.productSection')}</ThemedText>
                    <ThemedText style={styles.muted}>{t('products.discounts.productSubtitle')}</ThemedText>
                    <ThemedSelect
                        value={productDiscountProductId ?? ''}
                        onValueChange={(v) => setProductDiscountProductId(v || null)}
                        items={products.map((p) => ({ label: p.name, value: p.id }))}
                        placeholder={t('products.discounts.selectProduct')}
                        modalTitle={t('products.discounts.selectProduct')}
                    />
                    <ThemedInput value={productDiscountName} onChangeText={setProductDiscountName} placeholder={t('products.discounts.namePlaceholder')} />
                    <ThemedSelect
                        value={productDiscountType}
                        onValueChange={(value) => setProductDiscountType(value as 'percentage' | 'fixed')}
                        items={[
                            { label: t('products.discounts.typePercentage'), value: 'percentage' },
                            { label: t('products.discounts.typeFixed'), value: 'fixed' },
                        ]}
                    />
                    <ThemedInput
                        value={productDiscountValue}
                        onChangeText={setProductDiscountValue}
                        keyboardType="decimal-pad"
                        placeholder={t('products.discounts.valuePlaceholder')}
                    />
                    <View style={styles.dateRow}>
                        <View style={styles.dateField}>
                            <DateInput value={productDiscountStartsAt} onChangeValue={setProductDiscountStartsAt} placeholder={t('productForm.discounts.startDate')} />
                        </View>
                        <View style={styles.dateField}>
                            <DateInput value={productDiscountEndsAt} onChangeValue={setProductDiscountEndsAt} endOfDay placeholder={t('productForm.discounts.endDate')} />
                        </View>
                    </View>
                    <ThemedButton
                        label={t('products.discounts.createProduct')}
                        onPress={async () => {
                            const value = Number(productDiscountValue);
                            if (!productDiscountProductId || !productDiscountName.trim() || !productDiscountStartsAt || !Number.isFinite(value) || value <= 0) {
                                setProductDiscountMessage(t('products.discounts.productInvalid'));
                                return;
                            }
                            await createDiscount({
                                name: productDiscountName.trim(),
                                scope: 'product',
                                productId: productDiscountProductId,
                                type: productDiscountType,
                                value,
                                startsAt: productDiscountStartsAt,
                                endsAt: productDiscountEndsAt,
                                isActive: true,
                            });
                            setProductDiscountProductId(null);
                            setProductDiscountName('');
                            setProductDiscountType('percentage');
                            setProductDiscountValue('0');
                            setProductDiscountStartsAt(Math.floor(Date.now() / 1000));
                            setProductDiscountEndsAt(null);
                            setProductDiscountMessage(t('products.discounts.created'));
                        }}
                    />
                    {productDiscountMessage ? <ThemedText style={styles.muted}>{productDiscountMessage}</ThemedText> : null}
                    {productDiscounts.map((discount) => {
                        const productName = products.find((p) => p.id === discount.productId)?.name ?? discount.productId;
                        return (
                            <View key={discount.id} style={[styles.tableRow, { borderColor: palette.border }]}>
                                <View style={styles.tableTextWrap}>
                                    <ThemedText type="defaultSemiBold">{discount.name}</ThemedText>
                                    <ThemedText style={styles.muted}>
                                        {productName} · {discount.type === 'percentage' ? `${discount.value}%` : `$${discount.value.toFixed(2)}`} · {formatDiscountDate(discount.startsAt)} {t('productForm.discounts.to')} {formatDiscountDate(discount.endsAt)} · {discount.isActive ? t('products.discounts.active') : t('products.discounts.inactive')}
                                    </ThemedText>
                                </View>
                                <View style={styles.rowActions}>
                                    <ThemedButton
                                        variant="secondary"
                                        style={styles.smallButton}
                                        label={discount.isActive ? t('products.discounts.deactivate') : t('products.discounts.activate')}
                                        onPress={() => void updateDiscount({
                                            id: discount.id,
                                            name: discount.name,
                                            scope: 'product',
                                            productId: discount.productId,
                                            type: discount.type,
                                            value: discount.value,
                                            startsAt: discount.startsAt,
                                            endsAt: discount.endsAt,
                                            isActive: !discount.isActive,
                                        })}
                                    />
                                    <ThemedButton
                                        variant="secondary"
                                        style={styles.smallButton}
                                        label={t('products.discounts.delete')}
                                        onPress={() => void deleteDiscount(discount.id)}
                                    />
                                </View>
                            </View>
                        );
                    })}
                </ThemedCard>
            ) : null}

            {section === 'receipt' ? (
                <ThemedCard style={styles.card}>
                    <ThemedText type="subtitle">{t('settings.receipt.title')}</ThemedText>
                    <ThemedText style={styles.muted}>{t('settings.receipt.subtitle')}</ThemedText>
                    <ThemedInput value={businessNameInput} placeholder={t('settings.receipt.businessName')} onChangeText={setBusinessNameInput} onBlur={commitBusinessInfo} />
                    <ThemedInput value={businessAddressInput} placeholder={t('settings.receipt.businessAddress')} onChangeText={setBusinessAddressInput} onBlur={commitBusinessInfo} />
                    <ThemedInput value={businessPhoneInput} placeholder={t('settings.receipt.businessPhone')} onChangeText={setBusinessPhoneInput} onBlur={commitBusinessInfo} />
                    <ThemedInput value={businessNitInput} placeholder={t('settings.receipt.businessNit')} onChangeText={setBusinessNitInput} onBlur={commitBusinessInfo} />
                    <View style={styles.rowActions}>
                        <ThemedButton variant="secondary" label={logoBusy ? `${t('settings.receipt.pickLogo')}...` : t('settings.receipt.pickLogo')} onPress={() => void pickBusinessLogo()} disabled={logoBusy} />
                        {businessLogoUriInput ? (
                            <ThemedButton variant="secondary" label={t('settings.receipt.removeLogo')} onPress={removeBusinessLogo} disabled={logoBusy} />
                        ) : null}
                    </View>
                    {businessLogoUriInput ? (
                        <Image source={{ uri: businessLogoUriInput }} style={styles.logoPreview} contentFit="contain" />
                    ) : (
                        <ThemedText style={styles.muted}>{t('settings.receipt.noLogo')}</ThemedText>
                    )}
                    {logoMessage ? <ThemedText style={[styles.muted, { color: palette.danger }]}>{logoMessage}</ThemedText> : null}
                    <ThemedInput value={receiptFooterInput} placeholder={t('settings.receipt.footerMessage')} onChangeText={setReceiptFooterInput} onBlur={commitBusinessInfo} />
                    <View style={styles.feeRow}>
                        <ThemedText style={styles.feeLabel}>{t('settings.receipt.taxRate')}</ThemedText>
                        <ThemedInput style={styles.feeInput} keyboardType="decimal-pad" value={taxRateInput} onChangeText={setTaxRateInput} onBlur={commitTaxRate} placeholder="8.00" />
                    </View>
                    <ThemedText style={styles.muted}>{t('settings.receipt.paperWidth')}</ThemedText>
                    <View style={styles.modeRow}>
                        {[58, 80].map((width) => {
                            const isActive = printerPaperWidth === width;
                            return (
                                <Pressable
                                    key={width}
                                    style={[styles.modeChip, { backgroundColor: isActive ? palette.tint : palette.inputBackground, borderColor: isActive ? palette.tint : palette.border }]}
                                    onPress={() => setPrinterPaperWidth(width as 58 | 80)}>
                                    <ThemedText style={{ color: isActive ? palette.card : palette.text, fontWeight: isActive ? '700' : '400' }}>
                                        {width}mm
                                    </ThemedText>
                                </Pressable>
                            );
                        })}
                    </View>
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
                            <ThemedButton variant="secondary" label={bondedPrintersBusy ? t('settings.receipt.refreshingPrinters') : t('settings.receipt.refreshPrinters')} disabled={bondedPrintersBusy} onPress={() => void refreshBondedPrinters()} />
                        </>
                    ) : null}
                    <ThemedInput value={printerNameInput} placeholder={t('settings.receipt.printerName')} onChangeText={setPrinterNameInput} onBlur={commitPrinterDevice} />
                    <ThemedInput value={printerAddressInput} placeholder={t('settings.receipt.printerAddress')} onChangeText={setPrinterAddressInput} onBlur={commitPrinterDevice} autoCapitalize="characters" />
                    <View style={styles.rowActions}>
                        <ThemedButton variant="secondary" label={t('settings.receipt.savePrinter')} onPress={commitPrinterDevice} />
                        <ThemedButton variant="secondary" label={printerTestBusy ? t('settings.receipt.testingPrinter') : t('settings.receipt.testPrinter')} disabled={printerTestBusy} onPress={() => void runPrinterTest()} />
                        <ThemedButton variant="secondary" label={t('settings.receipt.clearPrinter')} onPress={clearPrinterDevice} disabled={printerTestBusy} />
                    </View>
                    <ThemedText style={styles.muted}>{t('settings.receipt.printerHint')}</ThemedText>
                    {printerStatusMessage ? <ThemedText style={styles.muted}>{printerStatusMessage}</ThemedText> : null}
                    <ThemedText style={styles.muted}>{t('settings.app.title')}: {Constants.expoConfig?.version ?? '1.0.0'}</ThemedText>
                </ThemedCard>
            ) : null}

            {section === 'import' ? (
                <ThemedCard style={styles.card}>
                    <ThemedText type="subtitle">{t('operations.import')}</ThemedText>
                    <ThemedText style={styles.muted}>{t('operations.importSubtitle')}</ThemedText>
                    <ThemedButton disabled={importBusy} label={importBusy ? 'Importando...' : t('operations.importAction')} onPress={importSeedData} />
                    <ThemedButton variant="secondary" disabled={importBusy} label={t('operations.downloadTemplate')} onPress={downloadImportTemplate} />
                    {importMessage ? <ThemedText style={styles.muted}>{importMessage}</ThemedText> : null}
                    {importIssues.map((issue) => (
                        <ThemedText key={issue} style={[styles.muted, { color: palette.danger }]}>{issue}</ThemedText>
                    ))}
                </ThemedCard>
            ) : null}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        gap: 12,
    },
    tabRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    sectionButton: {
        borderRadius: 10,
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
    tableRow: {
        borderWidth: 1,
        borderRadius: 10,
        padding: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 10,
    },
    tableTextWrap: {
        flex: 1,
        gap: 2,
    },
    smallButton: {
        paddingVertical: 7,
        paddingHorizontal: 10,
    },
    sectionDivider: {
        borderTopWidth: 1,
        marginTop: 4,
        marginBottom: 4,
    },
    discountSubtitle: {
        fontSize: 14,
        marginTop: 4,
    },
    dateRow: {
        flexDirection: 'row',
        gap: 8,
    },
    dateField: {
        flex: 1,
    },
    logoPreview: {
        width: '100%',
        height: 120,
        borderRadius: 8,
    },
});
