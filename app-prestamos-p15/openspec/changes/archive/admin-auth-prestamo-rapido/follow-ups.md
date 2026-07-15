# Follow-ups

Items deliberately out of scope for `admin-auth-prestamo-rapido`. Each is recorded so it is not forgotten.

## F1. PIN hashing

Replace the plaintext PIN comparison in `loginAdmin` with a hashed comparison. Approach: PBKDF2-SHA256 with 100k iterations using Web Crypto API's `SubtleCrypto`. Requires adding a `pin_hash` + `pin_salt` column to `profesores` and a one-time migration of existing PINs. Deferred because the current threat model is "someone sitting at the laptop" and the desktop app is offline-only.

## F2. Kiosk route auth gate

Today `/kiosko` uses `verificarProfesorExacto` (code-only) and writes loans attributed to the teacher. Consider whether this route should also be admin-gated, or whether the asymmetry is intentional (admin lends to students, teachers self-serve). Discuss with stakeholders.

## F3. Remove `-LeoLaptop.*` duplicates

The repo carries drifting duplicates of `useInventory.ts`, `Admin.tsx`, `App.css`, `package.json`, `tauri.conf.json`, and `lib.rs`. Decide whether to delete or merge. See `docs/REPO_CLEANUP.md`.

## F4. Shared modal component

Extract a `<Modal />` component to replace the bespoke modal patterns in Kiosk, Admin, and PrestamoRapido. The login screen and the idle-lockout overlay would benefit from a shared modal.

## F5. End-of-day "cerrar turno" workflow

A workflow that takes a final inventory snapshot, blocks further loans, and exports the day's prestamos to a printable PDF. Useful for the shared-kiosk use case.

## F6. Test suite (vitest)

No test framework is currently installed. Follow-up to introduce vitest + a test file for `loginAdmin`, the AuthContext reducer, the schema migrations, and a smoke test for `createPrestamoRapidoAlumno` identity capture.
