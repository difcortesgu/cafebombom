/**
 * Update-check service (shared by desktop web build and the Android client).
 *
 * Compares the running app version against the latest GitHub Release and reports
 * whether a newer version is available, along with the per-platform download URLs.
 *
 * - On web (the desktop Bun build) the running version comes from the backend's
 *   `/api/version` endpoint, since the binary is the source of truth there.
 * - On native (Android) it comes from the bundled app config via expo-constants.
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { apiClient } from './api-client';

// owner/name of the GitHub repository that publishes the releases.
const GITHUB_REPO = process.env.EXPO_PUBLIC_GITHUB_REPO || 'difcortesgu/cafebombom';

// Asset file names produced by the release pipeline (.github/workflows/main.yml).
const ASSET_NAMES = {
  windows: 'Instalar_CafeBomBom_Windows.exe',
  linux: 'Instalador_CafeBomBom_Linux.tar.gz',
  apk: 'app-release.apk',
} as const;

export type ReleasePlatform = keyof typeof ASSET_NAMES;

export type UpdateAssets = {
  [K in ReleasePlatform]?: string;
};

export type UpdateInfo = {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  releaseUrl: string;
  publishedAt: string | null;
  notes: string | null;
  assets: UpdateAssets;
};

type GitHubAsset = {
  name: string;
  browser_download_url: string;
};

type GitHubRelease = {
  tag_name: string;
  html_url: string;
  published_at: string | null;
  body: string | null;
  assets: GitHubAsset[];
};

/**
 * Strips a leading `v` and any build/pre-release suffix, returning the numeric
 * `[major, minor, patch]` tuple. Missing segments default to 0.
 */
function parseVersion(version: string): [number, number, number] {
  const cleaned = version.trim().replace(/^v/i, '');
  const core = cleaned.split(/[-+]/)[0];
  const parts = core.split('.').map((n) => parseInt(n, 10));
  return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
}

/**
 * Returns true when `latest` is strictly newer than `current` (semver-ish,
 * numeric major.minor.patch only).
 */
export function isNewerVersion(latest: string, current: string): boolean {
  const a = parseVersion(latest);
  const b = parseVersion(current);
  for (let i = 0; i < 3; i++) {
    if (a[i] > b[i]) return true;
    if (a[i] < b[i]) return false;
  }
  return false;
}

/** Resolves the version of the currently running app for this platform. */
export async function getCurrentVersion(): Promise<string> {
  if (Platform.OS === 'web') {
    try {
      const res = await apiClient.get<{ version: string }>('/version');
      return res.version;
    } catch {
      return 'dev';
    }
  }

  return Constants.expoConfig?.version ?? 'dev';
}

/** Maps a release's assets to known platform download URLs by file name. */
function mapAssets(assets: GitHubAsset[]): UpdateAssets {
  const result: UpdateAssets = {};
  for (const [platform, fileName] of Object.entries(ASSET_NAMES) as [ReleasePlatform, string][]) {
    const match = assets.find((a) => a.name === fileName);
    if (match) {
      result[platform] = match.browser_download_url;
    }
  }
  return result;
}

/** Fetches the latest published release from GitHub. Returns null on failure. */
export async function fetchLatestRelease(signal?: AbortSignal): Promise<GitHubRelease | null> {
  try {
    const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json' },
      signal,
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as GitHubRelease;
  } catch {
    return null;
  }
}

/**
 * Checks GitHub for a newer release and returns the comparison result, or null
 * if the latest release could not be retrieved.
 */
export async function checkForUpdate(signal?: AbortSignal): Promise<UpdateInfo | null> {
  const [currentVersion, release] = await Promise.all([
    getCurrentVersion(),
    fetchLatestRelease(signal),
  ]);

  if (!release) {
    return null;
  }

  const latestVersion = release.tag_name.replace(/^v/i, '');

  return {
    currentVersion,
    latestVersion,
    updateAvailable: isNewerVersion(latestVersion, currentVersion),
    releaseUrl: release.html_url,
    publishedAt: release.published_at,
    notes: release.body,
    assets: mapAssets(release.assets),
  };
}

/**
 * Triggers the desktop (web build) self-update on the backend. The backend
 * downloads the latest release, then exits to let a helper swap files and
 * relaunch — so this request may not return a normal response as the server
 * goes down. Resolves once the update was accepted.
 */
export async function applyDesktopUpdate(): Promise<void> {
  await apiClient.post('/update/apply');
}

/** The download URL appropriate for the current platform, if present. */
export function assetForCurrentPlatform(assets: UpdateAssets): string | undefined {
  if (Platform.OS === 'android') {
    return assets.apk;
  }
  // Web build runs on desktop; the OS-specific installer is chosen by the UI,
  // but default to whichever desktop asset exists.
  return assets.windows ?? assets.linux;
}
