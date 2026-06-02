import { apiClient } from './api-client';

export type PairingInfo = {
    ip: string | null;
    port: number;
    payload: string | null;
    url: string | null;
};

export type ConnectionTarget = {
    host: string;
    port: number;
    baseUrl: string;
};

function withTimeout(signalMs: number): AbortSignal {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), signalMs);
    return controller.signal;
}

export function buildApiBaseUrl(host: string, port: number): string {
    const cleanHost = host.trim();
    return `http://${cleanHost}:${port}/api`;
}

export function parsePairingPayload(payload: string): ConnectionTarget | null {
    const trimmed = payload.trim();
    const match = trimmed.match(/^([a-zA-Z0-9.-]+):(\d{2,5})$/);
    if (!match) {
        return null;
    }

    const host = match[1].trim();
    const port = Number.parseInt(match[2], 10);
    if (!host || !Number.isFinite(port) || port < 1 || port > 65535) {
        return null;
    }

    return {
        host,
        port,
        baseUrl: buildApiBaseUrl(host, port),
    };
}

export async function validateSetupStatus(baseUrl: string): Promise<void> {
    const response = await fetch(`${baseUrl}/setup/status`, {
        method: 'GET',
        signal: withTimeout(5000),
    });

    if (!response.ok) {
        throw new Error(`No se pudo validar la conexion (${response.status}).`);
    }
}

export async function saveConnection(target: ConnectionTarget): Promise<void> {
    await validateSetupStatus(target.baseUrl);
    await apiClient.persistBaseUrl(target.baseUrl);
}

export async function loadPairingInfoFromBackend(): Promise<PairingInfo> {
    return apiClient.get<PairingInfo>('/pairing/info');
}
