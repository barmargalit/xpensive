# XPensive

<img src="apps/interface/public/xpensive3.png" alt="XPensive logo" width="120" />

A personal home management app for tracking household bills, monitoring utility usage, evaluating apartment purchase prospects, and planning mortgage financing.

---

## Features

### Bill Tracking
Track recurring and one-off household expenses across nine bill types:

| Type | Extra data captured |
|---|---|
| Electric | Usage (kWh), billing period, year |
| Water | Usage (m³), billing period, year |
| Internet | — |
| Gas | — |
| Property Tax | Year |
| Building Fee | — |
| Cellular | — |
| Rent | — |
| Health Care | — |

- Attach a **provider**, **residence**, **resident**, and **contract** to each bill
- Selecting a contract auto-fills the provider, residence/resident, and monthly price — the contract selector is grouped by **Active** / **Ended**
- Add free-text **comments** per bill
- Electric and Water bills display a **usage-over-time chart** on the bills page

### Contracts
Track service provider contracts (cellular plans, internet subscriptions, and more) independently of individual bills:

- Supports **type-specific fields**: data allowance, unlimited calls/SMS for cellular; speed for internet
- The table is split into two sections, **Active** and **Ended** (ended below active), each with its own `Divider` title — status is derived automatically from the end date
- Optionally linked to a **residence** or a **resident**
- **Expiry alerts** — contracts expiring in the next 2 months are highlighted with a warning row colour and icon in the table, and surfaced as an alert banner on the Contracts page and the home dashboard
- Filter the tables by provider, type, and date ranges; a **refresh** button next to "New" in the page header re-fetches the list
- An **Offers** column shows the total number of offers logged against each contract, sortable
- Deleting a contract is done from the **edit modal** (Delete button with a confirmation popover), not from the table row
- **Compare Offers** — log competing offers from other providers against a contract and compare them side by side against the current terms (price delta, data/speed deltas, status)
  - Accepting an offer no longer overwrites the contract: it prompts for an **effective date** (and an optional **end date**, with 6/12/18/24-month quick-select presets anchored to the effective date), closes out the previous contract the day before, and creates a brand-new contract row with the offer's terms — so historical pricing is preserved instead of being lost

### Residents
Manage the people living at your residences from a dedicated **Residents** drawer, opened via the button in the **My Residence** page header:

- Each resident has a **name** and **birth date**
- Bills and contracts can be associated with a resident instead of (or instead of) a residence — the two selectors are mutually exclusive and disable each other when one is filled

### Home Dashboard
The home page shows:
- **Last Bills** — the most recent bill for each active type at a glance
- **Bills Breakdown** — a donut chart of total spending split by bill type
- **Alerts** — expiring contracts surfaced in a dedicated card on the right

### Usage Statistics
A dedicated **Usage** page provides deep insight into Electric, Water, and Gas consumption:

- **CSV import** — drag-and-drop a meter export file to bulk-load readings; duplicate entries are silently skipped and the confirmation reports only the number of rows actually saved
- **Smart date range** — on load the view defaults to the last 7 days; the range picker is pre-populated and restricts selectable dates to the span covered by your data (no empty queries)
- **Quick presets** — one-click shortcuts for Today, Yesterday, Last 7 Days, Last Week, Last 30 Days, and Last Month, each automatically clamped to your data bounds
- **Granularity toggle** — switch between raw readings (All), daily totals (Day), and weekly totals (Week)
- **Single mode** — area chart for a single date range with Total, Day-hours, and Night-hours statistics
- **Compare mode** — overlay up to five date ranges on a cascade area chart; the X axis is normalised to Day N / Week N so ranges of any absolute dates can be meaningfully compared
  - A **comparison table** below the chart shows Total, Day, and Night usage side by side for all selected ranges
  - When exactly two ranges are selected, a **Change** column shows the delta and percentage between the chronologically earlier and later range, and a **Cost Diff** column multiplies the usage delta by the current utility price to show the real monetary impact

### Utility Prices
A dedicated **Prices** page tracks the per-unit cost charged by your utility providers over time:

- Separate tabs for **Electric** (₪/kWh) and **Water** (₪/m³)
- The **current price** is displayed prominently above the chart
- A **line chart** plots the full price history so you can see rate changes over time — hover a data point to see the price and any attached comment
- A **history table** lists all past and current entries with their date, price, provider, and comment; past entries can be edited inline
- Adding a price opens a modal with fields for price, provider, date set, and an optional comment
  - If the date is **before** the current price's date, the entry goes directly into history without replacing the current price
  - If the date is **on or after** the current price, it becomes the new current and the old one is archived automatically

### Providers
Manage the utility companies behind your bills. Each provider has a name and **one or more** associated bill types (e.g. a single telecom provider offering both cellular and internet plans), and can be linked to individual bill records and contracts.

### Residence Management
Track your current and past residences. Bills can be scoped to a specific residence, making it easy to compare costs across homes.

### Prospects Tracking
Keep a shortlist of apartments you are evaluating for purchase. Each prospect records:

**Location & Property**
- Street and city
- Size (m²), balcony size, number of rooms, and floor number
- Parking (yes/no) and safe space / shelter type — Room, Floor, Building, or None

**Financials**
- Asking price (₪M)
- Property tax (bi-monthly, ₪) and building fees (monthly, ₪)

**Realtor**
- Realtor flag — when enabled, a realtor fee (%) field appears for later price calculation

**Details**
- Contractor (for new-build apartments)
- Floor plan — attach a PDF URL, opened in one click from the table
- Video — attach a local file path; clicking the play icon in the table opens it in the system's default media player via the backend
- Free-text notes (up to 500 characters)
- **Visited date** — record when you physically visited the apartment; the table is sorted by visited date (most recent first)
- **Pros & Cons** — attach freeform pro and con bullet points to a prospect; hovering the row shows them side by side in a popover

Full create, edit, and delete support with a sectioned modal (Location, Property, Features, Financials, Details) and a streamlined table view.

### Mortgage Calculator
Model a mortgage before committing. Supports multiple **plans**, each composed of multiple **tracks** (loan tranches) — matching the way Israeli banks structure mortgages.

**Track types:**

| Type | Parameters |
|---|---|
| Fixed Unlinked | Annual interest rate |
| Fixed Index-Linked | Annual rate + annual CPI |
| Variable Index-Linked | Annual rate + annual CPI |
| Prime | Bank of Israel prime rate + spread |
| Foreign Currency | Annual rate + expected annual FX change |

For each plan you get:
- Month-by-month **amortization table** (balance, scheduled payment, principal, interest)
- **Track summary** with first-payment breakdown and effective rates
- Plans are saved to the database and can be revisited at any time

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React 19, Ant Design v6, Zustand, dayjs |
| Backend | NestJS 10, PostgreSQL (`pg`), raw SQL |
| Shared types | TypeScript package (`@xpensive/types`) |
| Package manager | pnpm (workspace monorepo) |

---

## Project Structure

```
xpensive/
├── apps/
│   ├── interface/        # Next.js frontend  (port 3000)
│   │   └── src/components/   # grouped into subject folders (bills, contracts, prices, mortgage, etc.)
│   │                          # plus shared/ (generic primitives) and layout/ (app-shell, theming)
│   └── main-service/     # NestJS backend     (port 3001)
└── packages/
    └── types/            # Shared TypeScript interfaces
```

---

## Running with Docker (recommended)

The easiest way to run the app locally. Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/) and an existing PostgreSQL instance with the `xpensive` database and migrations already applied.

### Prerequisites

- Docker Desktop running
- PostgreSQL accessible on `localhost:5432` with the following credentials:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=admin
DB_NAME=xpensive
```

If your credentials differ, update the `environment` block under `main-service` in `docker-compose.yml` before building.

### First run

Build the images and start the containers:

```bash
docker compose up --build -d
```

The app will be available at [http://localhost:3000](http://localhost:3000).

### Day-to-day usage

```bash
# Start
docker compose start

# Stop (containers and data persist)
docker compose stop

# Check status
docker compose ps

# View logs
docker compose logs -f
```

Use `start` / `stop` for daily on/off — they preserve container state. Only re-run `up --build` when you pull new code and need to rebuild the images.

---

## Installation

### Prerequisites

- **Node.js** 18 or later
- **pnpm** 8 or later (`npm install -g pnpm`)
- **PostgreSQL** 14 or later (running and accessible)

---

### 1. Clone the repository

```bash
git clone git@github.com:barmargalit/xpensive.git
cd xpensive
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Configure the backend

Create `apps/main-service/.env`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=xpensive
```

### 4. Configure the frontend

Copy the example env file:

```bash
cp apps/interface/.env.example apps/interface/.env.local
```

The default `apps/interface/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 5. Set up the database

Create the database in PostgreSQL:

```bash
createdb xpensive
```

Then apply the migrations in order. From the repo root:

```bash
for f in apps/main-service/src/migrations/*.sql; do
  psql -U your_db_user -d xpensive -f "$f"
done
```

Or apply them one by one using your preferred PostgreSQL client. The migration files are sequential — they must be run in order (001 → 034).

### 6. Build the shared types package

```bash
pnpm --filter @xpensive/types build
```

### 7. Start the development servers

Run all services in parallel from the repo root:

```bash
pnpm dev
```

Or start them individually:

```bash
# Backend
pnpm --filter main-service dev

# Frontend (in a separate terminal)
pnpm --filter interface dev
```

The app is now available at [http://localhost:3000](http://localhost:3000).

---

## Available Scripts

Run from the repo root:

| Command | Description |
|---|---|
| `pnpm dev` | Start all apps in watch mode |
| `pnpm build` | Build all apps and packages |
| `pnpm lint` | Lint all apps and packages |

---

## Environment Variables Reference

### Backend (`apps/main-service/.env`)

| Variable | Default | Description |
|---|---|---|
| `DB_HOST` | — | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_USERNAME` | — | PostgreSQL user |
| `DB_PASSWORD` | — | PostgreSQL password |
| `DB_NAME` | — | Database name |

### Frontend (`apps/interface/.env.local`)

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | Backend API base URL |
