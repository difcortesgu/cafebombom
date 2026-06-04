import { networkInterfaces } from 'os';

type PairingInfo = {
    ip: string | null;
    port: number;
    payload: string | null;
    url: string | null;
};

export function getLocalIpv4Address(): string | null {
    const interfaces = networkInterfaces();

    for (const iface of Object.values(interfaces)) {
        if (!iface) continue;

        for (const address of iface) {
            if (address.family === 'IPv4' && !address.internal) {
                return address.address;
            }
        }
    }

    return null;
}

export function resolvePairingInfo(portInput: number | string): PairingInfo {
    const parsedPort = Number.parseInt(String(portInput), 10);
    const port = Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : 3000;
    const ip = getLocalIpv4Address();

    if (!ip) {
        return {
            ip: null,
            port,
            payload: null,
            url: null,
        };
    }

    return {
        ip,
        port,
        payload: `${ip}:${port}`,
        url: `http://${ip}:${port}`,
    };
}
