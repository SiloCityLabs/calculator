# AGENTS.md

Context for AI agents working on **SiloCityLabs/calculator**.

## What this is

A **standalone static PWA** that approximates the Google / Pixel Calculator experience — no build step, no framework, no app store. Part of an “appless” push: replace heavy Play Store apps with tiny installable web apps.

| | |
|---|---|
| **Live** | https://calculator.silocitylabs.com |
| **Repo** | https://github.com/SiloCityLabs/calculator |
| **Stack** | Plain HTML / CSS / JS |
| **Host** | GitHub Pages via Actions |
| **License** | CC BY-SA 4.0 |

## Goals

- Feel like stock Google Calculator (layout & behavior), not a novelty widget.
- Stay tiny (target: well under 200 KB shipped).
- Work offline after install (service worker).
- Deploy from `main` with zero build tooling.

## Layout (match stock)

Ignore Material You dynamic colors from screenshots — stock pulls theme from the phone. We ship fixed **dark / light / system** themes.

| Mode | Behavior |
|---|---|
| **Portrait (phone)** | 4-column **circular** keys: `AC () % ÷` then numbers + ops |
| **Landscape (phone)** | 5-column **pill** keys: `7 8 9 AC ×` / `4 5 6 () −` / `1 2 3 % +` / `0 . ⌫ ÷ =` |
| **Wide tablet/desktop** | Persistent **history** column left + 5-column pill keypad |

Scientific pad toggles above the main pad (√ π ^ ! Deg/Rad sin cos tan Inv e ln log).

## Source map

| File | Role |
|---|---|
| `index.html` | Shell, keypad markup, early theme boot script |
| `styles.css` | Themes, portrait / landscape / wide layouts |
| `calc.js` | Expression tokenizer + RPN evaluator (`CalcEngine`) |
| `app.js` | UI state, history, memory, theme, keyboard, SW register |
| `sw.js` | Offline cache — **bump `CACHE` version on asset changes** |
| `manifest.webmanifest` | PWA manifest (`orientation: any`) |
| `CNAME` | `calculator.silocitylabs.com` |
| `icons/` | Circular `any` icons + full-bleed `maskable` icons |
| `images/icon.png` | Source brand artwork (square); derive icons from this |
| `.github/workflows/deploy.yml` | Copies static files → Pages artifact |

Reference Play Store screenshots may live under `images/` but are **gitignored** and must not ship.

## Conventions

- **No bundler / npm.** Edit files directly; preview with `python3 -m http.server`.
- Relative URLs only (`./`) so project Pages + custom domain both work.
- Keep `user-select: none` on chrome/keys; **expression, result, and history text must stay selectable**.
- PWA icons: `purpose: any` = circular with transparent corners; `purpose: maskable` = opaque full-bleed square (avoids “square inside a circle”).
- After icon/manifest changes, users often must **uninstall + reinstall** the PWA for the launcher icon to refresh.
- Prefer matching Google Calculator UX over inventing new patterns.

## Themes

Menu cycles **system → light → dark** (`localStorage` key `calc.theme.v1`). CSS variables live on `:root` / `[data-theme="…"]`. Sync `theme-color` meta when theme changes.

## Deploy checklist (every meaningful ship)

1. Bump `CACHE` in `sw.js` if cached assets changed.
2. **Update README size numbers** (see below) — required every deploy that changes shipped bytes.
3. Push to `main`; Actions deploys automatically.

### README size (required update)

The README compares this PWA to the Play Store Google Calculator (~10.32 MB). Those KB figures go stale quickly — **recompute and update the Size section on every deploy**.

Measure the same set the workflow ships (`index.html`, `styles.css`, `calc.js`, `app.js`, `sw.js`, `manifest.webmanifest`, `.nojekyll`, `CNAME`, `icons/**`, `images/icon.png` if present):

```bash
python3 - <<'PY'
import os, io, gzip
files = []
for p in ['index.html','styles.css','calc.js','app.js','sw.js','manifest.webmanifest','.nojekyll','CNAME']:
    if os.path.exists(p): files.append(p)
for dp, _, fs in os.walk('icons'):
    for f in fs: files.append(os.path.join(dp, f))
if os.path.exists('images/icon.png'): files.append('images/icon.png')
total = sum(os.path.getsize(p) for p in files)
gz = 0
for p in files:
    data = open(p, 'rb').read()
    if p.endswith(('.html', '.css', '.js', '.webmanifest')) or os.path.basename(p) in ('CNAME', '.nojekyll'):
        buf = io.BytesIO()
        with gzip.GzipFile(fileobj=buf, mode='wb', compresslevel=9) as g:
            g.write(data)
        gz += len(buf.getvalue())
    else:
        gz += os.path.getsize(p)
print(f'{len(files)} files | {total/1024:.1f} KB uncompressed | ~{gz/1024:.1f} KB gzip-ish')
print(f'vs 10.32 MB → ~{10320000/total:.0f}× smaller')
PY
```

Update both the intro paragraph and the Size table in `README.md`.

## Local preview

```bash
python3 -m http.server 8080
```

Open http://localhost:8080 — prefer http(s), not `file://`, so the service worker can register.

## Out of scope

- Native apps, Capacitor, React/Vue/Svelte, CSS frameworks
- Tracking, ads, accounts, backend APIs
- Shipping design-reference screenshots
