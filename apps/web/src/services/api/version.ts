/**
 * 版本相关 API
 */

import axios from 'axios';
import { REQUEST_TIMEOUT_MS } from '@/utils/constants';
import { MANAGER_LATEST_RELEASE_API_URL } from '@/utils/managerRepository';
import { apiClient } from './client';

export const CPA_MANAGER_UPDATE_INDEX_URL = MANAGER_LATEST_RELEASE_API_URL;

/**
 * Adapts the repository's latest GitHub release to the update-index shape the
 * dashboard reads, so publishing a release is the only update signal to keep.
 */
export const toManagerUpdateIndex = (release: unknown) => {
  const tag =
    typeof release === 'object' && release !== null && !Array.isArray(release)
      ? (release as ManagerLatestRelease).tag_name
      : undefined;
  if (typeof tag !== 'string' || !tag.trim()) {
    throw new Error('Invalid latest release: tag_name is missing');
  }
  return {
    schema_version: 1,
    channels: { stable: { version: tag.trim() }, rc: null, beta: null },
  };
};

export interface ManagerLatestRelease {
  tag_name?: string;
  name?: string;
  html_url?: string;
  published_at?: string;
  [key: string]: unknown;
}

export const versionApi = {
  checkLatest: () => apiClient.get<Record<string, unknown>>('/latest-version'),
  checkManagerUpdateIndex: async () => {
    const response = await axios.get(CPA_MANAGER_UPDATE_INDEX_URL, {
      timeout: REQUEST_TIMEOUT_MS,
      headers: { Accept: 'application/vnd.github+json' },
    });
    return toManagerUpdateIndex(response.data);
  },
};
