# Spec: prestamo-rapido

## Purpose

The `prestamo-rapido` capability covers the lightweight student-loan screen (`/prestamo-rapido`) and its new accountability behavior. Previously, this screen allowed unauthenticated loan creation with a free-text "persona que presta" field, providing no reliable audit trail. This change adds an admin authentication gate, automatically stamps every loan record with the authenticated admin's identity at the data layer, and renders that identity visually on the form and in the history list. The result is a complete accountability chain: every loan is traceable to a specific admin who was physically present at the kiosk.

## Requirements

### Requirement: Auth gate on screen

The `PrestamoRapido` component SHALL check for an active admin session (via `AuthContext`). When `currentAdmin` is `null`, the component SHALL render the admin login form instead of the loan form. The gate SHALL be implemented inside the component, not at the router level, to match the existing pattern in `Admin.tsx`.

### Requirement: Form captures admin identity on submit

Every row inserted into `prestamos_rapidos_alumnos` SHALL have non-null `id_admin`, `autorizante_codigo`, and `autorizante_nombre` values reflecting the currently logged-in admin. The `createPrestamoRapidoAlumno()` function in `useInventory.ts` SHALL read these values from the AuthContext and include them in the INSERT statement. If `currentAdmin` is `null` at the time of submission, the function SHALL throw an error and refuse to insert.

### Requirement: Free-text persona_prestamo field is hidden

The form SHALL NOT render a free-text "persona que presta" input. The `persona_prestamo` database column SHALL be preserved for backward compatibility and SHALL be auto-populated server-side from `currentAdmin.nombre` at insert time. This ensures legacy queries and reports that reference `persona_prestamo` continue to work.

### Requirement: Audit badge visible on form

A persistent badge reading "Autorizado por: {nombre} ({código}) — sesión desde {loginAt}" SHALL be visible above the submit button whenever an admin is logged in. The badge SHALL use the `loginAt` value from the persisted session. The badge SHALL be rendered as a visually distinct element (e.g., colored background, monospace code) to draw attention in a shared-kiosk environment.

### Requirement: History list shows authorizer

Each row in the on-screen history list of recent loans SHALL display "Autorizado por: {autorizante_nombre}" alongside the existing loan data (student name, item, quantity). If `autorizante_nombre` is `NULL` (legacy rows predating this change), the row SHALL fall back to displaying the `persona_prestamo` value as "Autorizado por: {persona_prestamo}".

### Requirement: Schema additive migration

The existing prepared-statement migration runner in `useInventory.ts` SHALL execute an ALTER TABLE to add three columns to `prestamos_rapidos_alumnos`:
- `id_admin INTEGER` — references the `profesores.id` of the authorizing admin
- `autorizante_codigo TEXT` — the admin's `codigo` at time of loan
- `autorizante_nombre TEXT` — the admin's `nombre` at time of loan

These columns SHALL be nullable to preserve backward compatibility with existing rows. The migration SHALL use `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` to be idempotent.

### Requirement: Dead admin_users table dropped from schema

The `CREATE TABLE IF NOT EXISTS admin_users` statement SHALL be removed from the schema bootstrap in `useInventory.ts`. No `DROP TABLE` statement is required — the table is left intact in existing user databases for safety. Any references to `admin_users` in comments or dead code SHALL be removed.

## Scenarios

#### Scenario: Unauthenticated user lands on login form
- Given no admin session is active (`currentAdmin` is `null`)
- When the user navigates to /prestamo-rapido
- Then the loan form is NOT rendered AND a login form is shown with "codigo" and "pin" inputs

#### Scenario: Submit captures admin identity
- Given admin "Administrador P15" (code 223992647, id 1) is logged in
- When the user submits a valid loan for student "Juan Pérez" with item "Calculadora"
- Then the new row in `prestamos_rapidos_alumnos` has `id_admin=1`, `autorizante_codigo="223992647"`, `autorizante_nombre="Administrador P15"`, and `persona_prestamo="Administrador P15"`

#### Scenario: Submit rejected without active session
- Given `currentAdmin` is `null` (session expired or never started)
- When the user attempts to submit a loan
- Then the insert is rejected with an error AND no row is written to `prestamos_rapidos_alumnos`

#### Scenario: History list displays authorizer
- Given a loan row with `id_admin=1` and `autorizante_nombre="Administrador P15"`
- When the history list is rendered
- Then the row shows "Autorizado por: Administrador P15"

#### Scenario: Legacy rows (pre-change) display fallback
- Given an existing row with `id_admin IS NULL` and `persona_prestamo="Prof. García"`
- When the history list is rendered
- Then the row shows "Autorizado por: Prof. García" (the original free-text value)
- NOTE: this is a legacy-compatibility display rule for rows that predate the schema change

#### Scenario: Schema migration is idempotent
- Given the migration has already run once
- When the application restarts and the migration runs again
- Then no error is thrown AND the columns already exist AND no data is lost

#### Scenario: Badge reflects session start time
- Given admin logged in at 2026-07-14T09:30:00
- When the form is rendered at 09:45
- Then the badge reads "Autorizado por: Administrador P15 (223992647) — sesión desde 09:30"
