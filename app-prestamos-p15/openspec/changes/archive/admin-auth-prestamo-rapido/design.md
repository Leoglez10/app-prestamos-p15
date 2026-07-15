# Design: admin-auth-prestamo-rapido

## 1. Context

This change introduces an admin authentication gate on the `/prestamo-rapido` screen and stamps every loan record with the authenticated admin's identity. Inputs: proposal declares the intent and confirms `profesores.es_admin` is the single source of truth for admin identity (the `admin_users` table is dead code); two delta specs — `admin-auth` (session lifecycle, AuthContext, idle lockout, default admin seed immutability) and `prestamo-rapido` (auth gate, identity capture, schema migration, history display).

Stack constraint: Tauri 2.x webview supports `localStorage` natively — no Rust/Cargo changes required for persistence. SQLite is local-only via `@tauri-apps/plugin-sql`; the only DB work is an additive `ALTER TABLE` plus removing a dead `CREATE TABLE` and fixing a default-admin `ON CONFLICT` clause. The build is React 19 + Vite 7 + TS 5.8, no test framework installed (`strict_tdd=false`).

## 2. Architecture overview

```
<AuthProvider>   (root, wraps BrowserRouter in main.tsx)
  └─ <BrowserRouter>
       └─ routes: / , /admin , /kiosko , /prestamo-rapido
            ├─ gated pages: <LoginForm> | <LoanForm> + <SessionBadge>
            └─ <IdleLockOverlay>  (renders when state.status === 'locked')
```

State machine (AuthContext reducer):

```
unauthenticated ──login()──▶ authenticating ──ok──▶ authenticated
                                   │                     │
                                   └──fail──▶ unauth      │ 15 min idle
                                                         ▼
                                                       locked
                                                         │ unlock(pin)
                                                         ▼
                                                     authenticated
authenticated ──logout()──▶ unauthenticated
```

## 3. File changes

| File | New/Modified | Purpose | Key exports | Mechanical/Analysis |
|------|--------------|---------|--------------|---------------------|
| `src/auth/AuthContext.tsx` | NEW | React context + provider + reducer + localStorage read/validate on mount | `AuthProvider`, `useAuth()` | Analysis: define state machine, session TTL (8h), restore-on-mount |
| `src/auth/useIdleLock.ts` | NEW | Idle timer hook: `mousemove`/`keydown`/`touchstart` listeners + 30s `setInterval` poll + 15 min threshold | `useIdleLock(onLock)` | Mechanical: thin effect hook |
| `src/auth/loginStorage.ts` | NEW | localStorage key `p15_admin_session`, read/write/validate/clear helpers | `loadSession()`, `saveSession()`, `clearSession()`, `isExpired()` | Mechanical |
| `src/auth/LoginForm.tsx` | NEW | Reusable `<LoginForm onSubmit={login} error={...} />` | `LoginForm` | Mechanical: extract from existing `Admin.tsx` inline form |
| `src/auth/SessionBadge.tsx` | NEW | "Autorizado por: {nombre} ({codigo}) — sesión desde {HH:mm}" | `SessionBadge` | Mechanical |
| `src/auth/IdleLockOverlay.tsx` | NEW | Full-screen overlay, PIN-only re-entry, calls `unlock(pin)` | `IdleLockOverlay` | Mechanical |
| `src/main.tsx` | M | Wrap `<App/>` with `<AuthProvider>` | — | Mechanical: 1-line wrap |
| `src/pages/Admin.tsx` | M | Replace local `sessionStorage` login with `useAuth()`; keep existing UI | — | Analysis: remove duplicate session logic |
| `src/pages/PrestamoRapido.tsx` | M | Gate on `useAuth()`; render `LoginForm` when unauth, `LoanForm`+`SessionBadge` when auth; remove free-text `persona_prestamo` input; pass `admin` to `createPrestamoRapidoAlumno`; render authorizer in history rows | — | Analysis: gate + identity propagation |
| `src/hooks/useInventory.ts` | M | (1) `ALTER TABLE prestamos_rapidos_alumnos ADD COLUMN IF NOT EXISTS` ×3; (2) remove `CREATE TABLE IF NOT EXISTS admin_users`; (3) change default admin seed `ON CONFLICT(codigo) DO UPDATE` → `DO NOTHING`; (4) extend `createPrestamoRapidoAlumno` signature to accept `admin` and write `id_admin`/`autorizante_codigo`/`autorizante_nombre`/`persona_prestamo`; (5) update SELECT to return new columns | `loginAdmin`, `createPrestamoRapidoAlumno` (new arg), `getPrestamosRapidosAlumnos` (new cols) | Analysis: schema + signature change |
| `database.sql` | M | Document the canonical schema (additive columns, ON CONFLICT fix, remove `admin_users` DDL). Doc only — the runtime migration runs in `useInventory.ts`, not from this file | — | Mechanical |
| `src-tauri/` | — | No change | — | N/A — localStorage is webview-native |

## 4. Data model

New columns on `prestamos_rapidos_alumnos`:

```sql
ALTER TABLE prestamos_rapidos_alumnos ADD COLUMN IF NOT EXISTS id_admin            INTEGER REFERENCES profesores(id) ON DELETE SET NULL;
ALTER TABLE prestamos_rapidos_alumnos ADD COLUMN IF NOT EXISTS autorizante_codigo  TEXT;
ALTER TABLE prestamos_rapidos_alumnos ADD COLUMN IF NOT EXISTS autorizante_nombre  TEXT;
```

- All three nullable — legacy rows keep NULL, display falls back to `persona_prestamo` (see spec scenario).
- `persona_prestamo` column preserved; auto-populated server-side from `currentAdmin.nombre` at insert.

Bootstrap changes in `useInventory.ts`:

- **Remove** `CREATE TABLE IF NOT EXISTS admin_users (...)` — dead table, `profesores.es_admin` is canonical. Do NOT `DROP TABLE` in user DBs (safety): existing user databases keep the table, just stop creating it. New installs never get it.
- **Change** default admin seed:
  ```sql
  -- BEFORE
  INSERT INTO profesores(codigo, pin, nombre, es_admin)
    VALUES ('223992647', '#admin*p15#', 'Administrador P15', 1)
    ON CONFLICT(codigo) DO UPDATE SET pin = excluded.pin;
  -- AFTER
  INSERT INTO profesores(codigo, pin, nombre, es_admin)
    VALUES ('223992647', '#admin*p15#', 'Administrador P15', 1)
    ON CONFLICT(codigo) DO NOTHING;
  ```
  Reason: current behavior silently reverts user-changed PINs on every boot.

Migration properties: additive, idempotent (`ADD COLUMN IF NOT EXISTS`), column-existence-guarded. No destructive SQL. Reversible via symmetric `DROP COLUMN` (rollback plan).

## 5. Public types

```ts
// src/auth/loginStorage.ts
export type AdminUser = {
  id: number;
  codigo: string;
  nombre: string;
  // esAdmin inferred (only admins can log in), optional field for compat
  esAdmin?: boolean;
};

export type Session = {
  admin: AdminUser;
  loginAt: string;   // ISO-8601
  expiresAt: string;  // ISO-8601, loginAt + 8h
};

// src/auth/AuthContext.tsx
export type AuthState =
  | { status: 'unauthenticated' }
  | { status: 'authenticating' }
  | { status: 'authenticated'; session: Session }
  | { status: 'locked'; session: Session };

export type AuthContextValue = {
  state: AuthState;
  login: (codigo: string, pin: string) => Promise<void>;
  logout: () => void;
  unlock: (pin: string) => Promise<void>;
  resetIdleTimer: () => void;
};

// src/hooks/useInventory.ts
export type PrestamoRapidoAlumnoInput = {
  nombre_alumno: string;
  codigo_alumno: string;
  nombre_equipo: string;
  observaciones?: string;
};

export type PrestamoRapidoAlumnoCreate = PrestamoRapidoAlumnoInput & {
  admin: AdminUser;
};

export type PrestamoRapidoAlumnoRow = PrestamoRapidoAlumnoInput & {
  id: number;
  id_admin: number | null;
  autorizante_codigo: string | null;
  autorizante_nombre: string | null;
  persona_prestamo: string | null;
  fecha: string;
};
```

## 6. Component contracts

- **`AuthProvider`** — wraps app root in `main.tsx`. On mount: read `localStorage["p15_admin_session"]`, validate `expiresAt` (clear if past), else restore `authenticated`. Holds `AuthState` via `useReducer`. Wires `useIdleLock` to transition `authenticated → locked` after 15 idle min. Exposes `{ state, login, logout, unlock, resetIdleTimer }`.
- **`useAuth()`** — context access hook; throws if used outside provider (dev guard). Returns `AuthContextValue`.
- **`useIdleLock(onLock)`** — installs `mousemove`/`keydown`/`touchstart` listeners updating `lastActivityAt`; runs a 30s `setInterval` polling `now - lastActivityAt > 15min`; on threshold fires `onLock()` once and suspends until `resetIdleTimer()` called. Cleans up listeners + interval on unmount.
- **`LoginForm`** — props `{ onSubmit(codigo, pin): Promise<void>; error?: string }`. Inputs: `codigo` (text), `pin` (password). On error, shows inline "Código o PIN incorrecto" without clearing inputs. Reused by `Admin.tsx` and `PrestamoRapido.tsx`.
- **`SessionBadge`** — props `{ session: Session }`. Renders "Autorizado por: {nombre} ({codigo}) — sesión desde {HH:mm}" in a visually distinct (colored bg, monospace code) block above submit button.
- **`IdleLockOverlay`** — props `{ session: Session; onUnlock(pin): Promise<void> }`. Full-screen modal; PIN-only re-entry; message "Sesión bloqueada por inactividad — ingrese su PIN para continuar". On success calls `onUnlock` which resets idle timer and restores `authenticated`.

## 7. Flow walkthroughs

- **First-time login**: user on `/prestamo-rapido`, `useAuth()` returns `unauthenticated` → component renders `<LoginForm>`. Submit → `loginAdmin(codigo,pin)` resolves → `saveSession(admin, now, now+8h)` → reducer `authenticated` → component swaps to `<LoanForm>` + `<SessionBadge>`, idle timer starts.
- **Returning user (app restart)**: `AuthProvider` mount effect reads `localStorage`, validates TTL (<8h) → reducer `authenticated` immediately → `/prestamo-rapido` shows `<LoanForm>` directly, no login prompt. If TTL expired → `clearSession()` → `unauthenticated` → login form.
- **Idle lockout**: 15 min pass without activity → `useIdleLock` fires `onLock` → reducer `locked` → renders `<IdleLockOverlay>` over the route (provider-level overlay, not per-page). User enters PIN → `unlock(pin)` revalidates against stored `admin.codigo` via `loginAdmin` → on success reducer `authenticated`, idle timer reset, overlay dismissed.
- **Loan submit**: `<LoanForm>` builds `PrestamoRapidoAlumnoInput` from student/item fields (no free-text persona input), merges `admin` from `useAuth().state.session.admin` → calls `createPrestamoRapidoAlumno({...input, admin})`. Function throws if `admin` null (defensive). INSERT writes `id_admin`, `autorizante_codigo`, `autorizante_nombre`, plus `persona_prestamo = admin.nombre` for legacy-report compat. After insert, history refetch renders "Autorizado por: {autorizante_nombre}" (falls back to `persona_prestamo` for legacy NULL rows).

## 8. Schema migration safety

- **Idempotent**: `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` — repeated boot runs are no-ops. SQLite-version-guarded; if a build lacks `IF NOT EXISTS` support, fall back to a `PRAGMA table_info` existence check before each ALTER.
- **No destructive SQL**: no `DROP TABLE`, no `DROP COLUMN`, no `DELETE`. The only removal is the `CREATE TABLE IF NOT EXISTS admin_users` statement from the bootstrap string — existing user databases are untouched (table remains orphaned but harmless).
- **ON CONFLICT fix is harmless in reverse**: changing `DO UPDATE SET pin=excluded.pin` → `DO NOTHING` only affects the default admin seed row when it already exists. For fresh installs it still inserts. For existing installs with the default row it now skips — exactly the desired behavior. Reverting back to `DO UPDATE` would reintroduce the silent-PIN-overwrite bug but not corrupt data.
- **`useInventory-LeoLaptop.ts` is drift**: per `.sdd-init.md` and follow-up F3,viar ese archivo duplicate. The bundled/canonical file is `src/hooks/useInventory.ts` (the one Vite imports). The `-LeoLaptop` variant is NOT imported by the app — confirm via `grep "LeoLaptop" src/` returns nothing during apply phase. All migrations target canonical file only.

## 9. Testing strategy

`strict_tdd=false` — no test framework installed (`.sdd-init.md`). No automated tests written this change. Manual test plan (7 steps), run against a fresh local SQLite after migration:

1. **Login OK** — start app, go `/prestamo-rapido`, enter code `223992647` + PIN `#admin*p15#` → loan form + badge appear, `localStorage["p15_admin_session"]` populated with `expiresAt` 8h ahead.
2. **Wrong PIN** — enter valid code + wrong PIN → inline "Código o PIN incorrecto", inputs persist, no session in localStorage, `currentAdmin` stays null.
3. **Persistence across restart** — after step 1, close Tauri window, reopen → `/prestamo-rapido` renders loan form directly, badge shows same admin.
4. **Idle lock** — log in, wait 15 min without input → full-screen lock overlay appears with PIN-only re-entry; entering correct PIN restores form, timer resets.
5. **Logout** — click "Cerrar sesión" → `currentAdmin` null, localStorage key removed, screen returns to login form, idle timer cleared.
6. **Submit captures identity** — logged in, submit a loan → DB row has `id_admin`, `autorizante_codigo`, `autorizante_nombre`, `persona_prestamo = admin.nombre` all non-null.
7. **History shows authorizer** — open history list → each new row renders "Autorizado por: {autorizante_nombre}"; pre-change rows with NULL authorizer fall back to "Autorizado por: {persona_prestamo}".

Automated coverage (`vitest` for `loginAdmin`, AuthContext reducer, migration idempotency, smoke test for identity capture) is deferred to follow-up **F6**.

## 10. Risk register & open questions

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|-----------|
| R1 | Plaintext PINs persist — this change does not improve PIN security | Certain | Medium (offline threat model) | Scope-bound; deferred to F1 (PBKDF2 via Web Crypto) |
| R2 | Login gate adds UX friction to fast kiosk flow | High | Low | Session persistence → login once per 8h shift; idle is PIN-only re-entry |
| R3 | Idle lockout fires during a long legitimate form fill (no mousemove) on a touch-only kiosk | Medium | Medium | listeners include `keydown` + `touchstart`, not just mouse; form typing counts as activity |
| R4 | `localStorage` viewer/attacker can forge a `p15_admin_session` blob | Low (offline desktop) | Medium | `unlock()` revalidates PIN against DB; forged session still requires valid PIN to keep using after first idle. Note in F1. |

**Open question (1):** Does the 15-min idle lockout also apply to `/admin`? **Recommendation: yes** — share the same `useIdleLock` hook at the `<AuthProvider>` root so all gated routes lock together. Any objection, raise before apply phase. (/`kiosko` gating stays out of scope per proposal — F2.)

## Threat matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary. Auth gate is an in-component render switch (`currentAdmin === null ? <LoginForm> : <LoanForm>`), not a route-level or shell integration.

## Migration / Rollout

Single migration step at app boot (existing prepared-statement runner in `useInventory.ts`), additive and idempotent — no feature flag, no phased rollout. Rollback per proposal: remove AuthProvider wrap, remove gate from `PrestamoRapido.tsx`, symmetric `DROP COLUMN` migration, restore `admin_users` CREATE if needed (table was never dropped from user DBs, so only the CREATE statement returns), revert `ON CONFLICT` to `DO UPDATE`. All additive/reversible — no data loss risk.