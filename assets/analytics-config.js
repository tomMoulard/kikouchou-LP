/**
 * PostHog credentials for the landing page.
 *
 * Both fields must be set or analytics is off entirely — assets/analytics.js
 * loads nothing and captures nothing. That mirrors the app's own contract in
 * `src/lib/posthog.ts`, so a fork, a local checkout or a preview build stays
 * silent instead of writing into the real project.
 *
 * The project API key is a publishable client token (`phc_…`), not a secret: it
 * can only write events. The private key never belongs in a static site.
 *
 * `persistence` decides whether visitors are counted across visits:
 *   'memory'            — no cookies, no localStorage. Nothing is stored in the
 *                         browser, so no consent banner is needed anywhere in
 *                         the EU. The cost is that every visit is a new
 *                         anonymous visitor, so "unique visitors" and
 *                         returning-visitor numbers are not meaningful.
 *   'localStorage+cookie' — PostHog's default. Real unique visitors and return
 *                         visits, but it stores an identifier in the browser,
 *                         which needs consent under GDPR/ePrivacy for visitors
 *                         in the EU — so pair it with a consent banner.
 */
window.KKC_ANALYTICS = {
  /* Paste the Kikouchou project's API key here to switch analytics on. */
  key: '',
  host: 'https://eu.i.posthog.com',
  persistence: 'memory',
};
