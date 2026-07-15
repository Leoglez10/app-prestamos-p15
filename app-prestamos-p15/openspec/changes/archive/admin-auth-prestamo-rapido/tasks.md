# Tasks: admin-auth-prestamo-rapido

> Single-PR plan. 15 implementation tasks across 4 phases. Manual verification only (`strict_tdd=false`).

## 1. Task breakdown

### 1. Schema migration in `useInventory.ts`
**Files**: `src/hooks/useInventory.ts`
**Type**: mechanical
**Status**: ✅ DONE (apply)
**Acceptance**:
- Bootstrap SQL contains `ALTER TABLE prestamos_rapidos_alumnos ADD COLUMN IF NOT EXISTS id_admin INTEGER REFERENCES profesores(id) ON DELETE SET NULL` plus the two non-FK `ADD COLUMN IF NOT EXISTS` statements for `autorizante_codigo` and `autorizante_nombre`.
- `CREATE TABLE IF NOT EXISTS admin_users` is removed from the bootstrap string.
- Default admin seed `INSERT ... ON CONFLICT(codigo)` clause reads `DO NOTHING` (not `DO UPDATE`).
- Restaring the app 3 times in a row does not raise `duplicate column name` and does not overwrite a user-changed PIN.
**Estimate**: M — ~25 LOC delta (small SQL edits)
**Depends on**: —

### 2. New TypeScript types
**Files**: `src/auth/types.ts` (new)
**Type**: mechanical
**Status**: ✅ DONE (apply)
**Acceptance**:
- File exists and exports: `AdminUser`, `Session`, `AuthState`, `AuthContextValue`, `PrestamoRapidoAlumnoInput`, `PrestamoRapidoAlumnoCreate`, `PrestamoRapidoAlumnoRow`.
- `AuthState` is a discriminated union with statuses `unauthenticated | authenticating | authenticated | locked`.
- `npx tsc --noEmit` reports 0 errors after the file lands.
**Estimate**: M — ~40 LOC
**Depends on**: —

### 3. `loginStorage.ts` helpers
**Files**: `src/auth/loginStorage.ts` (new)
**Type**: mechanical
**Status**: ✅ DONE (apply)
**Acceptance**:
- Exports `loadSession(): Session | null`, `saveSession(admin: AdminUser): Session`, `clearSession(): void`, `isExpired(session: Session): boolean`.
- Storage key is the literal string `p15_admin_session`.
- `saveSession` returns a `Session` with `loginAt = new Date().toISOString()` and `expiresAt = loginAt + 8h` (ISO-8601).
- `loadSession` returns `null` when the key is missing, malformed JSON, or expired.
- Manual smoke: in DevTools console, `localStorage.getItem("p15_admin_session")` shows the JSON after login; the helpers compile with 0 TS errors.
**Estimate**: M — ~50 LOC
**Depends on**: 2

### 4. `AuthContext.tsx` provider + reducer + `useAuth` hook
**Files**: `src/auth/AuthContext.tsx` (new)
**Type**: analysis
**Status**: ✅ DONE (apply)
**Acceptance**:
- Exports `AuthProvider` and `useAuth()`.
- `useAuth()` throws a clear error when called outside `AuthProvider`.
- Provider runs a `useEffect` on mount that calls `loadSession()`; on a valid session, reducer transitions to `authenticated`; on an expired/missing session, state stays `unauthenticated` and the key is cleared.
- `login(codigo, pin)` calls `loginAdmin` from `useInventory`; on success it calls `saveSession` and transitions to `authenticated`; on failure it returns to `unauthenticated` and the caller receives a thrown error or `false` (document the contract).
- `logout()` clears the session, transitions to `unauthenticated`, and clears the idle timer.
- `unlock(pin)` revalidates the PIN against the stored `admin.codigo` via `loginAdmin`; on success transitions to `authenticated` and resets the idle timer.
- `useIdleLock(onLock)` is wired at the provider level — when `state.status === "authenticated"`, the hook is active; when it transitions to `"locked"`, the hook suspends until `resetIdleTimer()` is called.
- Renders `<IdleLockOverlay>` when `state.status === "locked"`.
**Estimate**: A — ~120 LOC
**Depends on**: 2, 3, 5, 8

### 5. `useIdleLock.ts` hook
**Files**: `src/auth/useIdleLock.ts` (new)
**Type**: mechanical
**Status**: ✅ DONE (apply)
**Acceptance**:
- Hook signature: `useIdleLock(opts: { onLock: () => void; thresholdMs?: number; pollMs?: number })` — defaults `thresholdMs = 15 * 60 * 1000`, `pollMs = 30 * 1000`.
- Installs `mousemove`, `keydown`, `touchstart` listeners that update an internal `lastActivityAt` ref.
- Runs a `setInterval` at `pollMs` granularity; when `Date.now() - lastActivityAt > thresholdMs`, fires `onLock()` once and stops polling until `resetIdleTimer()` is called.
- Returns `{ resetIdleTimer: () => void }`.
- Cleans up listeners and interval on unmount.
**Estimate**: M — ~50 LOC
**Depends on**: —

### 6. `LoginForm.tsx`
**Files**: `src/auth/LoginForm.tsx` (new)
**Type**: mechanical
**Status**: ✅ DONE (apply)
**Acceptance**:
- Props: `{ onSubmit(codigo: string, pin: string): Promise<void>; error?: string | null }`.
- Renders two inputs (`codigo` text, `pin` password) and a submit button.
- On submit, calls `onSubmit` with the input values; does not clear inputs on error.
- Displays the error string inline (e.g., "Código o PIN incorrecto") when `error` is non-empty.
- Submits on Enter key.
- Used by both `Admin.tsx` (post-refactor) and `PrestamoRapido.tsx`.
**Estimate**: M — ~80 LOC
**Depends on**: —

### 7. `SessionBadge.tsx`
**Files**: `src/auth/SessionBadge.tsx` (new)
**Type**: mechanical
**Status**: ✅ DONE (apply)
**Acceptance**:
- Props: `{ session: Session; onLogout?: () => void }`.
- Renders a visually distinct block (colored background, monospace for the code) reading "Autorizado por: {nombre} ({codigo}) — sesión desde {HH:mm}".
- HH:mm is derived from `session.loginAt` in local time.
- When `onLogout` is provided, renders a "Cerrar sesión" button that calls it.
- 0 TS errors after landing.
**Estimate**: M — ~40 LOC
**Depends on**: 2

### 8. `IdleLockOverlay.tsx`
**Files**: `src/auth/IdleLockOverlay.tsx` (new)
**Type**: mechanical
**Status**: ✅ DONE (apply)
**Acceptance**:
- Props: `{ session: Session; onUnlock(pin: string): Promise<boolean> }`.
- Renders a full-screen modal that blocks interaction with the page underneath.
- Shows message: "Sesión bloqueada por inactividad — ingrese su PIN para continuar".
- PIN-only input (no codigo field), submits on Enter; on success calls `onUnlock(pin)`.
- On failed unlock, shows inline "PIN incorrecto" without clearing the input.
- 0 TS errors after landing.
**Estimate**: M — ~70 LOC
**Depends on**: 2

### 9. Wrap `main.tsx` with `<AuthProvider>`
**Files**: `src/main.tsx`
**Type**: mechanical
**Status**: ✅ DONE (apply)
**Acceptance**:
- `<AuthProvider>` wraps `<App />` (or wraps `<BrowserRouter>` inside `<App />` if that matches the existing tree — pick whichever keeps the smallest diff).
- The app boots and the home page (`/`) renders without console errors.
- `npx tsc --noEmit` reports 0 errors.
**Estimate**: M — ~3 LOC
**Depends on**: 4

### 10. Refactor `Admin.tsx` to use `useAuth()`
**Files**: `src/pages/Admin.tsx`
**Type**: analysis
**Status**: ✅ DONE (apply)
**Acceptance**:
- Removes local `sessionStorage` admin session logic, the local `useState` for login form / codigo / pin / error, and the bootstrap `useEffect` that re-hydrates from `sessionStorage`.
- Replaces with `useAuth()` calls (`login`, `logout`, `state.session`).
- Reuses `<LoginForm>` from `src/auth/LoginForm.tsx` (no duplicate inline form).
- Renders `<SessionBadge>` (with logout) inside Admin tabs that show admin-gated UI.
- The rest of `Admin.tsx` (inventory management, configuración, etc.) is untouched.
- 0 TS errors.
**Estimate**: A — ~50 LOC delta (net negative inside `Admin.tsx`; ~-30 to -50 net because the duplicate login code is removed)
**Depends on**: 4, 6, 7

### 11. Refactor `PrestamoRapido.tsx` — gate, identity, history
**Files**: `src/pages/PrestamoRapido.tsx`
**Type**: analysis
**Status**: ✅ DONE (apply)
**Acceptance**:
- Reads `useAuth()` at the top of the component.
- When `state.status !== "authenticated"` (and not `locked`), renders `<LoginForm onSubmit={...} error={...} />` instead of the loan form.
- When `state.status === "locked"`, the provider's `<IdleLockOverlay>` handles the modal (no per-page duplicate).
- Removes the free-text "persona que presta" input from the form.
- Renders `<SessionBadge>` above the submit button.
- On submit, builds `PrestamoRapidoAlumnoCreate` by spreading the input and adding `admin: state.session.admin`; calls the updated `createPrestamoRapidoAlumno`.
- Each row in the history list renders "Autorizado por: {autorizante_nombre ?? persona_prestamo ?? '—'}".
- 0 TS errors.
- The 600+ lines of inline `<style>` in the file are NOT refactored (out of scope).
**Estimate**: A — ~80 LOC delta
**Depends on**: 4, 6, 7, 12

### 12. Update `createPrestamoRapidoAlumno` signature and INSERT
**Files**: `src/hooks/useInventory.ts`
**Type**: analysis
**Status**: ✅ DONE (apply)
**Acceptance**:
- `createPrestamoRapidoAlumno(input: PrestamoRapidoAlumnoCreate)` is the new signature.
- Function throws `"createPrestamoRapidoAlumno requires an authenticated admin"` when `input.admin` is null/undefined.
- INSERT writes `id_admin`, `autorizante_codigo`, `autorizante_nombre`, and `persona_prestamo = input.admin.nombre` in a single transaction.
- `getPrestamosRapidosAlumnos` SELECT returns the new columns (`id_admin`, `autorizante_codigo`, `autorizante_nombre`, `persona_prestamo`).
- Existing call sites in the repo (search confirms: only `PrestamoRapido.tsx` after refactor) compile.
- 0 TS errors.
**Estimate**: A — ~30 LOC delta
**Depends on**: 2

### 13. Update `database.sql` documentation
**Files**: `database.sql`
**Type**: mechanical
**Status**: ✅ DONE (apply)
**Acceptance**:
- Documented schema for `prestamos_rapidos_alumnos` lists the three new columns (`id_admin INTEGER`, `autorizante_codigo TEXT`, `autorizante_nombre TEXT`).
- `CREATE TABLE admin_users` block is removed from the doc.
- Default admin `INSERT` shows `ON CONFLICT(codigo) DO NOTHING`.
- Doc matches what `useInventory.ts` runs at boot (verified by reading both side by side during apply).
- `database.sql` is treated as a paper trail only — no runtime imports it.
**Estimate**: M — ~5 LOC delta
**Depends on**: 1

### 14. Manual test pass
**Files**: `openspec/changes/admin-auth-prestamo-rapido/manual-test-checklist.md` (new, results doc)
**Type**: mechanical (executor is the human, this task documents the checklist)
**Status**: ✅ DONE (apply — checklist written; human will execute it during verify)
**Acceptance**:
- All 7 manual test steps from the design section 9 are executed against a fresh local SQLite + Tauri window.
- Results recorded in `manual-test-results.md` with pass/fail per step and a screenshot or note per scenario.
- Steps: (1) Login OK; (2) Wrong PIN; (3) Persistence across app restart; (4) Idle lock after 15 min; (5) Logout; (6) Submit captures identity; (7) History shows authorizer.
**Estimate**: M — ~30 min of human time, ~30 LOC of results doc
**Depends on**: 1, 4, 5, 6, 7, 8, 9, 10, 11, 12

### 15. Type check + manual smoke
**Files**: — (verification only)
**Type**: mechanical
**Status**: ✅ DONE (apply — `npx tsc --noEmit` returned 0 errors; `npm run build` succeeded)
**Acceptance**:
- `npx tsc --noEmit` produces 0 errors.
- `npm run build` succeeds.
- App boots (`npm run tauri dev` or the dev script) and the home page renders without console errors.
- `/prestamo-rapido` shows the login form on first visit.
- A quick login (default creds) unlocks the loan form.
**Estimate**: S — ~5 min
**Depends on**: 9, 10, 11, 12, 13

## 2. Review Workload Forecast

| Task | Delta (rough LOC) | Type |
|------|------------------:|------|
| 1. Schema migration | +25 | M |
| 2. New TypeScript types | +40 | M |
| 3. `loginStorage.ts` | +50 | M |
| 4. `AuthContext.tsx` | +120 | A |
| 5. `useIdleLock.ts` | +50 | M |
| 6. `LoginForm.tsx` | +80 | M |
| 7. `SessionBadge.tsx` | +40 | M |
| 8. `IdleLockOverlay.tsx` | +70 | M |
| 9. Wrap `main.tsx` | +3 | M |
| 10. Refactor `Admin.tsx` | +20 / -50 | A |
| 11. Refactor `PrestamoRapido.tsx` | +80 / -30 | A |
| 12. `createPrestamoRapidoAlumno` signature + INSERT | +30 / -10 | A |
| 13. Update `database.sql` | +5 | M |
| 14. Manual test pass | +30 (doc only) | M |
| 15. Type check + manual smoke | 0 (verify) | S |

**Total estimated lines changed**: ~700-800 lines changed (additions + deletions), with net delta of approximately +500 / -200.
**Risk classification**:
- Touches auth/security paths: YES (login, session, idle lock, data-layer signature change).
- Touches data layer with schema change: YES (additive ALTERs + drop a dead CREATE).
- Touches UI: YES (one new login form factor + one badge + one lock overlay + per-page gate).
- Hot path: NO. Local-only desktop, no remote auth, no payment concerns.

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: (omitted — chained = No)
400-line budget risk: Medium

Single PR fits the 800-line `review_budget_lines` set by the orchestrator. The change is cohesive (auth + one dependent screen); splitting would force PR #1 to leave the app in a non-building state or with `useAuth()` returning `null` permanently. Keeping it together preserves a single rollback boundary.

## 3. Chain strategy

Omitted — `Chained PRs recommended: No`.

## 4. Dependency order / execution plan

Run in this order, single executor, single PR:

1. **T1** lands the schema migration and the `ON CONFLICT` fix in `useInventory.ts` first. The `id_admin`/`autorizante_*` columns must exist before any new INSERT path tries to write them.
2. **T2** defines the new TypeScript types. T2 has no runtime dependencies and unblocks every other new file.
3. **T3 / T5 / T6 / T7 / T8** (storage helpers, idle hook, login form, badge, lock overlay) are mechanical and independent — author in any order, land together. None depend on `AuthContext` to compile; T5/T6/T7/T8 just need the types from T2.
4. **T4** is the heart. It depends on T2, T3, T5, T8. Land after the supporting files exist so the provider's imports resolve.
5. **T9** wraps the app in `<AuthProvider>`. Requires T4 to exist.
6. **T10** refactors `Admin.tsx` to consume `useAuth()`. Requires T4, T6, T7. This removes the old `sessionStorage` flow.
7. **T12** updates `createPrestamoRapidoAlumno`'s signature and the SELECT. Requires T1 (columns exist) and T2 (types).
8. **T11** refactors `PrestamoRapido.tsx` — gate, badge, identity capture, history rendering. Requires T4, T6, T7, T12. This is the last code-level task.
9. **T13** updates the `database.sql` paper trail to match what T1 just shipped.
10. **T15** runs `npx tsc --noEmit` and `npm run build`, then a quick boot smoke. Fix any issues before T14.
11. **T14** is the human-driven manual test pass. The executor (human) walks the 7 scenarios and records results in `manual-test-results.md`.

Work-unit grouping for review (single PR, but reviewer can read in this order): foundation (T1-T2) → auth module (T3-T8) → wiring (T9-T12) → docs/verify (T13-T15).

## 5. Definition of Done

- `npx tsc --noEmit` reports 0 errors.
- `npm run build` succeeds.
- App boots, the home page (`/`) renders without console errors.
- All 7 manual test steps from the design section 9 pass and are recorded in `openspec/changes/admin-auth-prestamo-rapido/manual-test-results.md`.
- A row submitted while logged in has `id_admin`, `autorizante_codigo`, `autorizante_nombre`, and `persona_prestamo` populated and non-null.
- `localStorage["p15_admin_session"]` is populated after a successful login and contains a valid `expiresAt` 8h ahead.
- `ON CONFLICT(codigo) DO NOTHING` is present in the bootstrap SQL; the `DO UPDATE SET pin = excluded.pin` clause is gone.
- `CREATE TABLE IF NOT EXISTS admin_users` is removed from the bootstrap SQL.
- No new files under `src-tauri/`.
- No edits to any `*-LeoLaptop.*` file.
- `database.sql` documents the new columns and the `DO NOTHING` seed; the dead `admin_users` block is gone from the doc.

## 6. Risk callouts for the apply phase

- **Canonical file confirmation required before editing**. The repo carries `useInventory-LeoLaptop.ts` and other `*-LeoLaptop.*` duplicates that drift from the canonical files. Run `grep -R "LeoLaptop" src/ src-tauri/` before touching `useInventory.ts`; it should return 0 hits in the canonical tree. The bundled/imported file is the one without the `-LeoLaptop` suffix. T1 and T12 must edit that one only.
- **`database.sql` is a paper trail, not a runtime import**. T13 updates the doc to match what `useInventory.ts` runs. Do NOT change `database.sql` in a way that contradicts the runtime migration — the runtime is the source of truth, the doc must follow.
- **Do not refactor the 600 lines of inline `<style>` in `PrestamoRapido.tsx`**. Out of scope. T11 only adds the gate, the badge, and the identity capture; existing styles stay as-is.
- **Do not introduce PIN hashing, kiosk route gating, or duplicate-file cleanup**. All three are in `follow-ups.md` (F1, F2, F3) and are explicitly out of scope.
- **Plaintext PINs persist** (R1 in the design). This change does not improve PIN security. Scope-bound; F1 owns the fix.
- **Idle lockout is keyboard-aware**. `useIdleLock` listens for `keydown` and `touchstart`, not only `mousemove`. Touch-only kiosk users will not get spuriously locked while typing.
- **`localStorage` forgery is out of threat model** (R4 in the design). Forged sessions still require a valid PIN at the first idle unlock; defense-in-depth lives in F1.
- **8-hour TTL vs 15-minute idle lockout are independent**. The session survives an 8-hour shift; the idle lockout fires every 15 minutes of inactivity. Both must be implemented as designed — do not collapse them into one timer.
