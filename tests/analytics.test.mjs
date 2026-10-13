/**
 * Tests for the `before_send` hook in assets/analytics.js.
 *
 * Run with `node --test tests/`. No dependencies: the script is evaluated in a
 * `vm` context holding the handful of browser globals it reads, and the
 * options it hands to `posthog.init` are captured from a stub.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const SOURCE = readFileSync(
  fileURLToPath(new URL('../assets/analytics.js', import.meta.url)),
  'utf8',
);

/** Runs analytics.js on a fake page and returns the `before_send` it installs. */
function loadBeforeSend() {
  let initOptions = null;
  let loader = null;
  const element = () => ({ style: {}, dataset: {}, setAttribute() {}, appendChild() {} });
  const document = {
    visibilityState: 'visible',
    documentElement: { lang: 'en', dataset: {} },
    head: { appendChild(node) { loader = node; } },
    createElement: element,
    getElementsByTagName: () => [],
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementById: () => null,
    addEventListener() {},
  };
  const window = {
    KKC_ANALYTICS: { key: 'phc_test', host: 'https://eu.i.posthog.com' },
    addEventListener() {},
    postMessage() {},
  };
  const context = {
    window,
    document,
    location: { hostname: 'kikouchou.app', href: 'https://kikouchou.app/', origin: 'https://kikouchou.app' },
    navigator: { userAgent: 'Mozilla/5.0' },
    performance: { now: () => 1000, getEntriesByType: () => [] },
    EventTarget,
    URL,
    console,
    setTimeout,
  };
  window.document = document;
  window.location = context.location;
  window.navigator = context.navigator;
  vm.createContext(context);
  vm.runInContext(SOURCE, context);
  assert.ok(loader, 'analytics.js never asked for the PostHog loader');

  window.posthog = {
    init(_key, options) { initOptions = options; },
    register() {},
    onFeatureFlags() {},
    getFeatureFlag() {},
    get_distinct_id: () => 'd',
    get_session_id: () => 's',
    capture() {},
  };
  loader.onload();
  assert.ok(initOptions, 'posthog.init was never called');
  return initOptions.before_send;
}

/** An `$exception` event as posthog-js hands it to `before_send`. */
function exception(list) {
  return { uuid: 'u', event: '$exception', properties: { $exception_list: list } };
}

const FOREIGN = [
  [
    // PostHog 01a10ced: Meta's in-app browser bridge, after the native side is gone.
    "Meta's in-app browser bridge",
    [{
      type: 'Error',
      value: 'Error invoking postMessage: Java object is gone',
      stacktrace: { frames: [{ function: 'sendDataToNative', filename: 'iabjs://navigation_performance_logger_android' }] },
    }],
  ],
  [
    'an Android webview bridge with no frames',
    [{ type: 'Error', value: 'Error invoking postMessage: Java object is gone' }],
  ],
  [
    // PostHog 01a0a5d4: a cross-origin script the browser would not describe.
    'an opaque cross-origin error',
    [{ type: 'Error', value: 'Script error.' }],
  ],
  [
    // PostHog 01a120eb: Instagram's iOS webview script, attributed to the document.
    "an in-app browser's iOS bridge",
    [{
      type: 'TypeError',
      value: "undefined is not an object (evaluating 'window.webkit.messageHandlers')",
      stacktrace: { frames: [{ filename: 'https://kikouchou.app/', lineno: 1, colno: 3759 }] },
    }],
  ],
  [
    // PostHog 01a11652: a script some Android browser injects.
    "a browser's injected script",
    [{ type: 'ReferenceError', value: 'xbrowser is not defined' }],
  ],
];

for (const [name, list] of FOREIGN) {
  test(`drops ${name}`, () => {
    const beforeSend = loadBeforeSend();
    assert.equal(beforeSend(exception(list)), null);
  });
}

test('keeps an error of the page that happens to read "Script error."', () => {
  const beforeSend = loadBeforeSend();
  const event = exception([
    { type: 'Error', value: 'Script error.', stacktrace: { frames: [{ filename: 'https://kikouchou.app/assets/app.js' }] } },
  ]);
  assert.equal(beforeSend(event), event);
});

test('keeps an ordinary exception, with its context', () => {
  const beforeSend = loadBeforeSend();
  const event = exception([{ type: 'TypeError', value: 'x is undefined' }]);
  assert.equal(beforeSend(event), event);
  assert.equal(event.properties.in_app_browser, null);
});

test('keeps every event that is not an exception', () => {
  const beforeSend = loadBeforeSend();
  const event = { uuid: 'u', event: '$pageview', properties: {} };
  assert.equal(beforeSend(event), event);
});
