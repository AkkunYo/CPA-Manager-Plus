/**
 * CPA credential quota contract: POST /quota/fetch returns a normalized
 * `{ subscription, summary, groups[].buckets[] }` payload for any credential
 * whose quota provider is registered in CPA (for example a plugin provider).
 */

import type { TFunction } from 'i18next';
import type { AuthFileItem, CredentialQuotaData, CredentialQuotaWindow } from '@/types';
import {
  apiClient,
  createScopedApiRequestConfig,
  type ApiClientRequestScope,
} from '@/services/api/client';
import { isRecord } from '@/utils/helpers';
import { normalizeAuthIndex, normalizeStringValue } from './parsers';

const toRemainingPercent = (value: unknown): number | null => {
  const fraction = typeof value === 'string' ? Number(value) : value;
  if (typeof fraction !== 'number' || !Number.isFinite(fraction)) return null;
  return Math.max(0, Math.min(100, fraction * 100));
};

export const parseCredentialQuotaPayload = (
  payload: unknown,
  observedAtMs: number
): CredentialQuotaData | null => {
  if (!isRecord(payload)) return null;
  const subscription = isRecord(payload.subscription) ? payload.subscription : null;
  const plan =
    normalizeStringValue(subscription?.plan) ?? normalizeStringValue(subscription?.tierName);
  const groups = Array.isArray(payload.groups) ? payload.groups : [];
  const windows: CredentialQuotaWindow[] = groups.flatMap((group, groupIndex) => {
    if (!isRecord(group) || !Array.isArray(group.buckets)) return [];
    const groupLabel = normalizeStringValue(group.displayName);
    return group.buckets.flatMap((bucket, bucketIndex) => {
      if (!isRecord(bucket)) return [];
      return [
        {
          id: `${groupIndex}:${bucketIndex}`,
          groupLabel,
          window: normalizeStringValue(bucket.window),
          description: normalizeStringValue(bucket.description),
          remainingPercent: toRemainingPercent(bucket.remainingFraction),
          resetTime: normalizeStringValue(bucket.resetTime),
        },
      ];
    });
  });
  if (!plan && windows.length === 0) return null;
  return { windows, observedAtMs, plan };
};

export const fetchCredentialQuota = async (
  file: AuthFileItem,
  t: TFunction,
  requestScope?: ApiClientRequestScope
): Promise<CredentialQuotaData> => {
  const authIndex = normalizeAuthIndex(file['auth_index'] ?? file.authIndex);
  if (!authIndex) {
    throw new Error(t('credential_quota.missing_identity'));
  }
  const provider = normalizeStringValue(file.quota_provider);
  const pluginID = normalizeStringValue(file.quota_plugin_id);
  const payload = await apiClient.post<unknown>(
    '/quota/fetch',
    {
      auth_index: authIndex,
      ...(provider ? { provider } : {}),
      ...(pluginID ? { plugin_id: pluginID } : {}),
    },
    requestScope ? createScopedApiRequestConfig(requestScope) : undefined
  );
  const quotaData = parseCredentialQuotaPayload(payload, Date.now());
  if (!quotaData) {
    throw new Error(t('credential_quota.empty_data'));
  }
  return quotaData;
};
