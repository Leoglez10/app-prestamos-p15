# Manual Test Checklist — login-solo-codigo

Run these 6 steps against a fresh Tauri window after the change is applied.

## Step 1 — Login with valid code [ ]
1. Cold start the app.
2. Navigate to `/prestamo-rapido`.
3. Verify: only one input ("Código") is visible. No PIN field. No lock overlay. No idle timer.
4. The codigo input is pre-filled with `223992647`.
5. Click Entrar.
6. Verify: the loan form appears. A "Sesión: Administrador P15 (223992647)" badge is visible.

## Step 2 — Invalid code is rejected [ ]
1. From the login screen, change the codigo input to `999999`.
2. Click Entrar.
3. Verify: an inline error "Código no encontrado o no es administrador" appears. The loan form does NOT appear.

## Step 3 — Logout returns to clean login [ ]
1. From a logged-in state, click "Cerrar sesión" in the badge.
2. Verify: the loan form is hidden. The login form reappears with an empty codigo input.
3. Open DevTools → Application → Local Storage. Verify `p15_admin_session` is removed.

## Step 4 — Login form is centered [ ]
1. Resize the window to 1024x680.
2. Verify: the login form is visually centered vertically and horizontally. No left/right/top/bottom margin drift.
3. Resize to 1280x840.
4. Verify: same — still centered.

## Step 5 — /admin route is unchanged [ ]
1. Navigate to `/admin`.
2. Verify: the codigo + PIN login form is shown (not the simplified single-input).
3. Log in with `223992647` / `#admin*p15#`.
4. Verify: the admin panel renders normally with the existing Inventario/Categorías/Profesores/Reportes/Configuración tabs.

## Step 6 — Accountability chain still works [ ]
1. From the simplified `/prestamo-rapido` flow, log in as `223992647`.
2. Submit a loan.
3. Inspect the `prestamos_rapidos_alumnos` table (via Tauri devtools or a SQLite client).
4. Verify: the new row has non-null `id_admin`, `autorizante_codigo="223992647"`, `autorizante_nombre="Administrador P15"`.
5. Click "Cerrar sesión", log in again, submit another loan — verify the same identity is captured.

## Step 7 (sanity) — No idle lock [ ]
1. Log in. Leave the window open and untouched for 5 minutes.
2. Verify: no lock overlay appears. The form is still usable.
