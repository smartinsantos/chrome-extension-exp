import { describe, expect, it, vi } from 'vitest';

import { createToolCountBadge, toolCountBadgeText } from './tool-count-badge';

describe('toolCountBadgeText', () => {
  it.each([
    [0, ''],
    [1, '1'],
    [42, '42'],
    [120, '99+'],
  ])('shows %i tools as "%s"', (toolCount, expectedText) => {
    expect(toolCountBadgeText(toolCount)).toBe(expectedText);
  });
});

describe('createToolCountBadge', () => {
  it('shows the count on the tab that reported it, and clears it when the tab navigates away', async () => {
    const setBadgeText = vi.fn<(details: { tabId: number; text: string }) => Promise<void>>(() =>
      Promise.resolve(),
    );
    const badge = createToolCountBadge({ setBadgeText });

    await badge.showToolCount(7, 3);
    await badge.clear(7);

    expect(setBadgeText.mock.calls).toEqual([[{ tabId: 7, text: '3' }], [{ tabId: 7, text: '' }]]);
  });
});
