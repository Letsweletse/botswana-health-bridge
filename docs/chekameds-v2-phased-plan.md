# ChekaMeds v2.0 phased expansion plan

This expansion is intentionally additive. It does not rename existing routes, authentication flows, APIs, Supabase tables, or clinic inventory queries.

## Phase 1 — Database schema, migrations and RLS

Implemented in `supabase/migrations/20260713090000_chekameds_v2_inventory_supply_chain.sql`.

- Creates new v2 inventory, batch, transaction, transfer, procurement, warehouse, analytics, alert, notification, CMS cache and audit tables.
- Enables RLS on all new tables.
- Adds authenticated read policies and audit insert policy as a safe starting point.
- Adds barcode, expiry, status and audit indexes for lookup and dashboard performance.

## Phase 2 — Inventory management and barcode scanning

Implemented as the first UI/API-ready shell in `src/pages/national/InventoryExpansion.tsx` and calculation helpers in `src/lib/nationalInventory.ts`.

- Supports camera/USB/manual barcode workflow at the UI level.
- Known barcodes open a transaction workbench.
- Unknown barcodes prompt medicine creation.
- FEFO batch allocation logic is covered by unit tests.

## Phase 3 — CMS dashboard and facility monitoring

The national module includes CMS KPI cards and module tiles for facilities, regions, hospitals, clinics, medical stores, national availability, alerts and facility drill-down areas. The next implementation step should connect these cards to `cms_dashboard_cache`, `facility_inventory`, `warehouse_inventory`, `inventory_alerts` and audit views.

## Phase 4 — Procurement, warehouse and transfers

The schema includes purchase order workflow tables, transfer tables, warehouse inventory and goods received / issued records. The current UI exposes the procurement workflow and module entry points; the next step is to add form dialogs and server actions for each status transition.

## Phase 5 — Analytics, forecasting, alerts and reporting

The helper library includes rolling average, inventory value, stockout date and reorder recommendation calculations. The database includes `consumption_history`, `forecast_history`, `inventory_alerts`, `notifications`, `expiry_tracking` and `supplier_catalogue` for the connected implementation.

## Phase 6 — Testing, optimization and regression validation

Current tests cover FEFO, inventory value, rolling average, stockout estimate and reorder recommendation calculations. Additional API and integration tests should be added as server actions are connected.

## Deployment notes

1. Apply the Supabase migration in a staging project first.
2. Confirm existing ChekaMeds search, dashboard, supplier portal and pharmacy portal still load.
3. Run `npm run test`, `npm run lint` and `npm run build` before deploying.
4. Connect each v2 module to Supabase in small PRs to keep rollback safe.
