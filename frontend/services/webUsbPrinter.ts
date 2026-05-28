export class WebUSBPrinter {
    private device: USBDevice | null = null;
    private endpointNumber: number | null = null;

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
            await this.device.claimInterface(0);

            if (!this.device.configuration) {
                throw new Error('Device configuration is null after selecting configuration.');
            }

            const interfaceInfo = this.device.configuration.interfaces[0];
            const endpoint = interfaceInfo.alternates[0].endpoints.find(e => e.direction === 'out');

            if (!endpoint) {
                throw new Error('No out endpoint found on this USB device.');
            }

            this.endpointNumber = endpoint.endpointNumber;
        } catch (error: any) {
            this.device = null;
            console.error('WebUSB Connection Error:', error);
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
            await this.device.transferOut(this.endpointNumber, payload as BufferSource);
        }
    }
}
