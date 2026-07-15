# Follow-ups — login-solo-codigo

The F1-F6 follow-ups from the previous `admin-auth-prestamo-rapido` change are still open. The simplification here does not close them; it adjusts which ones still apply to `/prestamo-rapido`.

## F1. PIN hashing (still pending for /admin, moot for /prestamo-rapido)
- The `/admin` route still uses `loginAdmin(codigo, pin)` with a plaintext PIN in the DB. The personal-kiosk use case accepted this trade-off; the admin panel arguably deserves more. Pending.
- The simplified `/prestamo-rapido` flow no longer uses a PIN, so the hashing question is moot for that route.

## F2. Kiosk /kiosko auth gate
- Unchanged. Out of scope for this change.

## F3. Remove `*-LeoLaptop.*` duplicates
- Unchanged. Out of scope.

## F4. Shared `<Modal />` component
- Unchanged. Out of scope.

## F5. End-of-day "cerrar turno" workflow
- Unchanged. Out of scope. The user has confirmed the simple "click Cerrar sesión" pattern is enough for now.

## F6. Test suite (vitest)
- Unchanged. Out of scope.
