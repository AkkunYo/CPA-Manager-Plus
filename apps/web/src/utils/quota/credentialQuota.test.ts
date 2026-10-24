import type { TFunction } from 'i18next';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { post } = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock('@/services/api/client', () => ({
  apiClient: { post },
  createScopedApiRequestConfig: (scope: { apiBase: string; managementKey: string }) => ({
    baseURL: `${scope.apiBase}/v0/management`,
    headers: { Authorization: `Bearer ${scope.managementKey}` },
    cpampScopedRequest: true,
  }),
}));

import { fetchCredentialQuota, parseCredentialQuotaPayload } from './credentialQuota';

const t = ((key: string) => key) as TFunction;

const contractPayload = {
  subscription: { plan: 'KIRO FREE' },
  summary: [{ key: 'credit_used', label: 'Credits used', value: 2.79 }],
  groups: [
    {
      displayName: 'Credits',
      buckets: [
        {
          window: 'monthly',
          remainingFraction: 0.9442,
          resetTime: '2026-11-01T00:00:00Z',
          description: '2.79 / 50',
        },
        { window: 'free_trial', remainingFraction: 1.5 },
      ],
    },
  ],
};

describe('parseCredentialQuotaPayload', () => {
  it('maps contract groups and buckets to quota windows', () => {
    expect(parseCredentialQuotaPayload(contractPayload, 1000)).toEqual({
      observedAtMs: 1000,
      plan: 'KIRO FREE',
      windows: [
        {
          id: '0:0',
          groupLabel: 'Credits',
          window: 'monthly',
          description: '2.79 / 50',
          remainingPercent: 94.42,
          resetTime: '2026-11-01T00:00:00Z',
        },
        {
          id: '0:1',
          groupLabel: 'Credits',
          window: 'free_trial',
          description: null,
          remainingPercent: 100,
          resetTime: null,
        },
      ],
    });
  });

  it('falls back to tierName and tolerates missing groups', () => {
    expect(parseCredentialQuotaPayload({ subscription: { tierName: 'Pro' } }, 1)).toEqual({
      observedAtMs: 1,
      plan: 'Pro',
      windows: [],
    });
  });

  it('returns null when the payload carries neither plan nor buckets', () => {
    expect(parseCredentialQuotaPayload({}, 1)).toBeNull();
    expect(parseCredentialQuotaPayload({ groups: [{ buckets: ['x'] }] }, 1)).toBeNull();
    expect(parseCredentialQuotaPayload(null, 1)).toBeNull();
  });
});

describe('fetchCredentialQuota', () => {
  beforeEach(() => {
    post.mockReset();
  });

  it('posts the credential identity to the CPA quota contract', async () => {
    post.mockResolvedValue(contractPayload);
    const data = await fetchCredentialQuota(
      {
        name: 'kiro.json',
        auth_index: 'a1',
        quota_provider: 'kiro4cpa',
        quota_plugin_id: 'kiro4cpa',
      },
      t,
      { apiBase: 'http://cpa', managementKey: 'secret' }
    );
    expect(post).toHaveBeenCalledWith(
      '/quota/fetch',
      { auth_index: 'a1', provider: 'kiro4cpa', plugin_id: 'kiro4cpa' },
      expect.objectContaining({ baseURL: 'http://cpa/v0/management' })
    );
    expect(data.plan).toBe('KIRO FREE');
  });

  it('omits optional routing hints and rejects credentials without auth_index', async () => {
    post.mockResolvedValue(contractPayload);
    await fetchCredentialQuota({ name: 'x.json', authIndex: 7 }, t);
    expect(post).toHaveBeenCalledWith('/quota/fetch', { auth_index: '7' }, undefined);

    await expect(fetchCredentialQuota({ name: 'x.json' }, t)).rejects.toThrow(
      'credential_quota.missing_identity'
    );
  });

  it('reports an empty contract response as missing data', async () => {
    post.mockResolvedValue({});
    await expect(fetchCredentialQuota({ name: 'x.json', auth_index: 'a1' }, t)).rejects.toThrow(
      'credential_quota.empty_data'
    );
  });
});
