# Calculator

Pixel-style calculator as a standalone static PWA — no app store install required.

**Live:** https://calculator.silocitylabs.com

## Features

- Instant results as you type
- Basic + scientific keypad (√ π ^ ! sin cos tan ln log Deg/Rad Inv)
- History with copy / memory store (MS)
- Installable offline PWA
- Keyboard support on desktop

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
