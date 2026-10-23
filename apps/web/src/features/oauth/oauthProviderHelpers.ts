import type { PluginListEntry } from '@/types';

export interface OAuthPollingScope {
  connectionFingerprint: string | null;
  accountReauthSessionId: string | null;
  search: string;
}

export interface OAuthProviderAttempt {
  scope: OAuthPollingScope;
  version: number;
}

export const isOAuthPollingScopeCurrent = (
  started: OAuthPollingScope,
  current: OAuthPollingScope
): boolean =>
  started.connectionFingerprint === current.connectionFingerprint &&
  started.accountReauthSessionId === current.accountReauthSessionId;

export const isOAuthProviderAttemptCurrent = (
  attempt: OAuthProviderAttempt,
  currentScope: OAuthPollingScope,
  currentVersion: number | undefined
): boolean =>
  attempt.version === currentVersion && isOAuthPollingScopeCurrent(attempt.scope, currentScope);

export const resolvePluginOAuthProviderId = (
  plugin: Pick<PluginListEntry, 'id' | 'oauthProvider'>
): string => plugin.oauthProvider ?? plugin.id;

export const shouldShowPluginOAuthProvider = (
  plugin: Pick<PluginListEntry, 'id' | 'oauthProvider' | 'supportsOAuth'>,
  builtInProviderIds: ReadonlySet<string>
): boolean =>
  plugin.supportsOAuth && !builtInProviderIds.has(resolvePluginOAuthProviderId(plugin));

export const normalizePluginOAuthTitle = (rawTitle: string): string => {
  const clean = rawTitle.replace(/\s*oauth$/i, '').trim();
  return clean ? `${clean} OAuth` : rawTitle;
};

export const normalizePluginOAuthButtonPluginName = (
  rawTitle: string | undefined,
  provider: string
): string => {
  const title = (rawTitle || provider).replace(/\s*oauth$/i, '').trim();
  return title || provider;
};

export const extractUserCodeFromURL = (url?: string): string | undefined => {
  if (!url) return undefined;
  const match = /[?&#]user_code=([A-Z0-9-]+)/i.exec(url);
  return match ? match[1] : undefined;
};
