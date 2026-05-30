export type PrinterTarget = {
    name?: string;
    address?: string;
};

export type PrinterStatus = {
    connected: boolean;
    printerName?: string;
    mode: 'web-print' | 'native-pending' | 'native-ready';
};

type BluetoothClassicDevice = {
    name?: string;
    address?: string;
    id?: string;
};

export type BluetoothClassicModule = {
    isBluetoothAvailable: () => Promise<boolean>;
    isBluetoothEnabled: () => Promise<boolean>;
    requestBluetoothEnabled: () => Promise<boolean>;
    getBondedDevices: () => Promise<BluetoothClassicDevice[]>;
    isDeviceConnected: (address: string) => Promise<boolean>;
    connectToDevice: (address: string, options?: Record<string, unknown>) => Promise<BluetoothClassicDevice>;
    writeToDevice: (address: string, message: string | Buffer, encoding?: BufferEncoding) => Promise<boolean>;
    disconnectFromDevice: (address: string) => Promise<boolean>;
};
