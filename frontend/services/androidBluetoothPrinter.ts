import type { BluetoothClassicModule, PrinterTarget } from '@/types/printer';
import { Buffer } from 'buffer';
import { PermissionsAndroid, Platform } from 'react-native';


export class AndroidBluetoothPrinter {
    private modulePromise: Promise<BluetoothClassicModule> | null = null;

    public hasConfiguredPrinter(target?: PrinterTarget): boolean {
        return Boolean(target?.address && target.address.trim().length > 0);
    }

    private async getModule(): Promise<BluetoothClassicModule> {
        if (Platform.OS !== 'android') {
            throw new Error('Bluetooth clasico solo esta disponible en Android.');
        }
        if (!this.modulePromise) {
            this.modulePromise = import('react-native-bluetooth-classic').then(
                (m) => m.default as unknown as BluetoothClassicModule
            );
        }
        return this.modulePromise;
    }

    private async ensurePermissions(): Promise<void> {
        if (Platform.OS !== 'android' || Platform.Version < 31) return;

        const granted = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        ]);

        const connectGranted = granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED;
        const scanGranted = granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.GRANTED;

        if (!connectGranted || !scanGranted) {
            throw new Error('Se requieren permisos de Bluetooth para usar la impresora. Otorgalos en los ajustes de la app.');
        }
    }

    private async ensureEnabled(bluetooth: BluetoothClassicModule): Promise<void> {
        const available = await bluetooth.isBluetoothAvailable();
        if (!available) throw new Error('Este dispositivo no soporta Bluetooth clasico.');

        const enabled = await bluetooth.isBluetoothEnabled();
        if (enabled) return;

        const turnedOn = await bluetooth.requestBluetoothEnabled();
        if (!turnedOn) throw new Error('Activa Bluetooth para imprimir recibos.');
    }

    async print(payload: Uint8Array, target: PrinterTarget): Promise<void> {
        await this.ensurePermissions();
        const bluetooth = await this.getModule();
        await this.ensureEnabled(bluetooth);

        const address = target.address?.trim() ?? '';
        if (!address) {
            throw new Error('No hay direccion Bluetooth configurada para la impresora.');
        }

        const isConnected = await bluetooth.isDeviceConnected(address).catch(() => false);
        if (!isConnected) {
            await bluetooth.connectToDevice(address, {
                connectorType: 'rfcomm',
                delimiter: '',
                charset: 'ascii',
            });
        }

        const wrote = await bluetooth.writeToDevice(address, Buffer.from(payload));
        if (!wrote) {
            throw new Error('No se pudo enviar el ticket a la impresora Bluetooth.');
        }

        await bluetooth.disconnectFromDevice(address).catch(() => false);
    }

    async getBondedPrinters(): Promise<PrinterTarget[]> {
        if (Platform.OS !== 'android') return [];

        await this.ensurePermissions();
        const bluetooth = await this.getModule();
        await this.ensureEnabled(bluetooth);

        const devices = await bluetooth.getBondedDevices();
        return devices
            .map((device) => ({
                name: (device.name ?? '').trim(),
                address: (device.address ?? device.id ?? '').trim(),
            }))
            .filter((device) => device.address.length > 0);
    }

    async isReady(target?: PrinterTarget): Promise<boolean> {
        if (!this.hasConfiguredPrinter(target)) return false;
        try {
            await this.ensurePermissions();
            const bluetooth = await this.getModule();
            await this.ensureEnabled(bluetooth);
            return true;
        } catch {
            return false;
        }
    }
}
