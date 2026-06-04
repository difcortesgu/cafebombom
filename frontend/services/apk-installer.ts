/**
 * Android APK download + install helper.
 *
 * Downloads a release APK to local storage and hands it to the system package
 * installer via an intent. Android only — calling on other platforms throws.
 */

import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import { Platform } from 'react-native';

const APK_MIME = 'application/vnd.android.package-archive';
// FLAG_GRANT_READ_URI_PERMISSION — lets the installer read our content:// URI.
const FLAG_GRANT_READ_URI_PERMISSION = 1;

export type DownloadProgress = {
  /** 0..1 fraction of the download completed. */
  progress: number;
  totalBytes: number;
  writtenBytes: number;
};

/**
 * Downloads the APK at `url` and launches the system installer.
 *
 * @param onProgress optional callback invoked with download progress.
 * @throws if not running on Android, or if the download fails.
 */
export async function downloadAndInstallApk(
  url: string,
  onProgress?: (p: DownloadProgress) => void,
): Promise<void> {
  if (Platform.OS !== 'android') {
    throw new Error('APK installation is only supported on Android.');
  }

  const targetUri = `${FileSystem.cacheDirectory}CafeBomBom-update.apk`;

  // Remove any stale download so the installer never sees a half-written file.
  try {
    await FileSystem.deleteAsync(targetUri, { idempotent: true });
  } catch {
    // Best-effort cleanup; ignore.
  }

  const downloadResumable = FileSystem.createDownloadResumable(
    url,
    targetUri,
    {},
    (data) => {
      if (!onProgress) {
        return;
      }
      const totalBytes = data.totalBytesExpectedToWrite;
      const writtenBytes = data.totalBytesWritten;
      onProgress({
        progress: totalBytes > 0 ? writtenBytes / totalBytes : 0,
        totalBytes,
        writtenBytes,
      });
    },
  );

  const result = await downloadResumable.downloadAsync();
  if (!result?.uri) {
    throw new Error('The update download did not complete.');
  }

  // The installer cannot read a raw file:// path on modern Android; convert to a
  // content:// URI exposed through the app's FileProvider.
  const contentUri = await FileSystem.getContentUriAsync(result.uri);

  await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
    data: contentUri,
    flags: FLAG_GRANT_READ_URI_PERMISSION,
    type: APK_MIME,
  });
}
