# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Zoox × Vivo GeoIntelligence — a telecom analytics platform that visualizes QoE (Quality of Experience) metrics on an interactive geohash map. The project has four top-level directories:

- **`data-vis/`** — Production application: pnpm monorepo with NestJS API + Nuxt SPA + Docker Compose orchestration
- **`data-core/`** — Infrastructure: PostgreSQL + TimescaleDB + PostGIS + SigNoz (reserved, not yet implemented)
- **`estudo/`** — Data warehouse: SQL schemas, TimescaleDB migrations, bulk import scripts, and raw Ookla QoE datasets (~19GB)
- **`prototipo/`** — Prototype: React SPA + Express static server for early-stage geohash visualization

## Data Visualization (`data-vis/`)

### Structure

pnpm monorepo (v10.4.1) with three workspace packages:

```
data-vis/
├── apps/
│   ├── api/          → NestJS 11 backend (tRPC + WebSocket + Drizzle ORM)
│   └── web/          → Nuxt 3 SPA (tRPC client + Tailwind CSS)
├── packages/
│   └── shared/       → Shared types, Zod schemas, constants
├── docker-compose.yml → Nginx + API + Web + Redis
└── nginx/            → Reverse proxy config
```

### Commands

```bash
cd data-vis
pnpm install                  # install all workspace dependencies
pnpm dev                      # run api + web in parallel (dev mode)
pnpm dev:api                  # NestJS watch mode on port 3001
pnpm dev:web                  # Nuxt dev server on port 3000
pnpm build                    # build all packages
pnpm --filter @vivo/zoox-map-api build # build API only
pnpm --filter @vivo/zoox-map-web build # build Web only
pnpm check                    # type-check all packages
pnpm format                   # prettier --write
```

### Database Migrations

All schema changes (tables, views, materialized views, enums, indexes) **must** be done via numbered Drizzle migration files in `apps/api/drizzle/` (e.g., `0005_description.sql`). Never edit `drizzle/custom/timescale-setup.sql` for incremental changes — that file is the initial bootstrap only.

Migration conventions:
- File naming: `NNNN_short_description.sql` (sequential, snake_case)
- Use `DO $$ ... EXCEPTION WHEN ... END $$` for idempotent enum/type creation
- Use `--> statement-breakpoint` between independent statements (Drizzle convention)
- For materialized views: `DROP MATERIALIZED VIEW IF EXISTS ... CASCADE` + `CREATE MATERIALIZED VIEW ... WITH DATA` + recreate indexes
- `REFRESH MATERIALIZED VIEW CONCURRENTLY` requires a `UNIQUE INDEX` on the materialized view — always ensure one exists
- Keep `docs/db/physical/DDL-geointelligence.sql` in sync with any migration changes

### Key Integration Points

- **tRPC**: HTTP at `/trpc`, WebSocket subscriptions at `/trpc-ws`. Router defined in `apps/api/src/trpc/trpc.router.ts`, `AppRouter` type consumed by `apps/web/plugins/trpc.client.ts`.
- **WebSocket**: tRPC subscriptions via `splitLink` (WS for subscriptions, HTTP batch for queries/mutations). Redis pub/sub for horizontal scaling (`apps/api/src/websocket/ws-pubsub.service.ts`).
- **Database**: Drizzle ORM connecting to PostgreSQL (from data-core stack). Schema placeholder at `apps/api/src/database/schema/index.ts`.
- **Redis**: Cache + WS pub/sub. Dual connections (client + subscriber) in `RedisService`.
- **Observability**: OpenTelemetry auto-instrumentation → SigNoz via gRPC (OTLP). Bootstrap in `apps/api/src/telemetry/tracing.ts`, enabled via `OTEL_ENABLED=true`.
- **Security**: Helmet, CORS, throttling (100 req/min), correlation IDs, Nginx rate limiting, origin validation on WS upgrade.

### Docker Compose

```bash
cd data-vis
docker compose up              # nginx:80, api:3001, web:3000, redis:6379
```

Services: `nginx` (reverse proxy), `api` (NestJS), `web` (Nuxt/Nitro), `redis` (7-alpine). PostgreSQL is external (from data-core stack, configured via `DATABASE_HOST`).

Network: `vivo-network` (shared with data-core).

### Environment Variables

See `data-vis/.env.example`. Key variables: `DATABASE_HOST/PORT/USER/PASSWORD/NAME`, `REDIS_HOST/PORT`, `CORS_ORIGINS`, `JWT_SECRET`, `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_ENABLED`.

**Formatter**: Prettier — double quotes, semicolons, 2-space indent, 80 cols, trailing commas es5.

## Prototype (`prototipo/`)

### Commands

```bash
cd prototipo
npm install           # install dependencies
npx nuxt dev --host   # dev server on port 3000 (Nuxt 3)
npx nuxt build        # build for production
npx nuxt generate     # static site generation (GitHub Pages)
```

No test runner configured.

### Architecture

Nuxt 3 SPA (Vue 3) with file-based routing. SSR disabled (`ssr: false`), pre-rendered for GitHub Pages.

```
prototipo/
├── pages/
│   ├── index.vue        → Mapa Estratégico (Google Maps + geohash polygons)
│   ├── frentes.vue      → Estratégias Growth (4-pillar diagnosis + AI recommendation)
│   ├── bairros.vue      → Visão por Bairro (neighborhood aggregation)
│   └── [...slug].vue    → 404 catch-all
├── components/
│   ├── MapView.vue      → Google Maps wrapper
│   └── GeohashCard.vue  → Right panel detail card (Camada 1 + Camada 2)
├── composables/
│   └── useGoogleMaps.ts → Google Maps API lazy loader
├── utils/
│   └── geohashData.ts   → Master data + types + business logic (1649 lines)
├── layouts/
│   └── default.vue      → Header + navigation tabs
└── assets/css/
    └── index.css        → Tailwind CSS 4 + custom animations
```

**Routing** (Nuxt file-based):
- `/` → Mapa Estratégico (UC001-UC004)
- `/frentes` → Estratégias Growth (UC009)
- `/bairros` → Visão por Bairro (UC010)

**UI stack**: Tailwind CSS 4 + Lucide Vue Next icons + Google Maps API v3.58.1

**Key domain types** are in `utils/geohashData.ts`: `GeohashData`, `Quadrant`, `TechCategory`, `FibraClassification`, `MovelClassification`, `DiagnosticoGrowth`, `Camada2`, `ConcorrenteGeohash`. Geohash data is currently embedded client-side (no API).

**Formatter**: Prettier — double quotes, semicolons, 2-space indent, 80 cols, trailing commas es5.

### Environment Variables

Runtime config (`nuxt.config.ts`):
- `NUXT_PUBLIC_GOOGLE_MAPS_API_KEY` — Google Maps API key

## Data Warehouse (`estudo/`)

### Database Stack

PostgreSQL 18 + TimescaleDB + PostGIS. Migrations managed by `sql-migrate` (config in `db/dbconfig.yml`).

```bash
cd estudo
sql-migrate up -env=development      # apply migrations
sql-migrate status -env=development  # check status
```

### Schema Highlights

- **Hypertables** partitioned on `periodDate` (3-month chunks, compression after 6 months, retention 36 months)
- **Tables**: `geohashCell` (static geo reference), `shareMetric`, `satisfactionScore`, `benchmarkMetric`, `userSession`, `exportJob`
- **Continuous aggregates**: `shareMetricMonthly`, `satisfactionMonthly` (hourly refresh)
- `geohashId` is the natural primary key (enables prefix-based drill-down between precision levels)

### Data Import

`import.sh` uses `timescaledb-parallel-copy` (8 workers, 10k-row batches) with LATIN1→UTF-8 conversion and comma→dot decimal normalization. Column mappings for three QoE categories: FILE_TRANSFER (99 cols), VIDEO (88 cols), WEB (91 cols).

Raw data files (`ZOOX_OOKLA_*.txt`) use semicolon delimiters and generic `CAMPO*` headers mapped positionally by the import script.
