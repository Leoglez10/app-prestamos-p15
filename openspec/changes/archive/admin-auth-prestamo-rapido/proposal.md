# Change: admin-auth-prestamo-rapido

## Why

The Préstamo Rápido feature currently operates without any authentication or accountability. Any user can create a loan record, and the `persona_prestamo` field is free-text with no verification. This creates an audit gap — there is no reliable record of which administrator authorized a student loan. The existing admin login system in `Admin.tsx` provides authentication but is isolated to that page, using per-page sessionStorage that does not persist across app restarts.

The opportunity is to reuse the existing `loginAdmin(codigo, pin)` mechanism and `profesores.es_admin` table as the single source of truth for admin identity. This avoids creating a new auth system while providing accountability for every loan created via Préstamo Rápido. The current implementation carries several latent risks: plaintext PINs stored in code, no global auth state, sessionStorage that fails on kiosk reboot, and no auto-lock for shared hardware.

Strategic direction: introduce an AuthContext provider that shares admin session state across routes, persist sessions to localStorage for kiosk continuity, auto-lock after inactivity, and stamp every loan record with the authenticated admin's identity at the data layer.

## What Changes

- **Admin login gate on `/prestamo-rapido`**: Require successful `loginAdmin()` before accessing the loan form
- **"Autorizado por: <admin>" badge**: Display authenticated admin name and code on the form and in history list rows
- **Automatic admin identity write**: `createPrestamoRapidoAlumno()` automatically populates `id_admin`, `autorizante_codigo`, `autorizante_nombre` from session — no manual entry
- **`persona_prestamo` field handling**: Keep column in DB but make it optional; prefill+readonly with admin name when logged in, allow override for edge cases (e.g., teacher acting on behalf of another)
- **AuthContext + React Provider**: Global auth state shared across `/admin` and `/prestamo-rapido` — single login, no double-login
- **Session persistence**: `localStorage` (Tauri webview supports natively) with TTL + auto-lock after 15 min idle
- **Schema migration**: `ALTER TABLE prestamos_rapidos_alumnos ADD COLUMN id_admin INTEGER`, `autorizante_codigo TEXT`, `autorizante_nombre TEXT`
- **Dead table cleanup**: Drop `admin_users` table — unused, `profesores.es_admin` is the source of truth
- **Default admin migration fix**: Change `ON CONFLICT(codigo) DO UPDATE` to `ON CONFLICT(codigo) DO NOTHING` so PIN changes persist across reboots

## Scope

### In Scope
- AuthContext with React Provider for global admin session state
- Login gate on `/prestamo-rapido` route (inside component, not route-level)
- Admin identity auto-fill in loan creation
- Session persistence via localStorage with 15-min idle auto-lock
- Schema migration adding admin identity columns to `prestamos_rapidos_alumnos`
- Drop dead `admin_users` table
- Fix default admin `ON CONFLICT` behavior
- Display admin identity in loan history list

### Out of Scope
- PIN hashing migration (bcrypt/argon2) — deferred to follow-up
- Removing `-LeoLaptop.*` file duplicates
- Auth gating on `/kiosko` route
- Full kiosk-mode code-only authentication
- Tauri plugin-store integration (localStorage sufficient)

## Impact

- **Affected specs**: New capability `admin-auth` (AuthContext, session management, login gate)
- **Affected code**: `src/App.tsx`, `src/pages/PrestamoRapido.tsx`, `src/hooks/useInventory.ts`, new `src/auth/AuthContext.tsx`, possibly `src/main.tsx`
- **Affected DB tables**: `prestamos_rapidos_alumnos` (additive columns), `admin_users` (drop)
- **Breaking changes**: `persona_prestamo` becomes optional — keep column but prefill+readonly when admin logged in
- **Migration risk**: Low — purely additive ALTER TABLEs; drop of unused `admin_users` table

## Success Criteria

- [ ] Admin cannot reach `/prestamo-rapido` form without successful `loginAdmin()`
- [ ] Every new row in `prestamos_rapidos_alumnos` has non-null `autorizante_codigo` and `autorizante_nombre`
- [ ] Session persists across app restart (localStorage survives Tauri webview close)
- [ ] Auto-lock triggers after 15 minutes of inactivity
- [ ] "Autorizado por" badge visible on form and in history list
- [ ] PIN change in Admin → Configuración persists across reboots (no silent overwrite)
- [ ] Existing admin login flow in `Admin.tsx` continues working via shared AuthContext

## Suggested Improvements

1. **AuthContext + React Provider**: Eliminates double-login between `/admin` and `/prestamo-rapido`. Single source of truth for admin state. Reduces code duplication and session bugs.

2. **localStorage-backed session with TTL**: Tauri webview supports localStorage natively — no Cargo.toml changes needed. Add 15-min idle timeout with `mousemove`/`keydown` event listeners. "Cerrar turno" button for explicit logout.

3. **Admin identity badge on form + history**: Shows "Autorizado por: Juan Pérez (223992647)" on the loan form and in every history row. Provides instant visual accountability without checking DB.

4. **PIN change persistence fix**: Change `ON CONFLICT(codigo) DO UPDATE` to `ON CONFLICT(codigo) DO NOTHING` for the default admin row. Current behavior silently overwrites PIN changes on every app boot.

## Open Questions

1. **Dead `admin_users` table**: Drop it entirely or repurpose for future use? Recommendation: drop — `profesores.es_admin` is the single source of truth.

2. **`persona_prestamo` field**: Keep as optional free-text override or remove entirely? Recommendation: keep column, prefill+readonly with admin name, allow override for delegation scenarios.

3. **Session TTL**: How long should the auto-lock idle threshold be? Suggestion: 15 minutes for shared kiosk environment.

4. **Route gating scope**: Should `/kiosko` also be auth-gated? Current intent: only `/prestamo-rapido`.

5. **PIN hardening**: Implement PBKDF2-SHA256 via Web Crypto API in this change or defer to follow-up? Recommendation: defer — this change focuses on accountability, not security hardening.

## Risks

- **Security**: PINs remain in plaintext; this change does not worsen the status quo but does not improve it either. Threat model is "someone sitting at the laptop" (offline/desktop), not remote attacker.
- **UX friction**: Adding a login gate to Préstamo Rápido adds a step before loan creation. Mitigated by session persistence — login once per shift.
- **Migration**: Adding columns to `prestamos_rapidos_alumnos` is safe (additive). Dropping `admin_users` requires confirming no code references it (verified: none exist).
- **Session storage**: localStorage persists across app restarts; if the kiosk PC is shared between shifts, explicit "Cerrar turno" becomes important for accountability.

## Alternatives Considered

1. **Don't gate the screen; stamp rows with workstation default admin** → No accountability for who actually authorized the loan. Rejected.

2. **Gate at route level with new ProtectedRoute component** → More React-idiomatic but requires restructuring App.tsx routing. Prefer gate inside PrestamoRapido.tsx (matches existing Admin.tsx pattern, less churn).

3. **New standalone admin table (admin_users)** vs. **reuse `profesores.es_admin`** → Reuse wins: one source of truth, fewer tables, existing login flow. `admin_users` is dead code anyway.

4. **Tauri plugin-store** vs. **localStorage** → localStorage is simpler (no Cargo.toml change, no new permissions). Plugin-store would be better for cross-process sync but not needed for single-webview kiosk.

## Rollback Plan

1. Remove AuthContext provider from `App.tsx`
2. Remove login gate from `PrestamoRapido.tsx`
3. Drop added columns from `prestamos_rapidos_alumnos` via migration
4. Restore `admin_users` table if dropped
5. Revert `ON CONFLICT` change in default admin migration

All changes are additive or reversible via migration. No data loss risk.