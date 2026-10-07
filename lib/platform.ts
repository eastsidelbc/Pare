/**
 * In-app detection — is this page running inside the iOS WKWebView wrapper?
 *
 * The wrapper sets a custom user agent `Pare-iOS/<version> (iPhone; iOS <x>)`
 * (ios/Pare/Web/WebViewContainer.swift). A tiny inline script in the root layout
 * (`IN_APP_SCRIPT`) checks it before first paint and sets `<html data-app="ios">`,
 * so CSS can hide web-only chrome (`[data-app="ios"] .site-footer`) without the
 * server ever reading headers() — pages stay static / ISR.
 *
 * Client code: `isInIosApp()` (reads the attribute — same answer as the CSS).
 */

/** User-agent token the iOS wrapper sends. Keep in sync with WebViewContainer.swift. */
export const IOS_APP_UA_TOKEN = 'Pare-iOS';

/** Inline <head> script: runs before paint, marks <html data-app="ios"> inside the app. */
export const IN_APP_SCRIPT = `(function(){try{if(navigator.userAgent.indexOf('${IOS_APP_UA_TOKEN}')!==-1){document.documentElement.setAttribute('data-app','ios');}}catch(e){}})();`;

/** Client-only: true inside the iOS wrapper. Always false on the server. */
export function isInIosApp(): boolean {
  if (typeof document === 'undefined') return false;
  return document.documentElement.dataset.app === 'ios';
}
