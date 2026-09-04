/**
 * Kikouchou landing page behaviour.
 *
 * Deliberately dependency-free and framework-free: the page is served straight
 * from the repository root by GitHub Pages with no build step, so there is
 * nothing here that needs compiling.
 *
 * Responsibilities:
 *   1. language  — detect, apply and remember EN/FR (extensible to more)
 *   2. theme     — light/dark with a system default
 *   3. nav       — mobile sheet, sticky-header shadow
 *   4. reveal    — scroll-in animation, skipped for reduced-motion users
 */
(function () {
  'use strict';

  var doc = document,
      root = doc.documentElement;

  /* ====================================================================
     1. Language
     ====================================================================
     English lives in the HTML itself so crawlers and no-JS visitors get real
     content. Other languages are dictionaries in assets/i18n/<code>.js that
     overwrite the marked-up strings.

     To add a language: create assets/i18n/<code>.js on the model of fr.js,
     add its <script> to index.html, push the code onto LOCALES, and add a
     button to the .lang group in the header. Nothing else here changes. */
  var LOCALES = ['en', 'fr'],
      DEFAULT_LOCALE = 'en',
      STORE_LANG = 'kkc-lang',
      dicts = window.KKC_I18N || {},
      /* Snapshot of the English markup, so switching back to EN is lossless
         and does not need a second dictionary file. */
      englishSnapshot = null,
      currentLang = DEFAULT_LOCALE;

  function i18nNodes() {
    return doc.querySelectorAll('[data-i18n], [data-i18n-html], [data-i18n-aria]');
  }

  function takeEnglishSnapshot() {
    var snap = {};
    i18nNodes().forEach(function (el) {
      if (el.dataset.i18n) snap['t:' + el.dataset.i18n] = el.innerHTML;
      if (el.dataset.i18nHtml) snap['t:' + el.dataset.i18nHtml] = el.innerHTML;
      if (el.dataset.i18nAria) snap['a:' + el.dataset.i18nAria] = el.getAttribute('aria-label');
    });
    snap['meta:title'] = doc.title;
    var desc = doc.querySelector('meta[name="description"]');
    snap['meta:description'] = desc ? desc.content : '';
    return snap;
  }

  /* Copy is authored by us, never by a visitor, so assigning it as HTML is safe
     here — it is what lets "<b>Partager</b>" inside a sentence keep its
     emphasis. `asHtml` is forced for the English snapshot, which was read out
     of innerHTML and therefore carries entities ("Rooms &amp; calendar") that
     textContent would render literally. */
  function setCopy(el, value, asHtml) {
    if (asHtml || value.indexOf('<') !== -1) el.innerHTML = value;
    else el.textContent = value;
  }

  function applyLang(lang) {
    if (LOCALES.indexOf(lang) === -1) lang = DEFAULT_LOCALE;
    if (englishSnapshot === null) englishSnapshot = takeEnglishSnapshot();

    var dict = lang === DEFAULT_LOCALE ? null : dicts[lang];
    if (lang !== DEFAULT_LOCALE && !dict) return; /* dictionary failed to load */

    i18nNodes().forEach(function (el) {
      var textKey = el.dataset.i18n || el.dataset.i18nHtml,
          ariaKey = el.dataset.i18nAria,
          value;

      if (textKey) {
        value = dict ? dict[textKey] : englishSnapshot['t:' + textKey];
        if (typeof value === 'string') setCopy(el, value, !dict);
      }
      if (ariaKey) {
        value = dict ? dict[ariaKey] : englishSnapshot['a:' + ariaKey];
        if (typeof value === 'string') el.setAttribute('aria-label', value);
      }
    });

    fillAvatarInitials();

    doc.title = (dict && dict['html.title']) || englishSnapshot['meta:title'];
    var desc = doc.querySelector('meta[name="description"]');
    if (desc) desc.content = (dict && dict['html.description']) || englishSnapshot['meta:description'];

    root.lang = lang;
    currentLang = lang;

    doc.querySelectorAll('.lang [data-lang]').forEach(function (btn) {
      btn.setAttribute('aria-pressed', String(btn.dataset.lang === lang));
    });

    var canonical = doc.querySelector('link[rel="canonical"]');
    if (canonical) {
      canonical.href = 'https://www.kikouchou.app/' + (lang === DEFAULT_LOCALE ? '' : '?lang=' + lang);
    }
  }

  /* The mockups pair a coloured circle with a name. Deriving the letter from
     the name it sits next to means a translated name can never disagree with
     its own initial — the example names differ between locales. */
  function fillAvatarInitials() {
    doc.querySelectorAll('.avatar[data-initial]').forEach(function (el) {
      var label = el.nextElementSibling;
      var name = label ? label.textContent.trim() : '';
      el.textContent = name ? name.charAt(0).toLocaleUpperCase(root.lang || 'en') : '';
    });
  }

  function pickInitialLang() {
    /* Explicit ?lang= wins, then a remembered choice, then the browser. */
    var fromUrl = new URLSearchParams(location.search).get('lang');
    if (fromUrl && LOCALES.indexOf(fromUrl) !== -1) return fromUrl;

    var stored = null;
    try { stored = localStorage.getItem(STORE_LANG); } catch (e) { /* private mode */ }
    if (stored && LOCALES.indexOf(stored) !== -1) return stored;

    var prefs = navigator.languages || [navigator.language || ''];
    for (var i = 0; i < prefs.length; i++) {
      var code = String(prefs[i]).slice(0, 2).toLowerCase();
      if (LOCALES.indexOf(code) !== -1) return code;
    }
    return DEFAULT_LOCALE;
  }

  doc.querySelectorAll('.lang [data-lang]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var lang = btn.dataset.lang;
      applyLang(lang);
      try { localStorage.setItem(STORE_LANG, lang); } catch (e) { /* private mode */ }
    });
  });

  applyLang(pickInitialLang());

  /* ====================================================================
     2. Theme
     ==================================================================== */
  var STORE_THEME = 'kkc-theme',
      themeToggle = doc.getElementById('theme-toggle');

  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      var next = root.dataset.theme === 'dark' ? 'light' : 'dark';
      root.dataset.theme = next;
      try { localStorage.setItem(STORE_THEME, next); } catch (e) { /* private mode */ }
    });
  }

  /* Follow the OS while the visitor has not made an explicit choice. */
  var mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', function (e) {
    var chosen = null;
    try { chosen = localStorage.getItem(STORE_THEME); } catch (err) { /* private mode */ }
    if (chosen !== 'light' && chosen !== 'dark') {
      root.dataset.theme = e.matches ? 'dark' : 'light';
    }
  });

  /* ====================================================================
     3. Navigation
     ==================================================================== */
  var nav = doc.getElementById('nav'),
      navToggle = doc.getElementById('nav-toggle'),
      header = doc.getElementById('header');

  function closeNav() {
    if (!nav || !navToggle) return;
    nav.dataset.open = 'false';
    navToggle.setAttribute('aria-expanded', 'false');
  }

  if (nav && navToggle) {
    navToggle.addEventListener('click', function () {
      var open = nav.dataset.open === 'true';
      nav.dataset.open = String(!open);
      navToggle.setAttribute('aria-expanded', String(!open));
    });

    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) closeNav();
    });

    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeNav();
    });

    /* A resize past the breakpoint leaves the sheet orphaned otherwise. */
    window.matchMedia('(min-width: 1140px)').addEventListener('change', closeNav);
  }

  if (header) {
    var onScroll = function () {
      header.dataset.stuck = String(window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ====================================================================
     4. Scroll reveal
     ==================================================================== */
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      revealables = doc.querySelectorAll('[data-reveal]');

  if (reduced || !('IntersectionObserver' in window)) {
    revealables.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });

    revealables.forEach(function (el, i) {
      el.style.transitionDelay = (i % 3) * 70 + 'ms';
      io.observe(el);
    });
  }
})();
