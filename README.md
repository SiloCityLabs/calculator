# Calculator

Pixel-style calculator as a standalone static PWA — no app store install required.

**Live:** https://calculator.silocitylabs.com

My journey to an appless life starts with PWAs. The Play Store Google Calculator sits at **~10.32 MB** on my phone. This PWA ships the same kind of experience in about **99 KB** (~67 KB transferred with gzip) — roughly **100× smaller**, fully offline once installed, and no store required.

## Features

- Instant results as you type
- Basic + scientific keypad (√ π ^ ! sin cos tan ln log Deg/Rad Inv)
- History with copy / memory store (MS)
- Installable offline PWA
- Keyboard support on desktop

## Size

| | Size |
|---|---|
| Android Calculator (Play Store) | ~10.32 MB |
| This PWA (all shipped files) | **~99 KB** (0.096 MB) |
| Typical transfer (gzip text + icons) | **~67 KB** |

## Deploy

Hosted on GitHub Pages via Actions.

- Repo: https://github.com/SiloCityLabs/calculator
- Custom domain: `calculator.silocitylabs.com`
- Workflow: `.github/workflows/deploy.yml` (deploys on push to `main`)

DNS should point a CNAME for `calculator` → `silocitylabs.github.io`.

In the repo: **Settings → Pages → Source = GitHub Actions**, custom domain set to `calculator.silocitylabs.com`, Enforce HTTPS on.

## Local preview

```bash
python3 -m http.server 8080
```

Open http://localhost:8080

## License

[CC BY-SA 4.0](LICENSE)
