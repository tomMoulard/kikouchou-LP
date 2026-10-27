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
 *   5. flap      - flips the hero question letter by letter, like a station board
 *   6. vsl       - play/pause for the hero's animated sales letter
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

    // The hero headline listens for this to drop a flip that the new copy replaced.
    doc.dispatchEvent(new Event('kkc:lang'));
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

    /* A tap outside the open sheet dismisses it, as Escape does on a keyboard. */
    doc.addEventListener('click', function (e) {
      if (nav.dataset.open !== 'true') return;
      if (nav.contains(e.target) || navToggle.contains(e.target)) return;
      closeNav();
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

  /* ====================================================================
     5. Split-flap headline
     ====================================================================
     Every few seconds the question in the headline changes the way a station
     departures board does: each letter flips through a few others before it
     lands on the next question, a little after the letter on its left. The
     letters are cut apart only while they flip, so at rest the headline is
     plain text with its kerning. It stops while the hero is off screen or the
     tab is hidden. Reduced-motion visitors keep the first question. */
  var flapQs = doc.querySelectorAll('.flap__q'),
      FLAP_SPIN = 'abcdefghijklmnopqrstuvwxyz',
      FLAP_STEP_MS = 110;

  if (flapQs.length > 1 && !reduced && Element.prototype.animate) {
    var flapIndex = 0,
        flapRound = 0,
        flapBusy = false,
        flapOnScreen = true;

    var questionText = function (el) {
      return el.textContent.trim().replace(/[ \t\r\n]+/g, ' ');
    };

    var flapHalf = function (side) {
      var half = doc.createElement('span');
      half.className = 'flap__half flap__half--' + side;
      return half;
    };

    // One `.flap__ch` per letter, inside one unbreakable `.flap__word` per
    // word, so the question wraps exactly where its plain text would.
    var cutIntoLetters = function (em, text) {
      var cells = [];
      em.textContent = '';
      text.split(' ').forEach(function (word, w) {
        if (w) em.appendChild(doc.createTextNode(' '));
        var wordEl = doc.createElement('span');
        wordEl.className = 'flap__word';
        for (var i = 0; i < word.length; i++) {
          var cell = doc.createElement('span');
          cell.className = 'flap__ch';
          cell.textContent = word.charAt(i);
          cell.appendChild(flapHalf('top'));
          cell.appendChild(flapHalf('bottom'));
          wordEl.appendChild(cell);
          cells.push(cell);
        }
        em.appendChild(wordEl);
      });
      return cells;
    };

    // One flip: the top half carries the old letter down to the middle of the
    // line, then the new letter's bottom half swings down from it.
    var flipLetter = function (cell, ch) {
      var top = cell.children[0],
          bottom = cell.children[1],
          fall = top.animate(
            [{ transform: 'rotateX(0deg)' }, { transform: 'rotateX(-90deg)' }],
            { duration: FLAP_STEP_MS / 2, easing: 'ease-in', fill: 'forwards' }
          );
      return fall.finished.then(function () {
        top.textContent = ch;
        bottom.textContent = ch;
        fall.cancel();
        return bottom.animate(
          [{ transform: 'rotateX(90deg)' }, { transform: 'rotateX(0deg)' }],
          { duration: FLAP_STEP_MS / 2, easing: 'ease-out' }
        ).finished;
      });
    };

    var randomLetter = function () {
      return FLAP_SPIN.charAt(Math.floor(Math.random() * FLAP_SPIN.length));
    };

    // A letter starts from the old question's letter in the same place, hunts
    // through one to three random letters and lands on its own.
    var spinLetter = function (cell, start, target, delay) {
      // The no-break space before a French "?" is too narrow to show a letter.
      if (/\s/.test(target)) return Promise.resolve();
      var steps = [],
          spins = 1 + Math.floor(Math.random() * 3);
      cell.children[0].textContent = cell.children[1].textContent = start || randomLetter();
      for (var i = 0; i < spins; i++) steps.push(randomLetter());
      steps.push(target);
      return new Promise(function (resolve) { window.setTimeout(resolve, delay); })
        .then(function next() {
          if (!steps.length) return;
          return flipLetter(cell, steps.shift()).then(next);
        });
    };

    var showQuestion = function (next) {
      var round = flapRound,
          em = flapQs[next].querySelector('em'),
          from = questionText(flapQs[flapIndex]).replace(/ /g, ''),
          text = questionText(em),
          cells = cutIntoLetters(em, text);

      flapQs[flapIndex].classList.remove('is-on');
      flapQs[next].classList.add('is-on');
      flapIndex = next;
      flapBusy = true;

      Promise.all(cells.map(function (cell, i) {
        return spinLetter(cell, from.charAt(i), cell.firstChild.nodeValue, i * 35);
      })).then(function () {
        // A language switch during the flip already put the translated
        // question in place; the old text must not overwrite it.
        if (round === flapRound) em.textContent = text;
        flapBusy = false;
      });
    };

    doc.addEventListener('kkc:lang', function () { flapRound++; });

    window.setInterval(function () {
      if (flapBusy || doc.hidden || !flapOnScreen) return;
      showQuestion((flapIndex + 1) % flapQs.length);
    }, 3200);

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        flapOnScreen = entries[0].isIntersecting;
      }).observe(flapQs[0].parentNode);
    }
  }

  /* ====================================================================
     6. Video sales letter
     ====================================================================
     The hero letter is pure CSS running on one 30-second clock, so the only
     thing left for JavaScript is to stop and start that clock. It pauses while
     the letter is off screen — a visitor reading the FAQ should not pay for six
     scenes nobody can see — and an explicit pause outranks scrolling back to
     it. Reduced-motion visitors get no clock at all: the stylesheet draws each
     scene at rest, and the step buttons below show one scene at a time. */
  var vsl = doc.getElementById('vsl'),
      vslPlay = doc.getElementById('vsl-play');

  if (vsl && vslPlay && !reduced) {
    var vslPausedByUser = false,
        vslOnScreen = true;

    var renderVsl = function () {
      vsl.classList.toggle('is-paused', vslPausedByUser || !vslOnScreen);
    };

    vslPlay.addEventListener('click', function () {
      vslPausedByUser = !vslPausedByUser;
      renderVsl();
    });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        vslOnScreen = entries[0].isIntersecting;
        renderVsl();
      }, { threshold: 0.12 }).observe(vsl);
    }
  }

  var vslScenes = vsl ? vsl.querySelectorAll('.vsl__scene') : [],
      vslPrev = doc.getElementById('vsl-prev'),
      vslNext = doc.getElementById('vsl-next'),
      vslCount = doc.getElementById('vsl-count');

  if (vslScenes.length && vslPrev && vslNext && vslCount) {
    var vslStep = 0;

    var showVslStep = function (i) {
      vslStep = Math.max(0, Math.min(vslScenes.length - 1, i));
      vslScenes.forEach(function (scene, n) {
        scene.classList.toggle('is-current', n === vslStep);
      });
      vslPrev.disabled = vslStep === 0;
      vslNext.disabled = vslStep === vslScenes.length - 1;
      vslCount.textContent = (vslStep + 1) + ' / ' + vslScenes.length;
      vsl.style.setProperty('--vsl-step', (vslStep + 1) / vslScenes.length);
    };

    vslPrev.addEventListener('click', function () { showVslStep(vslStep - 1); });
    vslNext.addEventListener('click', function () { showVslStep(vslStep + 1); });
    showVslStep(0);

    // The class, not the media query, turns step mode on, so a visitor who
    // changes the setting with the page open gets the right player.
    var reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)'),
        syncVslMode = function () { vsl.classList.toggle('is-stepping', reducedQuery.matches); };
    syncVslMode();
    if (reducedQuery.addEventListener) reducedQuery.addEventListener('change', syncVslMode);
  }
})();
