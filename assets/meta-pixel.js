/**
 * Meta Pixel for the landing page.
 *
 * The id lives in assets/analytics-config.js, beside the PostHog one. With no
 * id there this file loads nothing, requests nothing and defines no globals —
 * the same "absent config means silence" contract assets/analytics.js follows.
 *
 * What it reports: one PageView, and nothing else. Every call to action here is
 * a plain <a> to app.kikouchou.app, and the app carries the same pixel id in
 * `src/lib/meta-pixel.ts`, so the conversion worth optimising against — someone
 * installing the app — is reported from the app rather than guessed at from a
 * click here. Google Ads counts that click separately, through
 * `gtag_report_conversion` in index.html; the two tools are measuring different
 * ends of the same funnel and neither replaces the other.
 *
 * ## Why this is a file rather than the snippet Events Manager hands out
 *
 * Meta's install instructions say to paste the snippet between <head> and
 * </head>. Pasted there it runs on every load of every copy of this page,
 * including `python3 -m http.server 4173` on a laptop — and loopback traffic in
 * an ad account is not merely a stray event. It is billed, and it trains the
 * campaign's optimiser on visitors who were never real. assets/analytics.js
 * carries the same guard for the same reason, after the app's PostHog project
 * filled up with 19 people minted on localhost.
 *
 * The guard is duplicated here rather than shared because these two files are
 * deliberately independent: either one can be deleted without touching the
 * other, and neither may stop the page rendering.
 *
 * `crossOrigin` on the injected script is the other thing taken from that file.
 * A cross-origin <script> without it is opaque to `window.onerror` by
 * specification, so anything fbevents.js throws arrives as the bare string
 * "Script error." with no file, line or stack — an error nobody can act on.
 * connect.facebook.net answers a CORS request, so this costs nothing.
 */
(function () {
  'use strict';

  var cfg = (window.KKC_ANALYTICS && window.KKC_ANALYTICS.metaPixel) || {};
  if (!cfg.id) return;

  /* Never report from somebody's machine. Same list as assets/analytics.js:
     loopback is only half of it, because `--bind 0.0.0.0` and a phone on the
     LAN see a 192.168.x.x address, and that is exactly the session where
     somebody is poking at the page by hand. */
  var host = location.hostname;
  var isLocal =
    host === 'localhost' || host === '::1' || host === '[::1]' || host === '0.0.0.0' ||
    host === '' || /\.localhost$/.test(host) || /\.local$/.test(host) ||
    /^127\./.test(host) || /^192\.168\./.test(host) || /^10\./.test(host);
  if (isLocal && cfg.allowLocalhost !== true) return;

  /* Meta's stock snippet, with two changes: `crossOrigin` on the script, and no
     `init`/`track` inside it — those come after, so the queue is installed even
     if this runs twice. The library replays fbq.queue when it loads, so nothing
     below has to wait for the network. */
  if (!window.fbq) {
    var fbq = function () {
      if (fbq.callMethod) {
        fbq.callMethod.apply(fbq, arguments);
      } else {
        fbq.queue.push(arguments);
      }
    };
    fbq.queue = [];
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = '2.0';
    window.fbq = fbq;
    if (!window._fbq) window._fbq = fbq;

    var script = document.createElement('script');
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(script);
  }

  window.fbq('init', cfg.id);
  window.fbq('track', 'PageView');
})();
