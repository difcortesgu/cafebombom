/**
 * Desktop self-update service.
 *
 * Checks GitHub for a newer release and applies it in place. Because the app is
 * a single compiled Bun binary (Linux) served alongside an Inno Setup installer
 * (Windows), the update strategy differs per platform:
 *
 *  - Linux: download the release tarball, then a detached helper waits for this
 *    process to exit, extracts the new files over the install dir, and relaunches.
 *  - Windows: download the Inno Setup installer, then a detached helper waits for
 *    this process to exit, runs the installer silently, and relaunches.
 *
 * In both cases the running process can't replace its own files, so the work is
 * handed to a short-lived helper script and this process exits.
 */

import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { logger } from '../utils/logger';

const GITHUB_REPO = process.env.GITHUB_REPO || 'difcortesgu/cafebombom';

const ASSET_NAMES = {
  win32: 'Instalar_CafeBomBom_Windows.exe',
  linux: 'Instalador_CafeBomBom_Linux.tar.gz',
} as const;

export const APP_VERSION = process.env.APP_VERSION || 'dev';

type Platform = keyof typeof ASSET_NAMES;

type GitHubAsset = { name: string; browser_download_url: string };
type GitHubRelease = {
  tag_name: string;
  html_url: string;
  body: string | null;
  assets: GitHubAsset[];
};

export type UpdateCheckResult = {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  releaseUrl: string;
  notes: string | null;
};

function parseVersion(version: string): [number, number, number] {
  const core = version.trim().replace(/^v/i, '').split(/[-+]/)[0];
  const p = core.split('.').map((n) => parseInt(n, 10));
  return [p[0] || 0, p[1] || 0, p[2] || 0];
}

function isNewer(latest: string, current: string): boolean {
  const a = parseVersion(latest);
  const b = parseVersion(current);
  for (let i = 0; i < 3; i++) {
    if (a[i] > b[i]) return true;
    if (a[i] < b[i]) return false;
  }
  return false;
}

function currentPlatform(): Platform {
  if (process.platform === 'win32') return 'win32';
  if (process.platform === 'linux') return 'linux';
  throw new Error(`Self-update is not supported on platform "${process.platform}".`);
}

async function fetchLatestRelease(): Promise<GitHubRelease> {
  const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'CafeBomBom-Updater' },
  });
  if (!response.ok) {
    throw new Error(`GitHub returned HTTP ${response.status}`);
  }
  return (await response.json()) as GitHubRelease;
}

export async function checkForUpdate(): Promise<UpdateCheckResult> {
  const release = await fetchLatestRelease();
  const latestVersion = release.tag_name.replace(/^v/i, '');
  const updateAvailable = isNewer(latestVersion, APP_VERSION);
  if (updateAvailable) {
    logger.info(`[UPDATE] Actualización disponible: v${APP_VERSION} → v${latestVersion}`);
  }
  return {
    currentVersion: APP_VERSION,
    latestVersion,
    updateAvailable,
    releaseUrl: release.html_url,
    notes: release.body,
  };
}

/** Streams a URL to a local file path. */
async function downloadTo(url: string, destPath: string): Promise<void> {
  const response = await fetch(url, { headers: { 'User-Agent': 'CafeBomBom-Updater' } });
  if (!response.ok || !response.body) {
    throw new Error(`Download failed with HTTP ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.promises.writeFile(destPath, buffer);
}

/**
 * Downloads the latest release asset and spawns a detached helper that applies
 * it once this process exits, then schedules this process to exit.
 *
 * Returns the version being installed. Throws before exiting if no update is
 * available or the download fails.
 */
export async function applyUpdate(): Promise<{ latestVersion: string }> {
  const platform = currentPlatform();
  const release = await fetchLatestRelease();
  const latestVersion = release.tag_name.replace(/^v/i, '');

  if (!isNewer(latestVersion, APP_VERSION)) {
    throw new Error('Already on the latest version.');
  }

  const assetName = ASSET_NAMES[platform];
  const asset = release.assets.find((a) => a.name === assetName);
  if (!asset) {
    throw new Error(`Release v${latestVersion} has no asset named ${assetName}.`);
  }

  const appExe = process.execPath; // the running compiled binary
  const appDir = path.dirname(appExe);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cafebombom-update-'));
  const downloadPath = path.join(tmpDir, assetName);

  logger.info(`[UPDATE] Descargando v${latestVersion} desde ${asset.browser_download_url}`);
  await downloadTo(asset.browser_download_url, downloadPath);
  logger.info(`[UPDATE] Descarga completada en ${downloadPath}`);

  const pid = process.pid;
  if (platform === 'linux') {
    spawnLinuxHelper({ appDir, appExe, tarball: downloadPath, tmpDir, pid });
  } else {
    spawnWindowsHelper({ appExe, installer: downloadPath, tmpDir, pid });
  }

  // Give the HTTP response time to flush before the process goes away.
  setTimeout(() => {
    logger.info('[UPDATE] Cerrando para aplicar la actualización…');
    process.exit(0);
  }, 1500);

  return { latestVersion };
}

function spawnLinuxHelper(opts: { appDir: string; appExe: string; tarball: string; tmpDir: string; pid: number }) {
  const scriptPath = path.join(opts.tmpDir, 'apply-update.sh');
  const script = `#!/bin/bash
set -e
APP_DIR="${opts.appDir}"
APP_EXE="${opts.appExe}"
TARBALL="${opts.tarball}"
PID="${opts.pid}"

# Esperar a que la app se cierre
while kill -0 "$PID" 2>/dev/null; do sleep 0.5; done

EXTRACT_DIR="$(mktemp -d)"
tar -xzf "$TARBALL" -C "$EXTRACT_DIR"
cp -Rf "$EXTRACT_DIR"/* "$APP_DIR/"
chmod +x "$APP_EXE"
rm -rf "$EXTRACT_DIR" "${opts.tmpDir}"

# Relanzar
cd "$APP_DIR"
nohup "$APP_EXE" >/dev/null 2>&1 &
`;
  fs.writeFileSync(scriptPath, script, { mode: 0o755 });
  const child = spawn('bash', [scriptPath], { detached: true, stdio: 'ignore' });
  child.unref();
}

function spawnWindowsHelper(opts: { appExe: string; installer: string; tmpDir: string; pid: number }) {
  const scriptPath = path.join(opts.tmpDir, 'apply-update.bat');
  const appDir = path.dirname(opts.appExe);
  const script = `@echo off
:waitloop
tasklist /FI "PID eq ${opts.pid}" 2>NUL | find "${opts.pid}" >NUL
if not errorlevel 1 (
  timeout /t 1 /nobreak >NUL
  goto waitloop
)
"${opts.installer}" /VERYSILENT /SUPPRESSMSGBOXES /NORESTART
cd /d "${appDir}"
start "" "${opts.appExe}"
del "${opts.installer}"
`;
  fs.writeFileSync(scriptPath, script);
  const child = spawn('cmd.exe', ['/c', scriptPath], { detached: true, stdio: 'ignore', windowsHide: true });
  child.unref();
}
