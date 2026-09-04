# kikouchou-LP

The landing page for [Kikouchou](https://app.kikouchou.app) — the app that keeps
track of who sleeps where and who picks up whom during a group holiday in a
rented house.

- **Live:** <https://www.kikouchou.app>
- **The app:** <https://app.kikouchou.app>
- **The app's source:** <https://github.com/tomMoulard/kikouchou>

## How it is built

Plain static files. No framework, no bundler, no build step — GitHub Actions
copies the site into `_site` and hands it to GitHub Pages on every push to
`main`. That means editing a file and pushing is the whole deploy process, and
there is no toolchain to keep alive between trips.

```
index.html            the entire page
404.html              not-found page
assets/styles.css     design tokens + every component
assets/app.js         language, theme, nav, scroll reveal
assets/i18n/fr.js     French copy (English lives in index.html)
assets/img/           logo, favicon, icons, Open Graph image
CNAME                 www.kikouchou.app
site.webmanifest      icon + name metadata for the browser
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

## DNS

`CNAME` claims `www.kikouchou.app`. For that to resolve, the domain needs:

| record | name  | value                     |
|--------|-------|---------------------------|
| CNAME  | `www` | `tommoulard.github.io`    |
| A      | `@`   | `185.199.108.153` … `111.153` (GitHub Pages apex IPs), to redirect the bare domain |

Then enable **Enforce HTTPS** in the repository's Pages settings once the
certificate has been issued.

## Licence

MIT, like the app.
