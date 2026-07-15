# Change: login-solo-codigo

## Why
The previous auth gate (`admin-auth-prestamo-rapido`, shipped) introduced codigo + PIN + 8h TTL + 15min idle lockout. The user has confirmed this is over-engineered for the actual use case: a single-operator personal Windows kiosk. The default admin (codigo `223992647`, PIN `#admin*p15#`) is hardcoded in the source, so the PIN added friction without adding real security — anyone with the admin code could already log in.

The simplification the user asked for: just type your code, do your loans, click "Cerrar", repeat. No PIN, no idle lock, no TTL. The "Sesión" marker is a "who is currently using the app" tag, not a long-lived auth token.

The login form also needs to be visually centered in the viewport — the previous layout put it inside the page header, which feels off for an entry screen.

## What Changes
- `LoginForm` keeps only the codigo input (pre-filled with `223992647` for convenience). PIN input is removed. The form is centered both vertically and horizontally on the viewport (flex/grid, min-height 100vh).
- `AuthContext` drops the `locked` state, the `unlock()` action, the `resetIdleTimer`, the `useIdleLock` wiring, and the 60s TTL runtime poll. `login(codigo: string)` replaces `login(codigo, pin)`. The state machine shrinks to two states: `unauthenticated` and `authenticated`.
- New `loginAdminByCode(codigo)` in `useInventory.ts` that returns the admin row if it exists and `es_admin=1`. The PIN check is gone.
- `useIdleLock.ts` and `IdleLockOverlay.tsx` are deleted.
- `SessionBadge` simplifies to "Sesión: <nombre> (<código>)" + a logout button. The "— sesión desde HH:mm" timestamp is dropped (no TTL to track).
- `main.tsx` no longer renders the idle overlay.
- `PrestamoRapido.tsx` gate simplifies: only `authenticated` vs `unauthenticated`, no `locked` branch. Submit still passes `admin` to `createPrestamoRapidoAlumno`.
- `Admin.tsx` is **unchanged** — the /admin route keeps its codigo+PIN flow to preserve the admin panel's existing security posture. The previous auth work is preserved for that path.

## Out of Scope
- /kiosko auth gate (F2)
- PIN hashing (F1) — moot for the simplified flow
- Removal of `*-LeoLaptop.*` duplicates (F3)
- Shared `<Modal />` component (F4)
- End-of-day "cerrar turno" summary (F5)
- vitest setup (F6)
- Schema change: the 3 columns added in `admin-auth-prestamo-rapido` (`id_admin`, `autorizante_codigo`, `autorizante_nombre`) are still populated by `createPrestamoRapidoAlumno` — the accountability chain from the previous change survives the auth simplification.

## Success Criteria
1. From a cold start, the only input visible on `/prestamo-rapido` is "Código". No PIN field, no lock overlay, no session info banner.
2. Typing a valid admin code and clicking Entrar shows the loan form and a "Sesión: <nombre> (<código>)" badge.
3. Typing a non-existent or non-admin code shows an inline error and the form stays on the login.
4. Clicking "Cerrar sesión" returns the screen to a clean centered login with empty input.
5. The login form is visually centered (vertical + horizontal) on a 1280x840 window.
6. `npx tsc --noEmit` returns 0 errors. `npm run build` succeeds.
7. The `/admin` route still requires codigo + PIN (regression check).
8. Loan rows still capture `id_admin`, `autorizante_codigo`, `autorizante_nombre` (the accountability chain from the previous change is preserved).

## Risk
- **Reduced auth strength**: without a PIN, anyone who knows the admin code can attribute loans to that admin. Acceptable for the personal-kiosk use case; documented in the spec and in the new manual-test-checklist.
