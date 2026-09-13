# kikouchou-LP

The landing page for [Kikouchou](https://app.kikouchou.app) — the app that takes
the mental load of a group holiday off the person organising it: who sleeps
where, and who is picking up whom.

- **Live:** <https://www.kikouchou.app>
- **The app:** <https://app.kikouchou.app>
- **The app's source:** <https://github.com/tomMoulard/kikouchou>

## How it is built

Plain static files. No framework, no bundler, no build step — GitHub Actions
copies the site into `_site` and hands it to GitHub Pages on every push to
`main`. That means editing a file and pushing is the whole deploy process, and
there is no toolchain to keep alive between trips.

```
index.html                   the entire page
404.html                     not-found page
assets/styles.css            design tokens + every component
assets/app.js                language, theme, nav, scroll reveal
assets/i18n/fr.js            French copy (English lives in index.html)
assets/analytics-config.js   PostHog key + persistence choice
assets/analytics.js          PostHog loader
assets/img/                  logo, favicon, icons, Open Graph image
CNAME                        www.kikouchou.app
site.webmanifest             icon + name metadata for the browser
sitemap.xml robots.txt
```

Design tokens (teal `#14b8a6` on slate `#0f172a`, the guest colour palette) are
taken from the app itself so the site and the product look like one thing.

### Working on it locally

Any static file server will do:

```bash
python3 -m http.server 4173
# then open http://localhost:4173
```

## Editing the copy

English is written directly in `index.html`. Every translatable node carries a
key:

| attribute          | effect                                          |
|--------------------|-------------------------------------------------|
| `data-i18n`        | replaces the element's text (markup is allowed) |
| `data-i18n-html`   | same, for nodes whose English contains markup   |
| `data-i18n-aria`   | replaces the element's `aria-label`             |

`assets/i18n/fr.js` holds the French value for each of those keys. English needs
no dictionary: `app.js` snapshots the markup on load and restores it when you
switch back, so the two can never drift apart.

To check that no key has been left untranslated after an edit:

```bash
python3 - <<'PY'
import re, subprocess, json
html = open('index.html').read()
keys = set()
for attr in ('data-i18n', 'data-i18n-html', 'data-i18n-aria'):
    keys |= set(re.findall(attr + r'="([^"]+)"', html))
out = subprocess.run(
    ['node', '-e',
     'global.window={};require("./assets/i18n/fr.js");'
     'console.log(JSON.stringify(Object.keys(window.KKC_I18N.fr)))'],
    capture_output=True, text=True)
fr = set(json.loads(out.stdout))
meta = {'html.lang', 'html.title', 'html.description'}
print('missing from fr.js:', sorted(keys - fr) or 'none')
print('unused in fr.js:  ', sorted(fr - keys - meta) or 'none')
PY
```

### Adding a language

1. Copy `assets/i18n/fr.js` to `assets/i18n/<code>.js` and translate the values.
2. Add its `<script>` tag next to the French one at the bottom of `index.html`.
3. Push the code onto `LOCALES` in `assets/app.js`.
4. Add a button to the `.lang` group in the header:
   `<button type="button" data-lang="<code>" aria-pressed="false">XX</button>`
5. Add an `hreflang` link in `<head>` and an entry in `sitemap.xml`.

The browser's preferred language is detected on first visit; `?lang=<code>`
forces one, and an explicit choice is remembered in `localStorage`.

## Analytics

PostHog, configured in `assets/analytics-config.js`. **With no key there,
nothing loads and nothing is captured** — the same contract the app uses in
`src/lib/posthog.ts`.

The key is not in git. `key` stays empty in the committed file and the
**`PUBLIC_POSTHOG_KEY`** repository secret is substituted into the staged copy
by the *Inject the PostHog key* step of the deploy workflow. So a local
checkout, a fork and a preview build all stay silent, and rotating the key means
editing the secret rather than landing a commit. Everything else — host,
persistence — stays in the committed file, which remains the single source of
truth for how analytics behaves.

The step is deliberately strict, because analytics that silently stops
reporting is worse than a red build:

| `PUBLIC_POSTHOG_KEY` | result |
|---|---|
| unset | warning, deploy continues with analytics off |
| `phc_…`, valid charset | substituted, `node --check`ed, deploy continues |
| anything else | build fails with an error naming the expected shape |

Only `phc_` plus `[A-Za-z0-9_-]` is accepted, which is also what makes it safe
to hand to `sed`. To change the key: **Settings → Secrets and variables →
Actions → `PUBLIC_POSTHOG_KEY`**, then re-run the workflow.

It also refuses to run on localhost and on LAN addresses unless
`allowLocalhost: true` is set. The app's PostHog project once accumulated 20
persons against 3 real accounts, 19 of them minted on dev servers; the checks in
this repo run against a local server, so without the guard every test run would
invent a visitor.

Captured: one pageview, autocaptured clicks (so click maps and heatmaps work),
`landing_cta_clicked` (with which of the five CTAs it was — `header`, `hero`,
`cta-band`, `install`, `footer`), and `landing_language_switched`. Session
recording is off, and the page has no input fields at all, so there is nothing a
visitor can type that could be captured.

### Cookies and consent

The committed default is `persistence: 'memory'` — nothing is stored in the
visitor's browser, so no consent banner is needed anywhere in the EU. The cost
is that every visit looks like a new anonymous visitor, so "unique visitors" and
returning-visitor figures are not meaningful.

Switching to `'localStorage+cookie'` (PostHog's default) gives real unique
visitors and return visits, but it stores an identifier in the browser, which
needs consent under GDPR/ePrivacy for EU visitors — so it has to come with a
consent banner. Given the audience is largely French, that is a deliberate
choice rather than a default to drift into.

## The install CTA

The **Install on your phone** button in the closing CTA band points at
`https://app.kikouchou.app/?install=1` rather than at the `#install` section.
That query parameter is a contract with the app: it means *this visitor came
here to install*, and the app is expected to surface its install affordance
immediately instead of waiting for its own heuristics (`useInstallPrompt` +
`InstallPrompt`, which otherwise stays hidden for seven days after a dismissal).

No link can install a PWA on its own — the prompt needs a gesture inside the
app's own origin, and only Chromium browsers offer one at all. So the parameter
is a hint, not a guarantee, and the header's and footer's **Install** nav links
still go to the `#install` section, which explains the manual steps for every
browser. Do not repoint them at the app: Safari on iOS and Firefox have no
install prompt, and those steps are the only path there.

## DNS

`CNAME` claims `www.kikouchou.app`. For that to resolve, the domain needs:

| record | name  | value                     |
|--------|-------|---------------------------|
| CNAME  | `www` | `tommoulard.github.io`    |
| A      | `@`   | `185.199.108.153` … `111.153` (GitHub Pages apex IPs), to redirect the bare domain |

Then enable **Enforce HTTPS** in the repository's Pages settings once the
certificate has been issued.

## Keeping the copy honest

The page describes the app as it actually behaves, and a few of its claims are
easy to get wrong:

- **Sharing goes through a server.** Trips sync via a cloud database hosted in
  Europe. The app's `sharing.p2pDescription` / `p2pNotice` locale strings still
  describe a serverless QR handoff, but nothing references them any more — do
  not write copy from them. The WebRTC peer-to-peer transport was retired in
  August 2026: never market "peer to peer".
- **Guests do not need an account to read.** An invite link opens the trip
  read-only on any device (`src/lib/sync/viewer.ts`, `viewer.description`), and
  the visitor can already say which guest they are. The account is asked for at
  the first *edit*. The old "create an account first" wall is gone, so do not
  put it back into the copy.
- **Capacity warns, it does not block.** `QuickAssignmentDialog.tsx` shows
  `rooms.capacityWarning` and still lets the assignment through, so people can
  share a bed if they want to. The guest-facing room picker does disable a room
  that is already full.
- **Money is in the app, meals are not.** `src/features/money/` ships expense
  lines with four split modes (equally, by parts, by nights, by amount),
  balances and a minimal settle-up list. Meal planning and shopping lists are
  still absent — the FAQ says so, keep it that way.
- **Reminders are three pushes, and they have conditions.** The evening before
  the trip, before your own arrival, before a lift you are part of
  (`reminders.description`). They need an account, and on iOS the app must be
  installed first (`reminders.settingsUnsupported`). The service never states a
  clock time, because it does not know the house's timezone.
- **Do not advertise anything flag-gated.** The one-question-at-a-time trip
  wizard is a live A/B behind the PostHog flag `first-trip-wizard`; sharing a
  guest's phone number is behind `guest-phone-sharing` and *fails closed*, so on
  a default build phone numbers never leave the device — the page may say you
  can store one, never that the group can see it. Passkey sign-in rides a
  Supabase experimental flag; the copy names Google and email links only.

## Licence

MIT, like the app.
