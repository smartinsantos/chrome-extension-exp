import { storage } from 'wxt/utils/storage';

export interface ExtensionSettings {
  /** Where the agent backend (BFF) runs. */
  bffUrl: string;
  /** On trusted sites, let the agent run tools marked read-only without asking. */
  autoRunReadOnlyOnTrustedOrigins: boolean;
  /** Origins (like https://example.com) whose tool annotations the user chose to believe. */
  trustedOrigins: string[];
}

/** The local web demo is trusted out of the box; every other site starts untrusted. */
export const DEFAULT_TRUSTED_ORIGINS = ['http://localhost:5173'];

const bffUrlItem = storage.defineItem<string>('local:bffUrl', {
  fallback: 'http://127.0.0.1:8787',
});
const autoRunReadOnlyItem = storage.defineItem<boolean>('local:autoRunReadOnlyOnTrustedOrigins', {
  fallback: true,
});
const trustedOriginsItem = storage.defineItem<string[]>('local:trustedOrigins', {
  fallback: DEFAULT_TRUSTED_ORIGINS,
});

export async function readExtensionSettings(): Promise<ExtensionSettings> {
  const [bffUrl, autoRunReadOnlyOnTrustedOrigins, trustedOrigins] = await Promise.all([
    bffUrlItem.getValue(),
    autoRunReadOnlyItem.getValue(),
    trustedOriginsItem.getValue(),
  ]);
  return { bffUrl, autoRunReadOnlyOnTrustedOrigins, trustedOrigins };
}

export async function updateExtensionSettings(
  changes: Partial<Pick<ExtensionSettings, 'bffUrl' | 'autoRunReadOnlyOnTrustedOrigins'>>,
): Promise<void> {
  await Promise.all([
    changes.bffUrl === undefined ? undefined : bffUrlItem.setValue(changes.bffUrl),
    changes.autoRunReadOnlyOnTrustedOrigins === undefined
      ? undefined
      : autoRunReadOnlyItem.setValue(changes.autoRunReadOnlyOnTrustedOrigins),
  ]);
}

export async function isOriginTrusted(origin: string): Promise<boolean> {
  const webOrigin = toWebOrigin(origin);
  if (webOrigin === undefined) return false;
  return (await trustedOriginsItem.getValue()).includes(webOrigin);
}

export async function setOriginTrust(originOrUrl: string, isTrusted: boolean): Promise<void> {
  const webOrigin = toWebOrigin(originOrUrl);
  if (webOrigin === undefined) return;
  const trustedOrigins = await trustedOriginsItem.getValue();
  const otherOrigins = trustedOrigins.filter((origin) => origin !== webOrigin);
  await trustedOriginsItem.setValue(isTrusted ? [...otherOrigins, webOrigin] : otherOrigins);
}

/** Subscribes to settings changes made anywhere in the extension. Returns an unsubscribe. */
export function watchExtensionSettings(onChange: () => void): () => void {
  const unwatchers = [bffUrlItem, autoRunReadOnlyItem, trustedOriginsItem].map((item) =>
    item.watch(onChange),
  );
  return () => {
    for (const unwatch of unwatchers) unwatch();
  };
}

/** `https://example.com/page` → `https://example.com`; anything that isn't http(s) → undefined. */
function toWebOrigin(originOrUrl: string): string | undefined {
  if (!URL.canParse(originOrUrl)) return undefined;
  const url = new URL(originOrUrl);
  return url.protocol === 'http:' || url.protocol === 'https:' ? url.origin : undefined;
}
