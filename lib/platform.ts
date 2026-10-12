/**
 * In-app detection — is this page running inside the iOS WKWebView wrapper?
 *
 * The wrapper keeps WebKit's default user agent and adds `Pare-iOS/<version>` at the end
 * (`… (KHTML, like Gecko) Mobile/15E148 Pare-iOS/1.0`; set via `applicationNameForUserAgent`
 * from `AppConfig.uaToken` in ios/Pare/AppConfig.swift). A tiny inline script in the root layout
 * (`IN_APP_SCRIPT`) checks it before first paint and sets `<html data-app="ios">`,
 * so CSS can hide web-only chrome (`[data-app="ios"] .site-footer`) without the
 * server ever reading headers() — pages stay static / ISR.
 *
 * Client code: `isInIosApp()` (reads the attribute — same answer as the CSS).
 */

/** User-agent token the iOS wrapper sends. Keep equal to `AppConfig.uaToken` (ios/Pare/AppConfig.swift). */
export const IOS_APP_UA_TOKEN = 'Pare-iOS';

/** Inline <head> script: runs before paint, marks <html data-app="ios"> inside the app. */
export const IN_APP_SCRIPT = `(function(){try{if(navigator.userAgent.indexOf('${IOS_APP_UA_TOKEN}')!==-1){document.documentElement.setAttribute('data-app','ios');}}catch(e){}})();`;

/** Client-only: true inside the iOS wrapper. Always false on the server. */
export function isInIosApp(): boolean {
  if (typeof document === 'undefined') return false;
  return document.documentElement.dataset.app === 'ios';
}

/** Messages the iOS app accepts from the page (ios/Pare/Bridge.swift). */
export type AppMessage = { type: 'openSettings' };

interface PareMessageHandler {
  postMessage(message: AppMessage): void;
}

/** The slice of WKWebView's `window.webkit` the app registers (handler name = `AppConfig.bridgeName`). */
interface WebKitBridge {
  messageHandlers?: { pare?: PareMessageHandler };
}

/**
 * Send a message to the iOS app. Returns true if it was sent; false in any browser
 * (no `window.webkit.messageHandlers.pare`), so the caller falls back to its web behavior.
 */
export function postToApp(message: AppMessage): boolean {
  const handler = (globalThis as { webkit?: WebKitBridge }).webkit?.messageHandlers?.pare;
  if (!handler) return false;
  try {
    handler.postMessage(message);
    return true;
  } catch {
    return false;
  }
}
