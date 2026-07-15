# Spec: admin-auth

## Purpose

The `admin-auth` capability provides a global authentication and session management layer for admin users across the app-prestamos-p15 desktop application. It exists because the Préstamo Rápido screen currently operates without any accountability — any user can create loan records with no verifiable identity. This capability reuses the existing `loginAdmin(codigo, pin)` mechanism and the `profesores.es_admin` table as the single source of truth for admin identity, exposing it through a React Context so that any route can require, display, and persist an authenticated admin session.

## Requirements

### Requirement: Admin login on /prestamo-rapido

The Préstamo Rápido screen SHALL require a successful admin login before exposing the loan form. The login gate SHALL be implemented inside the `PrestamoRapido.tsx` component (not at the route level) to match the existing pattern in `Admin.tsx`. The login form SHALL collect `codigo` (text input) and `pin` (password input), call `loginAdmin(codigo, pin)`, and only render the loan form on success. On failure, the form SHALL display an inline error message "Código o PIN incorrecto" without clearing the inputs.

### Requirement: Shared AuthContext

A React Context exported from `src/auth/AuthContext.tsx` SHALL expose `{ currentAdmin, login, logout, isLocked, lastActivityAt, resetIdleTimer }`. The provider SHALL wrap the application root in `App.tsx` so that both `/admin` and `/prestamo-rapido` routes share a single admin session. The `currentAdmin` value SHALL be `null` when no admin is logged in, or an object `{ id, codigo, nombre, esAdmin }` when authenticated. The `login(codigo, pin)` function SHALL call the existing `loginAdmin()` from `useInventory.ts` and, on success, persist the session and start the idle timer. The `logout()` function SHALL clear the persisted session and reset `currentAdmin` to `null`.

### Requirement: Session persistence

The admin session SHALL be persisted to `localStorage` under key `p15_admin_session` with fields `{ admin: { id, codigo, nombre, esAdmin }, loginAt: <ISO-8601>, expiresAt: <ISO-8601> }`. The `expiresAt` value SHALL be set to `loginAt + 8 hours`. On application mount, the AuthContext provider SHALL read `localStorage["p15_admin_session"]`, validate that `expiresAt` has not passed, and restore `currentAdmin` if valid. If the session has expired, the provider SHALL remove the key and set `currentAdmin` to `null`.

### Requirement: Idle lockout

After 15 minutes without `mousemove`, `keydown`, or `touchstart` activity, the screen SHALL display a lock overlay requiring PIN re-entry. The overlay SHALL NOT require re-entering the admin code — only the PIN. On successful PIN re-entry, the idle timer SHALL reset and the session SHALL continue with the same admin identity. The `lastActivityAt` timestamp SHALL be updated on every qualifying DOM event. The idle check SHALL use a `setInterval` polling at 30-second granularity. The lock overlay SHALL display "Sesión bloqueada por inactividad — ingrese su PIN para continuar".

### Requirement: Logout

The user SHALL be able to explicitly log out by clicking a "Cerrar sesión" button. Logout SHALL: (1) remove `localStorage["p15_admin_session"]`, (2) set `currentAdmin` to `null`, (3) clear the idle timer, and (4) return the screen to the login form. The "Cerrar sesión" button SHALL be visible whenever an admin is logged in.

### Requirement: Default admin seed immutability

The bootstrap INSERT of the default admin row (code `223992647`, PIN `#admin*p15#`) SHALL use `ON CONFLICT(codigo) DO NOTHING` so that user-edited PINs are not silently overwritten on every application boot. The existing `ON CONFLICT(codigo) DO UPDATE SET pin = excluded.pin` behavior SHALL be removed.

## Scenarios

#### Scenario: Admin logs in successfully
- Given a user on /prestamo-rapido without an active session
- When they enter code `223992647` and PIN `#admin*p15#`
- Then the loan form becomes visible AND a badge "Autorizado por: Administrador P15 (223992647)" appears AND `localStorage["p15_admin_session"]` is populated with a valid `expiresAt`

#### Scenario: Wrong PIN
- Given no active session
- When the user enters code `223992647` and an incorrect PIN
- Then the login form shows an inline error "Código o PIN incorrecto" AND no session is persisted to localStorage AND `currentAdmin` remains `null`

#### Scenario: Session persists across app restart
- Given a successful login 5 minutes ago
- When the Tauri app is closed and reopened
- Then /prestamo-rapido renders the loan form directly (no login prompt) AND the badge shows the same admin identity AND `currentAdmin` is restored from localStorage

#### Scenario: Expired session is rejected
- Given a session persisted 9 hours ago (past the 8-hour TTL)
- When the app is opened
- Then `localStorage["p15_admin_session"]` is removed AND the login form is shown AND `currentAdmin` is `null`

#### Scenario: Idle lockout after 15 minutes
- Given an active session with no user activity for 15 minutes
- When the user attempts to interact with the form
- Then a lock overlay appears requiring PIN re-entry
- And on successful re-entry the same admin identity is restored without re-entering the code AND the idle timer resets

#### Scenario: Logout clears state
- Given an active session
- When the user clicks "Cerrar sesión"
- Then `currentAdmin` is `null` AND `localStorage["p15_admin_session"]` is removed AND the screen returns to the login form AND the idle timer is cleared

#### Scenario: Default admin PIN is not overwritten on reboot
- Given the default admin PIN has been changed to `#newPin99#` via Admin → Configuración
- When the application restarts and the bootstrap migration runs
- Then the PIN in the `profesores` table remains `#newPin99#` (not reverted to `#admin*p15#`)
