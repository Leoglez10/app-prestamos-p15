# Manual test checklist — admin-auth-prestamo-rapido

> Executed by the human against a fresh local SQLite + Tauri window after
> `npm run tauri dev` (or built desktop app). Steps mirror design §9.
> strict_tdd=false; no automated suite — each step requires a manual pass.

## Prerequisites

- [ ] Build is current: `npm run build` succeeds.
- [ ] DB schema is current: launch the app at least once so `prepareDatabase` runs the migrations.
- [ ] DevTools console open to observe `localStorage["p15_admin_session"]`.

## Steps

- [ ] **1. Login OK** — Start the app, navigate to `/prestamo-rapido`, enter code `223992647` and PIN `#admin*p15#`. The loan form becomes visible, the session badge "Autorizado por: Administrador P15 (223992647) — sesión desde HH:mm" appears, and `localStorage["p15_admin_session"]` holds a JSON with `expiresAt` ~8h ahead.
- [ ] **2. Wrong PIN** — With no active session, enter code `223992647` and an incorrect PIN. The login form shows inline "Código o PIN incorrecto", inputs persist, no session is written to localStorage, and `useAuth().state.status` remains `unauthenticated`.
- [ ] **3. Persistence across app restart** — After step 1, fully close the Tauri window and reopen it. `/prestamo-rapido` renders the loan form directly (no login prompt), the badge shows the same admin, and `useAuth()` is `authenticated` after mount.
- [ ] **4. Idle lock after 15 min** — Log in, leave the app idle for 15 minutes without input. A full-screen lock overlay appears with PIN-only re-entry; entering the correct PIN restores the form and resets the idle timer.
- [ ] **5. Logout** — Click "Cerrar sesión" in the SessionBadge (or "Cerrar sesión admin" in the Admin sidebar). `localStorage["p15_admin_session"]` is removed, `useAuth().state.status` returns to `unauthenticated`, and the page swaps back to the login form. The idle timer is cleared (no overlay reappears until the next 15 min of inactivity).
- [ ] **6. Submit captures identity** — While logged in as `Administrador P15 (223992647, id 1)`, submit a loan for student "Juan Pérez" with item "Calculadora". The new row in `prestamos_rapidos_alumnos` has `id_admin=1`, `autorizante_codigo="223992647"`, `autorizante_nombre="Administrador P15"`, and `persona_prestamo="Administrador P15"` (the last via the data-layer fallback).
- [ ] **7. History shows authorizer** — Open the history list. New rows render "Autorizado por: Administrador P15" in the authorizer cell. Pre-change rows with `autorizante_nombre IS NULL` fall back to the legacy `persona_prestamo` value (e.g. "Prof. García").

## Definition of done

All seven steps pass. The orchestrator may proceed to `sdd-verify` and `sdd-archive`.
