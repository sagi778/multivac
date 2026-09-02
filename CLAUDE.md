# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

BQ Slave is a single-page BigQuery SQL IDE. A FastAPI backend proxies Google Cloud BigQuery APIs and serves a self-contained frontend. Authentication uses Google Application Default Credentials (ADC) — no API keys in code.

## Commands

```bash
# Install backend dependencies
make install            # pip install -r backend/requirements.txt

# Run the dev server (backend serves everything on :8000)
make dev                # uvicorn main:app --reload --port 8000  (from backend/)

# Or directly:
cd backend && uvicorn main:app --reload --port 8000

# Docker
make build              # docker build -t bq-slave .
make deploy             # gcloud run deploy bq-slave --region europe-west1 ...
                        # accepts SERVICE=, REGION=, PROJECT= overrides
```

Environment: copy `.env` into `backend/` with `BQ_DEFAULT_PROJECT` and optionally `QUERY_MAX_ROWS` (default 1000).

Docker note: the image serves on `PORT` env var (default `8080` for Cloud Run), not `8000`. `HOST=0.0.0.0` is baked in.

There are no tests in this repo.

## Architecture

### Active frontend: `backend/static/index.html`

**This is the only real frontend.** Single self-contained HTML file — no build step, no bundler. All CSS, JS, and SVG icons live inline. Monaco Editor is loaded from CDN; if that fails, a `<textarea>` fallback is used via `EditorAPI` (`getValue`, `insertText`).

The `frontend/` directory contains an unused React+Vite app. Ignore it.

### Backend: `backend/main.py`

Single FastAPI file. Routes:
- `GET /api/projects` — lists GCP projects
- `GET /api/projects/{project}/datasets`
- `GET /api/datasets/{project}/{dataset}/tables`
- `GET /api/tables/{project}/{dataset}/{table}/schema` — returns `[{ name, type, mode, description }]`
- `POST /api/query` — executes SQL, returns `{ columns, schema, rows, totalRows, jobId }`
- `GET /` — serves `index.html`

All BQ calls run via `asyncio.to_thread` to avoid blocking. `stringify_value` normalises non-JSON-serialisable BQ types (datetime, Decimal, bytes, dict/list).

Note: `aiofiles` is listed in `requirements.txt` but is not imported or used anywhere in `main.py`.

### Frontend JS structure (inside `index.html`, top to bottom)

**Constants & state**
- `ICONS` — SVG strings keyed by name (`dag_table`, `dag_source`, `dag_col`, `dag_run`, `dag_join_key`, `project`, `dataset`, `table`, `column`, …)
- `_schemaCache: Map<nodeId, col[]>` — persists column data across DAG re-renders; populated by `loadSourceSchema` (names only, type `'unknown'`) or `runNodeQuery` (real BQ types)
- `_currentDag` — last rendered DAG object, used to redraw edges after card expand/collapse
- `_dagTooltipEl` — single floating tooltip DOM element reused across all cards
- `_queryAbortCtrl` — AbortController for stop-query
- `_queryTreeTimer` — debounce timer handle for `refreshQueryTree()` (400 ms)
- `_queryDecorations` — array of Monaco decoration IDs used to highlight selected SQL ranges

**SQL parsing — two separate parsers**

`parseSQL(sql)` is a lightweight parser used by `buildQueryTree()` to render a collapsible tree view of the SQL structure (CTEs → main SELECT → table refs with byte offsets). It feeds the **Query Tree** visual on the `data-tab="query"` panel.

`parseSQLToDAG(sql)` is the full graph builder (documented below). Both run on every editor change via `refreshQueryTree()`, but serve different panel areas.

**SQL parsing → DAG** (`parseSQLToDAG(sql)`)

The core parsing pipeline. Returns:
```js
{
  nodes: Map<id, node>,
  levels: string[][],   // topological levels; sources at 0
  edges: { from, to, type }[]  // type: 'direct' | 'join' | 'union'
}
```

Node fields:
```js
{
  id, type,           // type: 'source' | 'cte' | 'main'
  name, body,         // body = SQL text of this node
  sqlStart, sqlEnd,   // byte offsets in the full SQL string
  columns,            // { name, type, grouped, tableAlias }[] — unknown types until preview
  inputs,             // id[] of upstream nodes
  joinType,           // 'direct' | 'join' | 'union' | null
  joinKeyColumns,     // Set<colName> from ON/USING clauses
  inputAliases,       // Map<inputId, alias>
  aliases,            // Set<alias> — names downstream nodes use for this node
  previewRan,         // false until runNodeQuery succeeds; gates column grouping display
  tablePath,          // { project, dataset, table } — source nodes only
}
```

Internal helpers (all defined inside `parseSQLToDAG`):
- `skipStr / skipCmt / skipWS / matchParen / nextTok` — low-level tokeniser
- `readTableName` — like `nextTok` but also consumes hyphens in unquoted project IDs (`rapyd-eu-data.dataset.table`)
- `extractInputs(body)` — finds FROM/JOIN refs at depth 0; captures alias and ON/USING join keys per ref; handles all JOIN variants and UNION
- `extractColumns(body)` — finds SELECT … FROM at depth 0; strips aliases; captures `tableAlias` from `alias.col` prefix; returns `type:'unknown'`
- `extractGroupBy(body)` — depth-aware GROUP BY scanner
- `attributeFromCols(cols, inputRefs)` — assigns `tableAlias` to unaliased columns using the primary FROM input; called after `extractColumns`

**DAG rendering**
- `renderDAG(dag, container)` — clears container, builds level rows with gap divs, appends a single `<svg class="dag-svg-overlay">` for all edges, then double-RAF calls `drawDAGEdges`
- `makeDagCard(node)` — builds one card DOM element; restores `_schemaCache` data before rendering if available; attaches click-to-toggle and hover-tooltip handlers
- `drawDAGEdges(dag, wrap)` — measures card bounding rects relative to the wrap, draws cubic Bézier paths in the overlay SVG
- `renderColsIntoList(colList, node)` — flat list before `node.previewRan`; grouped by `tableAlias` with headers after
- `buildColRow(colObj, joinKeyColumns)` — single column row; key icon for join columns; `{TYPE}` badge after preview
- `applySchemaToCard(cardEl, node, typedCols)` — updates `node.columns`, re-renders colList, redraws edges if card is open
- `loadSourceSchema(node, cardEl)` — fetches `/api/tables/…/schema`; stores names with `type:'unknown'`; skips if already in `_schemaCache`

**Node preview**
- `runNodeQuery(node)` — creates/reuses a dynamic per-node tab; calls `buildSQLForNode` then `POST /api/query`; on success sets `node.previewRan = true`, merges `tableAlias` from pre-parsed columns into typed result, caches to `_schemaCache`, calls `applySchemaToCard`
- `buildSQLForNode(node, dag)` — source: `SELECT * FROM \`path\` LIMIT 100`; CTE: reconstructs `WITH dep1 AS (…), …, target AS (…) SELECT * FROM target LIMIT 100` using `collectCteDeps`; main: raw body
- `collectCteDeps(nodeId, dag)` — depth-first walk returning transitive CTE dependencies in topological order

**Column source attribution** (`inferColSources(node, dag)`)

Runs after `runNodeQuery` succeeds. Maps result column names back to `_schemaCache` entries from input nodes to assign `tableAlias` for visual grouping in DAG cards. This is why column grouping only appears after ▶ is clicked — `previewRan` gates it.

**Column type system**

`bqTypeToInferredType(bqType)` maps BQ type strings to display types:
- `'string'` → purple (`#c586c0`) — STRING, BYTES, JSON, VARCHAR
- `'numeric'` → teal (`#4ec9b0`) — INT*, FLOAT*, NUMERIC*, DECIMAL
- `'time'` → red (`#f44747`) — DATE, TIME, TIMESTAMP, DATETIME
- `'bool'` → orange (`#ce9178`) — BOOL
- `'unknown'` → muted — default before preview

**Main query execution** (`runQuery` / `stopQuery`)
Runs the full SQL from the editor via `POST /api/query`. Renders an HTML results table. Shows row-count warning when capped at `MAX_ROWS`. Exposes job ID link. Ctrl+Enter / Cmd+Enter triggers `runQuery()` via Monaco's `addCommand`.

`stopQuery()` calls `_queryAbortCtrl.abort()` which cancels the browser fetch, but does **not** cancel the BigQuery job server-side — the job continues running in GCP until it completes or times out.

**Tab system** (`activateMainTab(tabEl)`)
Static tabs: SQL (`data-tab="sql"`), Query Tree (`data-tab="query"`). Dynamic per-node preview tabs created in `runNodeQuery` with a `data-panelId` attribute. Each tab type shows/hides different panel elements.

**Theme system** (`applyTheme(name)`)
Themes: `dark` (default), `light`, `claude`, `1984`, `matrix`. Sets `data-theme` on `<html>` for CSS cascading, updates Monaco theme, persists to `localStorage` as `bqs-theme`. Custom Monaco theme definitions for `bqs-claude` and `bqs-1984` are defined inline in `index.html`.

**Layout resizers**
Two independent mousedown/mousemove/mouseup splitters:
- Vertical: sidebar ↔ main content (sidebar min 140px, max 600px)
- Horizontal: editor ↔ results panel (editor default 60%, results 35%, resizer 5%)

Relevant when touching any layout or panel sizing code.

**Sidebar tree** (lazy-loaded)
`makeNode(opts)` → tree row factory. Projects load on boot; datasets/tables/columns load on first expand via `buildDatasetNodes` / `buildTableNodes` / `buildColumnNodes`. `addTableMain` / `addTableCTE` insert SQL snippets into the editor. `addedTables` Set tracks which tables have been inserted (controls visual "already added" state).

### Key data flow

```
SQL editor change
  → refreshQueryTree() [400ms debounce]
    → parseSQLToDAG(sql)
      → renderDAG(dag, panel)
        → makeDagCard(node)   [restores _schemaCache if present]
        → drawDAGEdges(dag, wrap)

User clicks ▶ on a card
  → runNodeQuery(node)
    → buildSQLForNode(node, dag)
    → POST /api/query
    → inferColSources(node, dag)  [assigns tableAlias from _schemaCache of inputs]
    → applySchemaToCard(cardEl, node, typedCols)  [sets previewRan=true]
    → _schemaCache.set(node.id, typedCols)
```

`_schemaCache` is the bridge that makes column types and grouping survive tree re-renders. When `makeDagCard` runs for a node whose ID is already in `_schemaCache`, it immediately restores `previewRan=true` and the typed columns before rendering.
