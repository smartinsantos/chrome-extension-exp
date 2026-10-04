const MAX_BADGE_COUNT = 99;

/** The toolbar badge shows how many WebMCP tools the tab offers; empty when there are none. */
export function toolCountBadgeText(toolCount: number): string {
  if (toolCount <= 0) return '';
  return toolCount > MAX_BADGE_COUNT ? `${MAX_BADGE_COUNT}+` : String(toolCount);
}

interface BadgeApi {
  setBadgeText(details: { tabId: number; text: string }): Promise<void>;
}

export function createToolCountBadge(badgeApi: BadgeApi) {
  return {
    showToolCount: (tabId: number, toolCount: number) =>
      badgeApi.setBadgeText({ tabId, text: toolCountBadgeText(toolCount) }),
    clear: (tabId: number) => badgeApi.setBadgeText({ tabId, text: '' }),
  };
}
