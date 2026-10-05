/**
 * PostHog analytics for the landing page.
 *
 * Credentials live in assets/analytics-config.js. With no key there this file
 * loads nothing, requests nothing and defines no globals — the same "absent
 * config means silence" contract the app uses in `src/lib/posthog.ts`.
 *
 * What it captures: one pageview, autocaptured clicks (so click maps and
 * heatmaps work), two named events — a click on any call to action, and a
 * language switch — and unhandled errors. Session recording follows
 * `sessionRecording` in the config file and is off when it is absent. There is
 * not a single input on this page, so nothing a visitor types can be captured.
 * One feature flag drives an experiment in the hero: see `firstJob`.
 * Every link into the app carries the visitor's PostHog ids, so the app can
 * continue the same person and session: see `handOff`.
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
   * The fingerprint every exception thrown by Meta's in-app browser bridge is
   * filed under.
   *
   * The computed fingerprint follows the stack, and the bridge throws from a
   * different function each time (`sendJsBlockingTimeMessage`,
   * `sendBeforeUnloadMessage`, `sendINPMessage`), so one cause was split into
   * PostHog issues `01a0c807`, `01a0d4a3` and a third. Named here, they are one
   * issue that one suppression rule can hold. The same constant is used by the
   * app, in `src/lib/posthog.ts`.
   */
  var META_BRIDGE_FINGERPRINT = 'meta-iab-bridge';

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

  /**
   * The functions Meta's in-app browser injects to report page timings.
   *
   * "Error invoking postMessage: Java object is gone" is thrown by these, with
   * no file, when the native side of the Facebook or Instagram webview is
   * already gone. Kept in step with `src/lib/posthog.ts` in the app.
   */
  var META_BRIDGE_FUNCTIONS = [
    'sendDataToNative',
    'sendJsBlockingTimeMessage',
    'sendINPMessage',
    'sendBeforeUnloadMessage'
  ];

  /**
   * The scheme Meta's in-app browser serves its injected scripts from.
   *
   * The bridge frames are not file-less: posthog-js reads them as
   * `iabjs://navigation_performance_logger_android`, so a file-less test alone
   * never matched one, and every event of PostHog issue `01a0c807` read
   * `injected_bridge: android_webview`.
   */
  var META_BRIDGE_SCHEME = 'iabjs://';

  /** When the page was last hidden with `pagehide`, on the performance clock. */
  var pageHiddenAt = null;
  window.addEventListener('pagehide', function () {
    pageHiddenAt = performance.now();
  });
  window.addEventListener('pageshow', function () {
    pageHiddenAt = null;
  });

  /**
   * Which native APIs no longer read as the browser's own code.
   *
   * Not console, fetch, XHR or history: posthog-js wraps those itself, so they
   * always read as patched. A wrapper that forges its `toString` still hides.
   */
  function patchedGlobals() {
    var watched = [
      ['navigator.serviceWorker.register', function () {
        return navigator.serviceWorker && navigator.serviceWorker.register;
      }],
      ['postMessage', function () { return window.postMessage; }],
      ['EventTarget.prototype.addEventListener', function () {
        return EventTarget.prototype.addEventListener;
      }]
    ];
    var patched = [];
    for (var i = 0; i < watched.length; i++) {
      try {
        var value = watched[i][1]();
        if (typeof value === 'function' &&
            Function.prototype.toString.call(value).indexOf('[native code]') === -1) {
          patched.push(watched[i][0]);
        }
      } catch (e) {
        /* A getter that throws is as good as absent. */
      }
    }
    return patched;
  }

  /** The last five cross-origin scripts the page fetched, origin and path only. */
  function recentForeignScripts() {
    var scripts = [];
    if (!window.performance || typeof performance.getEntriesByType !== 'function') return scripts;
    var entries = performance.getEntriesByType('resource');
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].initiatorType !== 'script') continue;
      try {
        var url = new URL(entries[i].name);
        if (url.origin === location.origin) continue;
        scripts.push(url.origin + url.pathname);
      } catch (e) {
        /* A name that is not a URL says nothing. */
      }
    }
    return scripts.slice(-5);
  }

  /** `meta_iab` when the frames are Meta's bridge, `android_webview` for another. */
  function injectedBridge(list) {
    var sawJavaBridge = false;
    for (var i = 0; i < list.length; i++) {
      var entry = list[i];
      if (!entry || typeof entry !== 'object') continue;
      if (typeof entry.value === 'string' && /Java object is gone/i.test(entry.value)) {
        sawJavaBridge = true;
      }
      var frames = entry.stacktrace && entry.stacktrace.frames;
      if (!frames || !frames.length) continue;
      var foreign = true;
      var named = false;
      for (var j = 0; j < frames.length; j++) {
        var frame = frames[j] || {};
        var filename = typeof frame.filename === 'string' ? frame.filename : '';
        var fromMeta = filename.indexOf(META_BRIDGE_SCHEME) === 0;
        /* posthog-js writes `<anonymous>` for a frame with no URL. */
        if (filename && filename !== '<anonymous>' && !fromMeta) foreign = false;
        if (fromMeta || META_BRIDGE_FUNCTIONS.indexOf(String(frame['function'])) !== -1) {
          named = true;
        }
      }
      if (foreign && named) return 'meta_iab';
    }
    return sawJavaBridge ? 'android_webview' : null;
  }

  /**
   * What the page was doing when an exception was captured: counts, flags and
   * enum values only. The same properties as the app, so one insight covers
   * both surfaces. Never throws.
   */
  function exceptionDebugContext(list) {
    var context = {};
    try {
      context.page_visibility = document.visibilityState;
      var now = performance.now();
      context.page_age_ms = Math.round(now);
      context.ms_since_pagehide = pageHiddenAt === null ? null : Math.round(now - pageHiddenAt);
      context.patched_globals = patchedGlobals();
      context.recent_foreign_scripts = recentForeignScripts();
      context.meta_pixel_loaded = typeof window.fbq === 'function';
      context.injected_bridge = list && list.length ? injectedBridge(list) : null;
    } catch (e) {
      /* Best effort. The exception is worth more than its context. */
    }
    return context;
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
      var context = exceptionDebugContext(list);
      for (var key in context) {
        if (Object.prototype.hasOwnProperty.call(context, key)) {
          event.properties[key] = context[key];
        }
      }
      if (!list || !list.length) return event;
      if (context.injected_bridge === 'meta_iab') {
        /* Not our code, and nothing on this page can stop it. Sent, so the
           volume stays visible, but as a warning in its own issue. */
        event.properties['$exception_fingerprint'] = META_BRIDGE_FINGERPRINT;
        event.properties['$exception_level'] = 'warning';
        return event;
      }
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
      respect_dnt: true,

      /**
       * Session recording, off unless analytics-config.js turns it on.
       *
       * The default is off, so an unset or malformed config records nothing.
       * See `sessionRecording` in analytics-config.js for what recording costs
       * and what `persistence: 'memory'` does to it.
       */
      disable_session_recording: cfg.sessionRecording !== true,

      /**
       * What a recording is allowed to keep.
       *
       * This page has no input of any kind, so `maskAllInputs` masks nothing
       * today. It is stated anyway: the first form somebody adds — an email
       * field on a waitlist, a search box — must not start shipping keystrokes
       * to PostHog because nobody remembered to come back here.
       *
       * `maskTextSelector` masks the elements marked `data-private` in the
       * HTML, which is the one lever available to a future block that shows
       * something a visitor should not find in a replay.
       */
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: '[data-private]',
        /* Request and response bodies are never recorded. The default already
           records only timing, but this page's calls go to the app's API, so
           it is worth being explicit. */
        recordHeaders: false,
        recordBody: false
      },

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

    handOff(ph);
    wire(ph);
    firstJob(ph);
  }

  // ==========================================================================
  // Experiment: which job the hero offers to settle first
  // ==========================================================================

  /* The multivariate flag behind the experiment, and the variants it may
     return. Each variant names the `data-job` of one hidden link in the hero. */
  var FIRST_JOB_FLAG = 'landing-hero-first-job';
  var FIRST_JOB_VARIANTS = ['rooms', 'rides', 'money'];

  /**
   * Shows the one hero link this visitor's variant names.
   *
   * The links start hidden and stay hidden until the flags arrive, so nobody
   * sees one phrase swapped for another. Any other value (no flag, a failed
   * request, a `control` variant added later in PostHog) leaves the hero as it
   * was. Reading the flag with `getFeatureFlag` is what sends PostHog its
   * `$feature_flag_called` exposure event.
   *
   * `persistence: 'memory'` gives every visit a new distinct id, so the
   * variant is drawn per visit, not per person.
   */
  function firstJob(ph) {
    var box = document.querySelector('.hero__job');
    if (!box || typeof ph.onFeatureFlags !== 'function') return;

    ph.onFeatureFlags(function () {
      var variant = ph.getFeatureFlag(FIRST_JOB_FLAG);
      var show = FIRST_JOB_VARIANTS.indexOf(variant) !== -1;
      Array.prototype.forEach.call(box.querySelectorAll('[data-job]'), function (link) {
        link.hidden = !show || link.dataset.job !== variant;
      });
      box.hidden = !show;
    });
  }

  // ==========================================================================
  // Identity hand-off to the app
  // ==========================================================================

  /* The links that open the app, and the names the app reads back.
     `src/lib/analytics/landing-handoff.ts` in the app holds the other half of
     this contract, and the rules it applies: change a name here and it must
     change there. */
  var APP_LINK = 'a[href^="https://app.kikouchou.app"]';
  var HANDOFF_PARAMS = ['ph_distinct_id', 'ph_session_id', 'ph_handoff_at'];

  /**
   * Puts this visitor's PostHog ids on every link into the app.
   *
   * `persistence: 'memory'` keeps this page out of the cookie question, and it
   * also means the page has no identifier the app could read: the two sites
   * would count one visitor as two people, with the landing visit that led to
   * the sign-up on neither. The app bootstraps posthog-js from these
   * parameters on a first visit, so the pageviews and the recording here join
   * the person the app later identifies. Nothing is stored in the browser.
   *
   * The ids go on the href itself, before the click, rather than in a click
   * handler. The Google Ads snippet in index.html reads `link.href` in its own
   * click listener, which was registered first, and a middle click or a copied
   * link never fires a click here at all. The session id rotates after half an
   * hour idle, so the links are refreshed on pointer down and on focus, which
   * both come before the click they lead to.
   */
  function handOff(ph) {
    var decorate = function (link) {
      if (!link.dataset.appHref) link.dataset.appHref = link.getAttribute('href');
      var url;
      try {
        url = new URL(link.dataset.appHref);
      } catch (err) {
        return;
      }
      url.searchParams.set(HANDOFF_PARAMS[0], ph.get_distinct_id());
      url.searchParams.set(HANDOFF_PARAMS[1], ph.get_session_id());
      /* The app ignores a link more than ten minutes old, so a copied link
         sent to a friend does not make the friend the same person. */
      url.searchParams.set(HANDOFF_PARAMS[2], String(Date.now()));
      link.setAttribute('href', url.toString());
    };

    Array.prototype.forEach.call(document.querySelectorAll(APP_LINK), decorate);

    var refresh = function (e) {
      var link = e.target && e.target.closest ? e.target.closest(APP_LINK) : null;
      if (link) decorate(link);
    };
    document.addEventListener('pointerdown', refresh, true);
    document.addEventListener('focusin', refresh, true);
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
      /* The href as written in the HTML, without the ids `handOff` adds. */
      props.href = cta.dataset.appHref || cta.getAttribute('href');
      props.label = cta.textContent.trim().slice(0, 80);
      /* The language-independent name of the hero experiment link. */
      if (cta.dataset.job) props.job = cta.dataset.job;
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
