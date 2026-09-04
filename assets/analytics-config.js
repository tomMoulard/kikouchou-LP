/**
 * PostHog configuration for the landing page.
 *
 * `key` is deliberately empty here and is filled in at deploy time by the
 * "Inject the PostHog key" step in .github/workflows/deploy.yml, from the
 * PUBLIC_POSTHOG_KEY repository secret. Leave it empty in git:
 *
 *   - a local checkout, a fork and a preview build then stay silent rather than
 *     writing events into the real project, and
 *   - the key lives in one place, so rotating it means changing the secret
 *     rather than landing a commit.
 *
 * Both `key` and `host` must be set or analytics is off entirely —
 * assets/analytics.js loads nothing and captures nothing. That mirrors the
 * app's own contract in `src/lib/posthog.ts`.
 *
 * The key is a publishable client token (`phc_…`), not a credential: it can
 * only write events, which is why it is fine for it to sit in a public file
 * once deployed. A personal API key never belongs in a static site.
 *
 * Everything other than the key is configured here rather than in CI, so this
 * file stays the single source of truth for how analytics behaves.
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
  /* Injected from the PUBLIC_POSTHOG_KEY secret on deploy. Keep it empty here —
     the workflow matches this exact line, so do not reformat it. */
  key: '',
  host: 'https://eu.i.posthog.com',
  persistence: 'memory',
};
