import { logger } from './logger';

export class WebUSBPrinter {
    private device: USBDevice | null = null;
    private endpointNumber: number | null = null;
    private interfaceNumber: number | null = null;
    private packetSize = 64;

    async connect(): Promise<void> {
        if (typeof navigator === 'undefined' || !navigator.usb) {
            throw new Error('WebUSB is not supported on this browser. Use Chrome or Edge.');
        }

        try {
            const pairedDevices = await navigator.usb.getDevices();

            if (pairedDevices.length > 0) {
                this.device = pairedDevices[0];
            } else {
                this.device = await navigator.usb.requestDevice({ filters: [] });
            }

            await this.device.open();
            if (this.device.configuration === null) {
                await this.device.selectConfiguration(1);
            }

            if (!this.device.configuration) {
                throw new Error('Device configuration is null after selecting configuration.');
            }

            const candidate = this.device.configuration.interfaces
                .map((iface) => {
                    const endpoint = iface.alternates[0]?.endpoints.find((e) => e.direction === 'out');
                    return endpoint ? { interfaceNumber: iface.interfaceNumber, endpoint } : null;
                })
                .find((entry) => entry !== null);

            if (!candidate) {
                throw new Error('No out endpoint found on this USB device.');
            }

            await this.device.claimInterface(candidate.interfaceNumber);

            this.interfaceNumber = candidate.interfaceNumber;
            this.endpointNumber = candidate.endpoint.endpointNumber;
            this.packetSize = candidate.endpoint.packetSize || 64;
        } catch (error: any) {
            this.device = null;
            this.interfaceNumber = null;
            this.endpointNumber = null;
            logger.error('WebUSB Connection Error:', error);
            if (error.message.includes('claim')) {
                throw new Error('Driver error. Remember to use Zadig to change to WinUSB.');
            }
            throw new Error("Couldn't connect using WebUSB: " + error.message);
        }
    }

    async print(payload: Uint8Array): Promise<void> {
        // Si no está conectada, intentamos conectarla silenciosamente antes de imprimir
        if (!this.device || !this.endpointNumber) {
            await this.connect();
        }

        if (this.device && this.endpointNumber) {
            const chunkSize = Math.max(this.packetSize * 8, 256);
            for (let offset = 0; offset < payload.length; offset += chunkSize) {
                const chunk = payload.subarray(offset, Math.min(offset + chunkSize, payload.length));
                const result = await this.device.transferOut(this.endpointNumber, chunk as BufferSource);
                if (result.status !== 'ok') {
                    throw new Error(`WebUSB write failed with status: ${result.status}`);
                }
            }
        }
    }
}
