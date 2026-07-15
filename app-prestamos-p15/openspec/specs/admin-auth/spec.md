# Spec: admin-auth

> Source: openspec/changes/admin-auth-prestamo-rapido/specs/admin-auth/spec.md (initial) + openspec/changes/login-solo-codigo/spec.md (simplification delta) — archived 2026-07-14

## Purpose

The `admin-auth` capability provides authentication and session management for admin users across the app-prestamos-p15 desktop application. The initial `admin-auth-prestamo-rapido` change introduced a full auth machine (codigo + PIN + 8h TTL + 15min idle lock) to the Préstamo Rápido screen for accountability. The subsequent `login-solo-codigo` change simplified the `/prestamo-rapido` flow to a single code input — no PIN, no idle lock, no TTL — for the personal-kiosk use case. The `/admin` route retains the full codigo + PIN login. The accountability chain in the data layer (three columns on `prestamos_rapidos_alumnos`) is preserved across both rounds — every loan still records who authorized it.

## Requirements

### Requirement: Simple-code login on /prestamo-rapido
The Préstamo Rápido screen SHALL accept an admin code only. There SHALL be no PIN input, no idle lockout, and no 8-hour TTL. A successful login SHALL set `currentAdmin` for the duration of the session until explicit logout.

### Requirement: Two-state auth machine
The auth state machine SHALL have only two states: `unauthenticated` and `authenticated`. There SHALL be no `locked` state. Logout SHALL return to `unauthenticated` and the persisted session in localStorage SHALL be cleared.

### Requirement: No idle lock, no TTL enforcement
The `useIdleLock` hook and the `IdleLockOverlay` component SHALL be removed from the codebase. The `AuthContext` SHALL NOT track `lastActivityAt` and SHALL NOT poll for session expiry.

### Requirement: Code-only credential check
A new function `loginAdminByCode(codigo: string)` in `useInventory.ts` SHALL return the matching admin row from `profesores` if and only if the row exists and `COALESCE(es_admin, 0) = 1`. There SHALL be no PIN comparison.

### Requirement: Admin.tsx regression safety
The `/admin` route SHALL continue to use the existing codigo + PIN login. This change SHALL NOT modify the auth flow in `src/pages/Admin.tsx`. The previous `loginAdmin` function in `useInventory.ts` SHALL remain for the admin flow.

### Requirement: Centered login layout
The `LoginForm` SHALL be visually centered in the viewport (vertical + horizontal) using a flexbox or grid container, regardless of viewport size between 1024x680 and 1280x840. The form SHALL not drift off-center as the window resizes.

### Requirement: Simplified session badge
The `SessionBadge` SHALL render "Sesión: <nombre> (<código>)" alongside a "Cerrar sesión" button. The login timestamp SHALL NOT be displayed.

## Scenarios

#### Scenario: User logs in with valid code
- Given the user is on `/prestamo-rapido` and no session is active
- When they type code `223992647` and click Entrar
- Then the loan form becomes visible AND a "Sesión: Administrador P15 (223992647)" badge appears AND the user can submit loans

#### Scenario: User enters invalid code
- Given the user is on `/prestamo-rapido` and no session is active
- When they type a non-existent or non-admin code
- Then an inline error "Código no encontrado o no es administrador" appears AND the form is not shown

#### Scenario: Logout returns to clean login
- Given a logged-in admin on `/prestamo-rapido`
- When they click "Cerrar sesión"
- Then the loan form is hidden AND the login form is shown with empty inputs AND `localStorage["p15_admin_session"]` is removed

#### Scenario: Login form is centered
- Given the viewport is between 1024x680 and 1280x840
- When the login form is rendered
- Then it is visually centered vertically and horizontally with no left/right/top/bottom margin drift

#### Scenario: /admin route is unchanged
- Given the user navigates to `/admin`
- When the page loads
- Then the existing codigo + PIN login form is shown AND the simplified `/prestamo-rapido` flow is NOT applied to this route

#### Scenario: Accountability chain preserved
- Given an admin is logged in via the simplified flow
- When the user submits a loan
- Then the new row in `prestamos_rapidos_alumnos` has `id_admin`, `autorizante_codigo`, `autorizante_nombre` populated from the active session

#### Scenario: No locked state
- Given an admin is logged in and the app is open for an arbitrary period
- When any duration of time passes (no user activity simulated)
- Then no lock overlay is shown AND the session remains active until explicit logout
