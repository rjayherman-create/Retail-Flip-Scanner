# Retail Flip Scanner

A mobile-first web app for finding clearance items at multiple retailers (Costco, Walmart, Target, BJ's, Sam's Club, Home Depot, Lowe's, Other) worth flipping on Facebook Marketplace. Supports four capture methods: Photo Scan (AI vision/OCR), Screenshot Upload (multi-row OCR), Public Web Check (compliance-safe), and Manual Add.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/warehouse-flip-scanner run dev` — run the frontend (port 21448)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Required env: `AI_INTEGRATIONS_OPENAI_BASE_URL`, `AI_INTEGRATIONS_OPENAI_API_KEY` — Replit OpenAI integration

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS, shadcn/ui, Wouter (routing), TanStack Query
- API: Express 5 on port 8080
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec in `lib/api-spec/openapi.yaml`)
- AI: OpenAI GPT-4.1-mini vision for photo scan and screenshot OCR
- Build: esbuild (CJS bundle for API server)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth for all API routes)
- `lib/api-zod/` — generated Zod schemas from OpenAPI
- `lib/api-client-react/` — generated React Query hooks (run codegen after spec changes)
- `lib/db/src/schema/` — Drizzle ORM schema: `inventory.ts`, `watchlist.ts`
- `artifacts/api-server/src/routes/` — Express route handlers: inventory, watchlist, scan, dashboard
- `artifacts/api-server/src/lib/scoring.ts` — Flip scoring logic (BUY≥75, MAYBE≥55, SKIP<55)
- `artifacts/warehouse-flip-scanner/src/pages/` — all 11 frontend pages
- `artifacts/warehouse-flip-scanner/src/components/` — layout, shared badges, shadcn UI

## Architecture decisions

- **Contract-first API**: OpenAPI spec drives code generation for hooks and schemas; never hand-write API types in the frontend.
- **`useQueryClient` from `@tanstack/react-query`**: Not re-exported from `@workspace/api-client-react` — import directly from TanStack.
- **Generated hooks use `export function` not `export const`**: Query hooks (useListInventory, useGetDashboardSummary, etc.) are `export function`; only mutations use `export const use*`.
- **No GET /inventory/:id endpoint**: Use `useListInventory()` + `.find(i => i.id === itemId)` in flip-decision and listing-generator pages.
- **Compliance by design**: Public web check always fails gracefully with `no_inventory_visible` — retailer inventory is login-gated; the app never bypasses auth.
- **Multi-retailer scoring**: `scoreFlipItem()` accepts `retailer` and uses retailer-specific logic — Costco/BJ's/Sam's Club use price endings (.97/.88/.00); Walmart/Target/Home Depot/Lowe's use `percent_off` as the primary signal. All share category/brand/price-spread logic.
- **Retailer default**: `retailer` column defaults to `"Costco"` for backward compatibility with existing inventory records.
- **New DB fields**: `retailer`, `brand`, `upc`, `sku`, `dpci`, `tcin`, `aisle`, `regular_price`, `clearance_price`, `percent_off`, `box_condition`, `photo_url`, `screenshot_url` added in schema v2.

## Product

- **Dashboard**: BUY/MAYBE/SKIP counts, capture method quick-launch cards, highest profit item, recent scans with retailer shown
- **Photo Scan**: Take/upload a photo → select retailer + store → AI extracts retailer-specific item details + instant flip score + listing button
- **Upload Screenshot**: Upload multi-row inventory screenshots → select retailer → AI extracts all rows + batch save with percent_off/regular_price
- **Check Online**: Retailer-selector + search → attempts public web check (fails gracefully if login required)
- **Manual Add**: Hand-enter any item with retailer, regular price, percent off, box condition → AI scoring + save
- **Inventory**: Browse, filter (BUY/MAYBE/SKIP/retailer), sort, delete items; quick links to Flip Decision and Listing Generator
- **Flip Decision**: Score gauge, pricing breakdown, risk notes, best next action, quantity recommendation
- **Listing Generator**: AI-generated Facebook Marketplace copy → editable + one-tap copy (retailer-branded title)
- **Store Comparison**: Cross-store price table for items scanned at multiple locations
- **Watchlist**: Track target buy prices with profit calculator
- **Settings**: Supported retailers grid, four capture methods guide, flip score tiers, retailer-specific markdown codes, AI model info, compliance notice

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After adding routes to `artifacts/api-server/src/routes/`, register them in `routes/index.ts` AND restart the API server workflow.
- After changing `lib/api-spec/openapi.yaml`, always run `pnpm --filter @workspace/api-spec run codegen` before using new hooks.
- `framer-motion` is in the pnpm catalog and already in `warehouse-flip-scanner/package.json`.
- The store comparison API returns `StoreComparisonRow[]` directly (not `{ stores: [] }`).
- Multer is installed on the API server for file upload endpoints (photo scan, screenshot OCR).

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See `lib/api-spec/openapi.yaml` for the full API contract
