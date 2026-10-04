import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useStickToBottom } from './use-stick-to-bottom';

/** jsdom has no layout, so the test plays the browser: it sets sizes and reports resizes. */
let reportResize: () => void;

function ScrollingConversation() {
  const { scrollContainerRef, contentRef, scrollToBottom } = useStickToBottom();
  return (
    <>
      <div data-testid="scroll-container" ref={scrollContainerRef}>
        <div ref={contentRef} />
      </div>
      <button type="button" onClick={scrollToBottom}>
        Jump to latest
      </button>
    </>
  );
}

function renderScrollingConversation({ scrollTop }: { scrollTop: number }) {
  render(<ScrollingConversation />);
  const scrollContainer = screen.getByTestId('scroll-container');
  Object.defineProperty(scrollContainer, 'clientHeight', { value: 200, configurable: true });
  setScrollHeight(scrollContainer, 500);
  Object.defineProperty(scrollContainer, 'scrollTop', {
    value: scrollTop,
    writable: true,
    configurable: true,
  });
  fireEvent.scroll(scrollContainer);
  return scrollContainer;
}

function setScrollHeight(element: HTMLElement, scrollHeight: number) {
  Object.defineProperty(element, 'scrollHeight', { value: scrollHeight, configurable: true });
}

describe('useStickToBottom', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          reportResize = callback;
        }
        observe() {}
        disconnect() {}
      },
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('follows new content while the reader is at the bottom', () => {
    const scrollContainer = renderScrollingConversation({ scrollTop: 300 });

    setScrollHeight(scrollContainer, 900);
    reportResize();

    expect(scrollContainer.scrollTop).toBe(900);
  });

  it('leaves the reader where they are after they scrolled up', () => {
    const scrollContainer = renderScrollingConversation({ scrollTop: 100 });

    setScrollHeight(scrollContainer, 900);
    reportResize();

    expect(scrollContainer.scrollTop).toBe(100);
  });

  it('follows again once asked to scroll to the bottom', async () => {
    const scrollContainer = renderScrollingConversation({ scrollTop: 100 });

    await userEvent.click(screen.getByRole('button', { name: 'Jump to latest' }));
    expect(scrollContainer.scrollTop).toBe(500);

    setScrollHeight(scrollContainer, 900);
    reportResize();
    expect(scrollContainer.scrollTop).toBe(900);
  });
});
