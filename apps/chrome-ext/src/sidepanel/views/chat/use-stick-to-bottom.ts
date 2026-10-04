import { useCallback, useEffect, useRef } from 'react';

/** Being this close to the bottom still counts as "at the bottom" (rounding, touchpad overshoot). */
const AT_BOTTOM_TOLERANCE_PX = 24;

/**
 * Keeps a scrolling area at its bottom while its content grows (a streaming answer, a new tool
 * card), the way chat apps do. Once the reader scrolls up to read something, it leaves them there
 * until they scroll back down or `scrollToBottom` is called.
 */
export function useStickToBottom() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const isFollowingContentRef = useRef(true);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    const content = contentRef.current;
    if (scrollContainer === null || content === null) return undefined;

    const rememberWhetherAtBottom = () => {
      const distanceFromBottom =
        scrollContainer.scrollHeight - scrollContainer.clientHeight - scrollContainer.scrollTop;
      isFollowingContentRef.current = distanceFromBottom <= AT_BOTTOM_TOLERANCE_PX;
    };
    const followContent = () => {
      if (isFollowingContentRef.current) scrollContainer.scrollTop = scrollContainer.scrollHeight;
    };

    scrollContainer.addEventListener('scroll', rememberWhetherAtBottom, { passive: true });
    // Content growing doesn't fire `scroll`, so watch sizes: the content, and the container itself
    // (the panel or the message box can change height too).
    const sizeObserver = new ResizeObserver(followContent);
    sizeObserver.observe(content);
    sizeObserver.observe(scrollContainer);
    return () => {
      scrollContainer.removeEventListener('scroll', rememberWhetherAtBottom);
      sizeObserver.disconnect();
    };
  }, []);

  const scrollToBottom = useCallback(() => {
    isFollowingContentRef.current = true;
    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer !== null) scrollContainer.scrollTop = scrollContainer.scrollHeight;
  }, []);

  return { scrollContainerRef, contentRef, scrollToBottom };
}
