import { beforeEach, describe, expect, it, vi } from 'vitest';

const { get } = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('axios', () => ({ default: { get } }));
vi.mock('./client', () => ({ apiClient: { get: vi.fn() } }));

import { readManagerStableVersion } from '@/features/system/versionChecks';
import { CPA_MANAGER_UPDATE_INDEX_URL, toManagerUpdateIndex, versionApi } from './version';

describe('manager update check', () => {
  beforeEach(() => {
    get.mockReset();
  });

  it('reads the latest release of the publishing repository', async () => {
    get.mockResolvedValue({ data: { tag_name: 'v1.14.8-cq.3', html_url: 'https://example.test' } });

    const index = await versionApi.checkManagerUpdateIndex();

    expect(CPA_MANAGER_UPDATE_INDEX_URL).toBe(
      'https://api.github.com/repos/AkkunYo/CPA-Manager-Plus/releases/latest'
    );
    expect(get).toHaveBeenCalledWith(
      CPA_MANAGER_UPDATE_INDEX_URL,
      expect.objectContaining({ headers: { Accept: 'application/vnd.github+json' } })
    );
    expect(readManagerStableVersion(index)).toBe('v1.14.8-cq.3');
  });

  it('rejects release payloads without a tag', () => {
    expect(() => toManagerUpdateIndex({ tag_name: '  ' })).toThrow('tag_name is missing');
    expect(() => toManagerUpdateIndex(null)).toThrow('tag_name is missing');
    expect(() => toManagerUpdateIndex([])).toThrow('tag_name is missing');
  });
});
