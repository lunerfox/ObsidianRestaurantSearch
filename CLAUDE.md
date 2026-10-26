# Google Places Search — Obsidian Plugin Instructions

> Maintainer-specific automation — exact vault paths, the self-hosted Gitea URL,
> the issue-processor model flags, the NAS deploy ritual, and the `alpine/git`
> commit wrapper — lives in `CLAUDE.local.md`, which is gitignored and not part of
> the public repo. Everything below is the general, public-safe guidance.
>
> The upstream/public source repo keeps its original PascalCase name
> `ObsidianRestaurantSearch` on GitHub (renaming a public repo breaks inbound
> links). This private dev home is named `obsidian-googleplaces-search`.

Release, versioning, and community-review procedure live in the
`obsidian-plugin-publish` skill. Only facts true of *this* repo live here.

## What this plugin is

`places-search` searches the **Google Places API (New)** directly from Obsidian and
creates structured notes with rich frontmatter (name, address, cuisine/categories,
rating, photos, coordinates, business status, Google Maps link). It supports custom
note templates, multiple template selection, filename patterns, target folders, and
batch updates. It is compatible with [Map View](https://github.com/esm7/obsidian-map-view).
See `README.md` for the full feature reference and the Google Cloud API setup steps.

## Repo facts

- **`manifest.json` identity:** `id` is `places-search`; `name` is `Google Places Search`.
- **Gitea remote:** `LS/obsidian-googleplaces-search`. Intended for eventual
  publication to the Obsidian community directory.
- **Required release assets:** `main.js`, `manifest.json`, `styles.css`.

### Layout

`src/main.ts` + `src/**` (TypeScript) → `dist/main.js` (esbuild). `manifest.json`,
`versions.json`, `styles.css` ship alongside the built `main.js`. Tests live under
`tests/` and run on **vitest** (`npm test` / `npm run test:ci`). Design/spec notes
are kept under `CONTEXT/`. Typecheck with `npm run typecheck`; production build is
`node esbuild.config.mjs production`.

### Google Places specifics

- Targets the **Places API (New)** (`places.googleapis.com/v1`), authenticated with the
  `X-Goog-Api-Key` header (not a query param) for search calls.
- The API key is read from settings (`settings.apiKey`) and passed to
  `GooglePlacesService`; a "validate API key" button in settings exercises a live call.
- Photo media URLs embed the key as a `key=` query param — treat those URLs as secrets
  and never log or persist them outside the note being created.
- **Known follow-up:** the API key currently lives in `data.json` via `saveData`.
  Community review prefers secrets be kept out of synced plugin data; moving the key
  to `app.secretStorage` is to be evaluated before submission. Until then, never log
  the key and never commit `data.json`.
