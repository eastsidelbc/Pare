import { afterEach, describe, expect, it, vi } from 'vitest';
import { postToApp } from '@/lib/platform';

// postToApp reads globalThis.webkit (= window.webkit in WKWebView). Mock it per test.
type WithWebkit = { webkit?: unknown };

afterEach(() => {
  delete (globalThis as WithWebkit).webkit;
});

describe('postToApp', () => {
  it('returns false outside the iOS app (no window.webkit)', () => {
    expect(postToApp({ type: 'openSettings' })).toBe(false);
  });

  it('returns false when webkit exists but the pare handler does not', () => {
    (globalThis as WithWebkit).webkit = { messageHandlers: {} };
    expect(postToApp({ type: 'openSettings' })).toBe(false);
  });

  it('posts the message to the pare handler and returns true', () => {
    const postMessage = vi.fn();
    (globalThis as WithWebkit).webkit = { messageHandlers: { pare: { postMessage } } };
    expect(postToApp({ type: 'openSettings' })).toBe(true);
    expect(postMessage).toHaveBeenCalledTimes(1);
    expect(postMessage).toHaveBeenCalledWith({ type: 'openSettings' });
  });

  it('returns false if the handler throws', () => {
    const postMessage = vi.fn(() => {
      throw new Error('boom');
    });
    (globalThis as WithWebkit).webkit = { messageHandlers: { pare: { postMessage } } };
    expect(postToApp({ type: 'openSettings' })).toBe(false);
  });
});
