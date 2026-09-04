/**
 * PostHog analytics for the landing page.
 *
 * Credentials live in assets/analytics-config.js. With no key there this file
 * loads nothing, requests nothing and defines no globals — the same "absent
 * config means silence" contract the app uses in `src/lib/posthog.ts`.
 *
 * What it captures: one pageview, autocaptured clicks (so click maps and
 * heatmaps work), and two named events — a click on any call to action, and a
 * language switch. Session recording is off. There is not a single input on
 * this page, so nothing a visitor types can be captured.
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
  script.onload = start;
  document.head.appendChild(script);

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
    });

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
