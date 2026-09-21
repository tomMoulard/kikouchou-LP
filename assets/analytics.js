/**
 * PostHog analytics for the landing page.
 *
 * Credentials live in assets/analytics-config.js. With no key there this file
 * loads nothing, requests nothing and defines no globals — the same "absent
 * config means silence" contract the app uses in `src/lib/posthog.ts`.
 *
 * What it captures: one pageview, autocaptured clicks (so click maps and
 * heatmaps work), two named events — a click on any call to action, and a
 * language switch — and unhandled errors. Session recording is off. There is
 * not a single input on this page, so nothing a visitor types can be captured.
 *
 * ## Why so much of this file is about cross-origin scripts
 *
 * PostHog error tracking held an issue named `Error` whose whole description
 * was `Script error.`: five occurrences, no stack, no file, no line, nothing
 * anybody could act on. Four of them came from this page.
 *
 * That message is not a bug, it is a browser refusing to describe one. A
 * <script> from another origin with no `crossorigin` attribute is opaque by
 * specification: whatever it throws reaches `window.onerror` with the message
 * replaced by the literal "Script error." and the filename, line, column and
 * stack blanked. This page loads two such scripts — the Google tag in
 * index.html, and PostHog's own array.js below — so an error in either was
 * unreadable.
 *
 * Three things follow, in the order they run:
 *
 *   1. `crossOrigin` on every script this file injects, and on the Google tag
 *      in the HTML, so the browser keeps the real message and stack.
 *   2. `prepare_external_dependency_script`, which does the same for the lazy
 *      bundles posthog-js fetches for itself later.
 *   3. `before_send`, which cannot fix an opaque error but can make the ones
 *      still arriving tractable — see `markOpaqueExceptions` for what remains
 *      once the two above are in place, and why it is worth reporting.
 */
(function () {
  'use strict';

  var cfg = window.KKC_ANALYTICS || {};
  if (!cfg.key || !cfg.host) return;

  /* Never write into the real project from somebody's machine.
     The app learned this the hard way: its PostHog project ended up holding 20
     persons against 3 real accounts, 19 of them minted on localhost. The
     screenshot and layout checks in this repo run against a local server, so
     without this guard every test run would invent a visitor. */
  var host = location.hostname;
  var isLocal =
    host === 'localhost' || host === '::1' || host === '[::1]' || host === '0.0.0.0' ||
    host === '' || /\.localhost$/.test(host) || /\.local$/.test(host) ||
    /^127\./.test(host) || /^192\.168\./.test(host) || /^10\./.test(host);
  if (isLocal && cfg.allowLocalhost !== true) return;

  /* PostHog serves its library from a sibling of the ingestion host
     (eu.i.posthog.com -> eu-assets.i.posthog.com). `assetHost` overrides this
     for a reverse proxy or a self-hosted instance. */
  var assetHost = cfg.assetHost || cfg.host.replace('://eu.i.', '://eu-assets.i.')
                                           .replace('://us.i.', '://us-assets.i.');

  var script = document.createElement('script');
  script.src = assetHost + '/static/array.js';
  script.async = true;
  /* See the file header. eu-assets.i.posthog.com answers
     `access-control-allow-origin: *`, so this costs nothing and is what makes a
     throw inside posthog-js itself readable rather than "Script error.". */
  script.crossOrigin = 'anonymous';
  script.onload = start;
  document.head.appendChild(script);

  // ==========================================================================
  // Exception context
  // ==========================================================================

  /**
   * The exception messages a browser uses when it refuses to describe an error.
   *
   * Chrome and Firefox emit the trailing period; WebKit has shipped both
   * spellings, so both are listed.
   */
  var OPAQUE_EXCEPTION_VALUES = ['Script error.', 'Script error'];

  /**
   * The one issue every unreadable error is filed under.
   *
   * PostHog groups exceptions by `$exception_fingerprint` and computes one from
   * the message and the stack when the event does not carry its own. An opaque
   * error has no stack and a constant message, so the computed fingerprint is
   * stable but meaningless — an issue named `Error` that says nothing about
   * what it holds. Naming it here puts them all in one issue that reads as what
   * it is. The same constant is used by the app, in `src/lib/posthog.ts`, so
   * both surfaces land in the same place.
   */
  var OPAQUE_EXCEPTION_FINGERPRINT = 'opaque-cross-origin-script';

  /**
   * In-app browsers, by the token each one adds to the user agent.
   *
   * This matters because an in-app browser injects its own JavaScript into
   * every page it opens, and that script is not served from this origin — so
   * when it throws, this page is blamed for an error it did not cause and
   * cannot fix. All four opaque errors from this page arrived from the same
   * place: Android, referred by m.facebook.com, thrown as the page was being
   * torn down.
   *
   * UA sniffing is guesswork and is labelled as such: the property this fills
   * in is a hint for a human reading the issue, never a branch in the page.
   */
  var IN_APP_BROWSERS = [
    ['facebook', /\bFBAN\/|\bFBAV\/|\bFB_IAB\//],
    ['instagram', /\bInstagram\b/],
    ['tiktok', /\bBytedanceWebview\b|\bmusical_ly\b/],
    ['snapchat', /\bSnapchat\b/],
    ['linkedin', /\bLinkedInApp\b/],
    ['line', /\bLine\//],
    ['pinterest', /\bPinterest\b/],
    ['twitter', /\bTwitter\b/],
    ['wechat', /\bMicroMessenger\b/]
  ];

  /** Which in-app browser this looks like, or `null` for an ordinary browser. */
  function inAppBrowser() {
    var ua = navigator.userAgent || '';
    for (var i = 0; i < IN_APP_BROWSERS.length; i++) {
      if (IN_APP_BROWSERS[i][1].test(ua)) return IN_APP_BROWSERS[i][0];
    }
    return null;
  }

  /**
   * Every origin other than this one currently serving a <script> to the page.
   *
   * The shortlist of suspects for an error with no stack. It is read at capture
   * time rather than at load, because the scripts that matter most here are the
   * ones nothing in this repository put on the page: an extension's content
   * script, or the JavaScript an in-app browser injects after the document is
   * parsed. A known origin (googletagmanager.com, PostHog's asset host) is
   * information too — it says the throw came from a dependency rather than
   * from something riding along with the visitor.
   */
  function foreignScriptOrigins() {
    var origins = [];
    var scripts = document.getElementsByTagName('script');
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].src;
      if (!src) continue;
      var origin;
      try {
        origin = new URL(src, location.href).origin;
      } catch (e) {
        continue;
      }
      /* `chrome-extension:` and friends do not survive the URL parse as an
         http origin, which is exactly why they are worth keeping. */
      if (origin === location.origin) continue;
      if (origins.indexOf(origin) === -1) origins.push(origin);
    }
    return origins;
  }

  /** Whether one entry of `$exception_list` carries nothing anybody could act on. */
  function isOpaque(entry) {
    if (!entry || typeof entry !== 'object') return false;
    var value = typeof entry.value === 'string' ? entry.value.replace(/^\s+|\s+$/g, '') : '';
    if (OPAQUE_EXCEPTION_VALUES.indexOf(value) === -1) return false;
    /* Both halves are required. A page that genuinely threw
       `new Error('Script error.')` would be mislabelled by a message-only test,
       so an entry counts as opaque only when the browser also withheld every
       frame. */
    var frames = entry.stacktrace && entry.stacktrace.frames;
    return !(frames && frames.length);
  }

  /**
   * Adds to every exception the context the stack does not carry, and names the
   * ones the browser refused to describe.
   *
   * The two cross-origin fixes above stop this page producing opaque errors of
   * its own. What they cannot stop is genuinely outside it: a browser
   * extension's content script, or an in-app webview injecting its own
   * JavaScript. Nothing in this repository can keep those from throwing, so the
   * honest handling is to keep reporting them and make them tractable.
   *
   * `in_app_browser` and `foreign_script_origins` are attached to every
   * exception, readable or not, because they are what separates "our bug" from
   * "somebody else's script in somebody else's browser" — and that question is
   * unanswerable after the fact. The fingerprint and `opaque_cross_origin` are
   * added only when every entry is opaque; one readable entry beside an opaque
   * one keeps its own grouping, because that readable entry is the cause and it
   * is what somebody would fix.
   *
   * Must not throw. posthog-js calls this on the way out of every capture, so a
   * throw here would be an error raised by the error reporter, and it would be
   * raised again on the way out of reporting that. Every unexpected shape
   * returns the event untouched.
   */
  function markOpaqueExceptions(event) {
    try {
      if (!event || event.event !== '$exception' || !event.properties) return event;

      event.properties.in_app_browser = inAppBrowser();
      event.properties.foreign_script_origins = foreignScriptOrigins();

      var list = event.properties['$exception_list'];
      if (!list || !list.length) return event;
      for (var i = 0; i < list.length; i++) {
        if (!isOpaque(list[i])) return event;
      }
      event.properties.opaque_cross_origin = true;
      event.properties['$exception_fingerprint'] = OPAQUE_EXCEPTION_FINGERPRINT;
      return event;
    } catch (e) {
      return event;
    }
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================

  function start() {
    var ph = window.posthog;
    if (!ph || typeof ph.init !== 'function') return;

    ph.init(cfg.key, {
      api_host: cfg.host,
      /* See analytics-config.js for what this trades away. */
      persistence: cfg.persistence || 'memory',
      /* Do not mint a person profile for every anonymous reader. */
      person_profiles: 'identified_only',
      capture_pageview: true,
      capture_pageleave: true,
      /* Click and rageclick maps are most of the value on a landing page. */
      autocapture: true,
      capture_heatmaps: true,
      disable_session_recording: true,
      respect_dnt: true,

      /**
       * Stated here rather than left to the project's server-side setting.
       *
       * Exception capture was on for this page only because the PostHog project
       * has it enabled remotely — nothing in this repository asked for it, and
       * nothing here would have noticed it being turned off. Writing it down
       * makes the page's error reporting a property of the page.
       *
       * `capture_console_errors` is on, which is the opposite of the app's
       * choice in `src/lib/posthog.ts` and deliberate: this is four static
       * blocks and two scripts, its event volume is a rounding error next to
       * the app's, and a `console.error` is often the only readable thing left
       * when the exception beside it is opaque.
       */
      capture_exceptions: {
        capture_unhandled_errors: true,
        capture_unhandled_rejections: true,
        capture_console_errors: true
      },

      /**
       * Runs on every <script> posthog-js appends for its own lazy bundles.
       *
       * Same reason as the `crossOrigin` on array.js above, for the files
       * fetched after it: without this a throw inside one of them reaches the
       * project as "Script error." and nothing else.
       */
      prepare_external_dependency_script: function (s) {
        s.crossOrigin = 'anonymous';
        return s;
      },

      /* The last gate before an event leaves the browser. Nothing is dropped
         here — see `markOpaqueExceptions`, which only ever adds properties. */
      before_send: markOpaqueExceptions
    });

    /* Which surface an event came from, on every event.
       The app and this page write into one PostHog project and both send a
       `$current_url`, but an exception issue groups across URLs — so without
       this there is no way to ask "is this ours or the landing page's?" in a
       filter. `src/lib/posthog.ts` registers the app's own super properties the
       same way. */
    ph.register({ site: 'landing' });

    wire(ph);
  }

  function wire(ph) {
    var context = function () {
      return {
        lang: document.documentElement.lang,
        theme: document.documentElement.dataset.theme,
      };
    };

    /* Which call to action actually sends people to the app. */
    document.addEventListener('click', function (e) {
      var cta = e.target.closest('[data-cta]');
      if (!cta) return;
      var props = context();
      props.location = cta.dataset.cta;
      props.href = cta.getAttribute('href');
      props.label = cta.textContent.trim().slice(0, 80);
      ph.capture('landing_cta_clicked', props);
    });

    /* Whether visitors are reaching for the other language.
       Delegated on the capture phase so this runs before app.js swaps the copy
       over — otherwise `from` would already report the language switched to. */
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('.lang [data-lang]');
      if (!btn) return;
      ph.capture('landing_language_switched', {
        from: document.documentElement.lang,
        to: btn.dataset.lang,
        theme: document.documentElement.dataset.theme,
      });
    }, true);
  }
})();
