# Cómo contribuir

Este proyecto se mantiene para la **Preparatoria 15 (UDG)** y cualquiera puede ayudar.
Hay dos formas de contribuir y **ninguna requiere que te den acceso al repositorio**.

---

## Camino 1: Reportar problemas o proponer mejoras (para todos)

Si usas la app — profesor, administrativo, becario — esto es lo único que necesitas:

1. Entra a <https://github.com/Leoglez10/app-prestamos-p15/issues/new/choose>.
2. Elige el formulario que corresponda:
   - **🐛 Reportar un problema** — algo no funcionó como debería.
   - **💡 Sugerir una mejora** — te gustaría que la app hiciera algo nuevo.
3. Llena el formulario. No necesitas saber programar; mientras más contexto des
   (qué intentabas, qué pasó, una captura), más rápido se puede resolver.

> Antes de abrir un issue, checa las [Dudas frecuentes](README.md#-dudas-frecuentes)
> del README: varios problemas comunes ya tienen respuesta ahí.

**Flujo completo del usuario:**

```text
Usar la app
   ↓
Encontrar problema o tener una idea
   ↓
Abrir Issue (formulario)
   ↓
El mantenedor lo resuelve y sale en una versión nueva
```

---

## Camino 2: Contribuir código (para quien programa)

Si sabes programar y quieres corregir o extender la app, el flujo es **fork → rama → Pull Request**.
No necesitas permisos de escritura: trabajas sobre tu propia copia y propones el cambio.

### Requisitos previos

1. **Node.js** 20 o superior → <https://nodejs.org/>
2. **Rust** (rustup) → <https://rustup.rs/>
3. **Git** → <https://git-scm.com/>
4. En Windows: **Microsoft C++ Build Tools** y **WebView2 Runtime**
   (detalle completo en el [README](README.md#-para-programadores-configurar-y-compilar))

### Flujo paso a paso

```bash
# 1. Haz fork del repo en GitHub (botón "Fork" arriba a la derecha)

# 2. Clona TU fork (reemplaza TU-USUARIO)
git clone https://github.com/TU-USUARIO/app-prestamos-p15.git
cd app-prestamos-p15/app-prestamos-p15

# 3. Instala dependencias
npm install

# 4. Crea una rama para tu cambio
git checkout -b feat/mi-cambio

# 5. Corre la app en modo desarrollo (Tauri + SQLite, el dev real)
npm run tauri dev

# 6. Haz tus cambios, con commits claros
git add .
git commit -m "feat: descripción corta del cambio"

# 7. Antes de proponer, valida
npx tsc --noEmit
npm test

# 8. Sube tu rama y abre el Pull Request
git push -u origin feat/mi-cambio
# → GitHub → "Compare & pull request" → describe qué y por qué
```

> ⚠️ `npm run dev` (solo Vite) corre la app **de forma limitada y sin base de datos**.
> Para desarrollo real usa siempre `npm run tauri dev`.

### Convenciones del repo

- **Mensajes de commit** en formato convenido: `feat:`, `fix:`, `docs:`, `chore:`.
  - `feat: alta de proyectores`
  - `fix: problema al devolver equipos a granel`
  - `docs: actualizo README`
- **Nombres de rama**: `feat/...` para funciones, `fix/...` para correcciones, `docs/...` para documentación.
- **Nunca subas**: `prestamos.db` (base de datos real), `node_modules/`, `target/`,
  archivos con contraseñas reales, ni los archivos locales `-LeoLaptop.*`.
  El `.gitignore` ya los excluye, pero verifícalo antes de tu commit.
- **Valida antes del PR**: `npx tsc --noEmit` y `npm test` deben pasar sin errores.
  Para cambios de interfaz, valida también manualmente con `npm run tauri dev`
  (el proyecto todavía no tiene pruebas end-to-end de la interfaz).

### Qué esperar después del PR

1. El mantenedor revisa el cambio.
2. Si hay comentarios, ajusta en tu rama y vuelve a hacer `git push`
   (el PR se actualiza solo).
3. Al aprobarse, se fusiona a `main` y sale en una versión futura.

> 📚 Antes de tocar zonas grandes del código, lee
> [`docs/ENGINEERING_HANDBOOK.md`](app-prestamos-p15/docs/ENGINEERING_HANDBOOK.md).
> Hay deudas técnicas documentadas (monolito en `Admin.tsx`, mezcla de responsabilidades
> en `useInventory.ts`) que conviene conocer antes de modificar.

---

## Roles y responsabilidades

| Quién | Qué hace |
|---|---|
| **Usuarios de la app** | Instalan el `.exe`, usan la app y reportan Issues. |
| **Responsable de audiovisuales** | Inventario, respaldos y restauración ([guía](README.md#-respaldo-y-recuperación-importante)). |
| **Mantenedor del repo** | Revisa PRs, decide qué entra y publica versiones. |
| **Colaboradores de código** | Fork → rama → PR. Sin acceso de escritura directa a `main`. |

---

## Preguntas

¿Dudas sobre cómo contribuir? Abre un issue con el formulario
**💡 Sugerir una mejora** y lo vemos ahí.
