# ACON POS — Point of Sale & Store Management System

A Point of Sale (POS) application for retail stores, built as a personal portfolio project to learn end-to-end business application development — from a pure front-end implementation to cloud database integration.

The system covers a store's full workflow: inventory and brand management with tiered discount calculation, checkout, customer debt/credit tracking, returns, operational expense logging, and financial reporting — optimized for **tablet and desktop use** (not mobile, since a POS system is realistically used at a checkout counter on a larger screen, not a phone).

🔗 **Live demo:** https://acon-pos.vercel.app/
📦 **Source code:** this repository

---

## ✨ Key Features

### 📦 Inventory & Brand Management
- Full CRUD for products, with brand filtering and real-time name search
- Sortable table — click any column header (Brand, Name, Stock, Cost, Selling Price)
- Three-tier supplier discount calculation, matching common wholesale discount structures (e.g. 20% + 5% + 2%, applied sequentially rather than summed)
- Automatic calculation of final cost price and profit margin per item
- Input validation enforced in code (not just relying on HTML attributes) — stock must be a non-negative integer, discounts must be between 0–100%, etc.

### 🛒 Checkout / Point of Sale
- Product selection from a filterable, searchable list
- Quantity controls directly in the cart (increment/decrement/remove)
- Two payment paths: **Paid in full (cash)** with automatic change calculation, or **Credit/Debt (Bon)** with required customer name validation
- Checkout is processed **atomically** — the sale record and stock deduction happen as a single database operation (see Architecture below)

### 🧾 Thermal Receipt Printing
- Dedicated 80mm thermal printer layout (`@media print`)
- Automatic multi-copy printing with a "COPY" watermark — 2 copies for cash sales, 3 for credit sales
- All copies print in a single print dialog (via CSS page-break), avoiding multiple pop-up windows

### 📒 Accounts Receivable (Kas Bon)
- List of all unpaid/partially-paid transactions with outstanding balance per customer
- Partial payment (installment) recording with validation

### 🔄 Returns
- Look up a transaction by invoice ID
- Per-item return with quantity validation; automatically restocks the item and adjusts the related transaction's total and outstanding balance

### 💸 Operating Expenses
- Daily expense logging with date-range filtering

### 📊 Financial Reporting
- Period summary: total sales, outstanding receivables, expenses, and net profit (accounting for cost of goods sold)

### 💾 Backup & Restore
- One-click export of all store data to a `.json` file
- Import from a backup file — provided as an **additional data-safety layer** (the primary data already lives in the cloud database; this feature exists purely as a precaution)

### 🛡️ Security & Code Quality
- All user-supplied data rendered on screen (product names, brands, customer names, etc.) is passed through `escapeHtml()` to prevent XSS/HTML injection
- All confirmation/notification dialogs use custom modals instead of the browser's native `alert()`/`confirm()`/`prompt()`
- Discount calculation logic is extracted into a pure module (`calc.js`) with unit tests (`calc.test.js`, 12 test cases)

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Structure | HTML5 |
| Styling | CSS3 (custom, no CSS framework), with a tablet-width breakpoint |
| Logic | Vanilla JavaScript (ES6+, async/await) |
| Backend & Database | [Supabase](https://supabase.com) (PostgreSQL) |
| Testing | Node.js `assert` module (no test framework dependency) |
| Hosting | [Vercel](https://vercel.com), auto-deployed from GitHub |

**No build step and no front-end framework** — plain HTML/CSS/JS loaded directly by the browser, plus one external library (`@supabase/supabase-js`) via CDN.

---

## 🏗️ Architecture & Design Decisions

### Why Supabase instead of localStorage?
The original version of this project used `localStorage` (data stored per-browser). It was migrated to Supabase/PostgreSQL so data is stored centrally in the cloud — it survives a cleared browser cache and can be accessed from any device (note: this is **not real-time** — a change made on one device only appears on another after a manual page refresh, not automatically via WebSocket/live subscription).

### Atomic checkout via a database RPC function
Checkout involves two dependent operations: inserting the sale record and decrementing stock for each purchased item. Done as two separate requests, this risks a "half-completed" state (sale saved but stock update fails, or vice versa) if the connection drops mid-process. This is solved with a database function (`process_sale`, see `supabase_atomic_transaction.sql`) that wraps both operations in a single database transaction — if either step fails, everything is automatically rolled back.

### `sales.items` stored as JSONB rather than a separate table
Items purchased in a transaction are stored as a JSON column on the `sales` table rather than normalized into a separate `sale_items` table. This is a deliberate choice for a small store's scale: it keeps queries simple (fetch one sale, all its items come along, no JOIN needed) and PostgreSQL's native JSONB indexing keeps performance reasonable. The trade-off: deeper per-product analytics (e.g. best-selling items across all transactions) would require iterating in application code rather than a direct SQL query.

### A deliberate, documented security limitation
The current Row Level Security (RLS) policy allows **anyone** who knows the project URL and anon key (which are, by design, always visible in the page's client-side source — this is normal for a Supabase anon key) to read, write, and delete data. The app currently has **no cashier/owner authentication**. This is acceptable for a portfolio demo, but the system is **not yet suitable for real store operations with real transaction data** until Supabase Auth is added along with RLS policies restricting access to authenticated users only.

---

## 🚀 Running Locally

1. Clone/download this repository
2. Create a new project on [Supabase](https://supabase.com)
3. Run `supabase_schema.sql` in the Supabase SQL Editor (creates the `products`, `sales`, `returns`, and `expenses` tables)
4. Run `supabase_atomic_transaction.sql` in the same SQL Editor (creates the `process_sale` function for atomic checkout)
5. In `script.js`, replace `SUPABASE_URL` and `SUPABASE_ANON_KEY` with your own project's values (Project Settings → API)
6. Open `index.html` directly in a browser — no server or build step required

### Running unit tests
```bash
node calc.test.js
```

---

## 📁 Project Structure

```
index.html                        - Page structure
style.css                         - All styling
script.js                         - Application logic & Supabase calls
calc.js                           - Pure calculation functions (cost, margin, change due), testable without a browser
calc.test.js                      - Unit tests for calc.js
supabase_schema.sql               - Table definitions + initial RLS policies
supabase_atomic_transaction.sql   - The process_sale RPC function for atomic checkout
LICENSE                           - MIT License
```

---

## 💡 Technical Concepts Applied

- Migrating from client-side storage (`localStorage`) to a cloud backend (PostgreSQL via Supabase), including database schema design and mapping between JS naming conventions (camelCase) and SQL columns (snake_case)
- Writing database functions (PL/pgSQL) to guarantee atomicity across multi-step operations, including row locking (`FOR UPDATE`) to prevent race conditions during stock deduction
- Row Level Security (RLS) in PostgreSQL/Supabase and its security implications
- Manual XSS prevention via output encoding (`escapeHtml()`) in a framework-less app, where this is normally handled automatically
- Unit testing business logic by extracting it away from DOM-coupled code
- Continuous Deployment from GitHub to Vercel — *note: this is CD, not full CI/CD, since there is no automated process that runs tests before deployment yet*
- Deliberately scoping UI design to specific target devices (tablet/desktop) based on real usage context, rather than defaulting to "responsive for everything"

---

## 🔭 Possible Future Improvements

- **Supabase Auth** — cashier/owner login, with RLS policies restricting access to authenticated users only (currently the top priority before any real-world use)
- **CI (Continuous Integration)** — automatically run `calc.test.js` via GitHub Actions on every push, before Vercel deploys
- Normalize `sales.items` into a separate `sale_items` table if deeper per-product analytics are ever needed
- True realtime sync (Supabase Realtime subscriptions) so changes on one device appear on others without a manual refresh

---

*Built as a personal portfolio project by Jason Alexander Wijaya to learn business application development, from the front end through database integration.*
