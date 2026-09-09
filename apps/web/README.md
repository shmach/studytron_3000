# web

React + Vite + TypeScript frontend for course-builder. Reads the vault through
the `local-server` API and renders the course list and each course's
curriculum. UI built with Tailwind v4 + shadcn/ui, data fetching with
TanStack Query over a typed `openapi-fetch` client.

## Run it

Two terminals from the repo root:

```sh
# 1) API on http://localhost:8000 (see apps/local-server/README.md)
VAULT_PATH=/path/to/your/vault uv run fastapi dev apps/local-server/main.py

# 2) frontend on http://localhost:5173
cd apps/web
npm install
npm run dev
```

The frontend calls `http://localhost:8000` by default. To point it elsewhere,
copy `.env.example` to `.env` and set `VITE_API_BASE_URL`.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | typecheck + production build into `dist/` |
| `npm run preview` | serve the production build locally |
| `npm run typecheck` | `tsc -b` only |
| `npm run lint` | oxlint |
| `npm run generate:types` | regenerate `src/api/schema.d.ts` from the server's OpenAPI |

## Types from the API (no duplicated definitions)

`src/api/schema.d.ts` is **generated** from the FastAPI OpenAPI schema and is
committed so a fresh clone builds without the server running. Whenever the
Pydantic models or routes change:

```sh
cd apps/web
npm run generate:types
```

That runs `uv run export-openapi --out openapi.json` (a small script in
`local-server` that dumps `app.openapi()`) and then `openapi-typescript`.
Both `openapi.json` and `schema.d.ts` should be committed together.

## Layout

```
src/
  api/
    schema.d.ts     <- generated, do not edit
    client.ts       <- openapi-fetch client + type aliases (CourseBundle, Topic, ...)
    queries.ts      <- TanStack Query options + query keys
  hooks/
    useCourses.ts   <- GET /courses
    useCourse.ts    <- GET /courses/{slug}
  components/
    ui/             <- shadcn/ui components (add more with `npx shadcn@latest add <name>`)
    app-layout.tsx  <- header + <Outlet/>
    status-badge.tsx
    error-state.tsx
  pages/
    courses-page.tsx    <- /
    course-page.tsx     <- /courses/:slug
    not-found-page.tsx
  lib/
    utils.ts        <- cn()
    query-client.ts
    progress.ts     <- topic status aggregation
  router.tsx
  App.tsx
```

## Adding shadcn/ui components

`components.json` is already configured, so:

```sh
npx shadcn@latest add dialog
```

drops the component into `src/components/ui/`.
