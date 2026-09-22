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

  /* Session recording — PostHog replays what a visitor did on the page.
     Click maps, rageclick maps and scroll depth do not depend on this: they
     come from autocapture, which is on in assets/analytics.js either way.

     Two things to know before leaving this on.

     A recording is personal data under GDPR whatever `persistence` says. The
     'memory' setting above keeps recording out of the cookie-consent question,
     because nothing is written to the visitor's browser, but the recording
     itself still needs a lawful basis and a line in the privacy notice.

     'memory' also cuts the recordings up. The session id lives in memory only,
     so it goes when the page unloads: one visitor who reads the page, leaves
     and comes back is two short recordings rather than one journey. Whole
     journeys need 'localStorage+cookie' above, and that needs a consent
     banner.

     Masking is set in assets/analytics.js, not here. */
  sessionRecording: true,

  /* Meta Pixel, read by assets/meta-pixel.js. The id from Events Manager and
     nothing else.

     Committed rather than injected on deploy, which is the opposite of the
     PostHog key above, and the difference is what each one is. `phc_…` writes
     into an analytics project a fork would pollute invisibly; a pixel id is
     public by construction — Meta's own instructions put it in the page source
     — and Events Manager can be told which domains it accepts. Empty turns the
     pixel off entirely.

     The app carries the same id in `src/lib/meta-pixel.ts`, so a visitor who
     clicks through and installs is one person to Meta rather than two. */
  metaPixel: {
    id: '2066436523976108',
    /* Load the pixel on a local server. Leave this false: traffic from your
       machine is real traffic in a real ad account. */
    allowLocalhost: false,
  },
};
