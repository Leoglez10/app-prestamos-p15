# Guía del personal

Starlight site built from `docs/MANUAL_PERSONAL.md`. Edit the manual, not the
generated pages: `scripts/sync-manual.mjs` splits it into one page per chapter
on every `dev`/`build`.

```bash
cd guia && bun install
bun run dev     # http://localhost:4321/app-prestamos-p15/
bun run build   # static site in guia/dist
```

Deployed to GitHub Pages by `.github/workflows/guia.yml` on pushes to `main`.
