import { apiClient } from './api-client';

export type BackupSettings = {
  destinationPath: string | null;
  scheduleEnabled: boolean;
  frequency: 'daily' | 'weekly';
  retention: number;
  lastBackupAt: string | null;
  lastBackupStatus: string | null;
};

export type BackupSettingsPatch = Partial<
  Pick<BackupSettings, 'destinationPath' | 'scheduleEnabled' | 'frequency' | 'retention'>
>;

export type BackupFile = {
  fileName: string;
  sizeBytes: number;
  createdAt: string;
};

export type PickFolderResult = {
  status: 'ok' | 'unsupported';
  path: string | null;
};

export class BackupService {
  async getSettings(): Promise<BackupSettings> {
    return apiClient.get<BackupSettings>('/backup/settings');
  }

  async saveSettings(patch: BackupSettingsPatch): Promise<BackupSettings> {
    return apiClient.put<BackupSettings>('/backup/settings', patch);
  }

  async runBackup(): Promise<BackupFile> {
    return apiClient.post<BackupFile>('/backup/run', {});
  }

  async listBackups(): Promise<BackupFile[]> {
    return apiClient.get<BackupFile[]>('/backup/list');
  }

  async restore(fileName: string): Promise<{ status: string }> {
    return apiClient.post<{ status: string }>('/backup/restore', { fileName });
  }

  async pickFolder(): Promise<PickFolderResult> {
    return apiClient.post<PickFolderResult>('/backup/pick-folder', {});
  }
}
