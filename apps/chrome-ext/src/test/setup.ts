import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';

// jsdom doesn't implement pointer capture, which Base UI menus and dialogs call on pointer events.
if (!('setPointerCapture' in Element.prototype)) {
  Object.assign(Element.prototype, {
    setPointerCapture() {},
    releasePointerCapture() {},
    hasPointerCapture: () => false,
  });
}

// jsdom has no layout, so it has no ResizeObserver either; components only need it to exist.
if (!('ResizeObserver' in globalThis)) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

beforeEach(() => {
  fakeBrowser.reset();
  // The side panel router keeps its route in the URL hash; start every test on a clean URL.
  window.location.hash = '';
});

afterEach(() => {
  cleanup();
});
