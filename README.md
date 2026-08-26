<div align="center">

<img src="app-prestamos-p15/img/logo-p15.png" alt="Logo Preparatoria 15" width="150"/>

# App Prestamos P15

### Control de inventario y préstamos de equipo audiovisual para la Preparatoria 15 (UDG)

[![CI — Build Windows Installer](https://github.com/Leoglez10/app-prestamos-p15/actions/workflows/build-windows.yml/badge.svg)](https://github.com/Leoglez10/app-prestamos-p15/actions/workflows/build-windows.yml)
[![Versión](https://img.shields.io/badge/versi%C3%B3n-0.3.0-blue)]()
[![Plataforma](https://img.shields.io/badge/plataforma-Windows%2010%2F11-blue)]()
[![Licencia](https://img.shields.io/badge/usos-Educativo-orange)]()
[![Autor](https://img.shields.io/badge/autor-Leonardo%20Gonzalez-purple)](https://github.com/Leoglez10)

![Tauri](https://img.shields.io/badge/Tauri-v2-24C8DB?logo=tauri&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-local-003B57?logo=sqlite&logoColor=white)
![Offline](https://img.shields.io/badge/100%25-offline-success)

</div>

---

> **Este README está escrito para CUALQUIER persona**: profesor, administrador, becario o alguien que nunca programó. Si eres programador, salta a la sección [Para programadores](#-para-programadores-configurar-y-compilar).

> 🚀 **¿Tienes prisa?**
> 1. Instala la app → [Instalación en 7 pasos](#-instalación-para-usuarios-finales-no-programadores)
> 2. Entra al Admin y cambia el PIN de fábrica → [Credenciales por defecto](#-credenciales-por-defecto-cambiar)
> 3. Activa el respaldo automático → [Respaldo automático](#-respaldo-automático-recomendado-activarlo)
>
> El resto es opcional: [cómo usarla paso a paso](#-cómo-usar-la-app-paso-a-paso), [importar el Excel oficial](#-importar-excel-de-patrimonio) o [contar inventario físico](#-toma-de-inventario-físico).

---

## 📑 Tabla de contenidos

1. [¿Qué es esta app?](#-qué-es-esta-app)
2. [¿Para quién es?](#-para-quién-es)
3. [Vista rápida](#-vista-rápida-qué-puede-hacer)
4. [Instalación para usuarios finales](#-instalación-para-usuarios-finales-no-programadores)
5. [Cómo usar la app paso a paso](#-cómo-usar-la-app-paso-a-paso)
6. [Importar Excel de Patrimonio](#-importar-excel-de-patrimonio)
7. [Toma de inventario físico](#-toma-de-inventario-físico)
8. [Dónde están guardadas las cosas](#-dónde-están-guardadas-las-cosas)
9. [Respaldo y recuperación](#-respaldo-y-recuperación-importante)
10. [Mantenimiento](#-mantenimiento)
11. [GitHub para principiantes](#-github-para-principiantes)
12. [Para programadores](#-para-programadores-configurar-y-compilar)
13. [Estructura del proyecto](#-estructura-del-proyecto-dónde-está-cada-cosa)
14. [Dudas frecuentes](#-dudas-frecuentes)
15. [Cómo contribuir](#-cómo-contribuir)
16. [Versionado](#-versionado)
17. [Documentación relacionada](#-documentación-relacionada)
18. [Licencia y uso](#️-licencia-y-uso)
19. [Créditos](#-créditos)

---

## 🎯 ¿Qué es esta app?

Es un **programa de escritorio** (una aplicación que instalas en una computadora con Windows, NO en el navegador ni en el celular) que sirve para **llevar el control de los equipos audiovisuales** que la Preparatoria 15 presta a sus profesores y alumnos:

- 🖥 Laptops
- 🔌 Adaptadores HDMI
- 📽 Proyectores
- 🎤 Cualquier equipo prestable

La app responde a 3 preguntas básicas:

1. **¿Qué equipo prestamos?**
2. **¿A quién se lo prestamos?**
3. **¿Cuándo nos lo devolvieron?**

Y mantiene un historial completo: si el equipo está disponible, prestado, perdido o en reparación.

> 💡 Piensa en ella como una **libreta digital de préstamos** — pero que no se pierde, no se borra, y la pueden usar varias personas al mismo tiempo (en la misma computadora).

---

## 👥 ¿Para quién es?

| Rol | Qué hace en la app |
|---|---|
| 🎓 **Profesor** | Entra al "Kiosko", escribe su código UDG, pide un equipo y lo devuelve. **No necesita contraseña.** |
| 🛡 **Administrador** | Entra al panel Admin con código + PIN: da de alta equipos, profesores, categorías, genera reportes, hace respaldos. |
| ⚡ **Administrador de Préstamo Rápido** | Entra solo con su código (sin PIN) para registrar préstamos a **alumnos** con trazabilidad. |

> ⚠️ **Importante**: la app está pensada para **una computadora compartida** (por ejemplo, la de la oficina de audiovisuales o la coordinación). No es una app web ni un sistema en la nube: los datos viven **dentro de esa computadora**.

---

## 🖼 Vista rápida: qué puede hacer

<div align="center">

| Modo | Captura |
|---|---|
| **🏠 Inicio** — pantalla central con 3 tarjetas | ![Inicio](app-prestamos-p15/docs/img/inicio.png) |
| **🛠 Admin** — acceso admin (código + PIN) | ![Admin](app-prestamos-p15/docs/img/admin.png) |
| **⚡ Préstamo Rápido** — acceso admin (solo código) | ![Préstamo Rápido](app-prestamos-p15/docs/img/prestamo-rapido.png) |
| **📱 Kiosko** — _(requiere Tauri + SQLite; ver nota)_ | _(pendiente)_ |

</div>

> 📸 **Nota sobre las capturas**: las tres primeras se tomaron con `npm run dev` (Vite solo). Mostramos la pantalla en estado **pre-login**, antes de entrar. El **Kiosko** necesita la base de datos activa desde el arranque (no tiene estado pre-login), así que su captura real requiere `npm run tauri dev` con la app de escritorio. Para actualizarlas: `npm run dev` → abrir <http://localhost:1770/> → capturar y guardar en `docs/img/`.

### Funciones principales

- ✅ Catálogo de equipos organizado por categorías
- ✅ Préstamo a profesor (kiosko) y a alumno (préstamo rápido)
- ✅ Manejo de **equipos únicos** (1 laptop = 1 registro) y **a granel** (10 adaptadores en 1 fila)
- ✅ Estados: `disponible`, `prestado`, `extraviado`, `mantenimiento`
- ✅ Sugerencia automática de **HDMI** al prestar una laptop
- ✅ Lectura de **códigos de barras** en kiosko y en la toma de inventario
- ✅ Importación del Excel oficial de **Patrimonio** con plan previo y respaldo automático antes de aplicar
- ✅ **Toma de inventario físico** por áreas, con campaña de escaneo y reporte
- ✅ **Respaldo automático** configurable (frecuencia; conserva los últimos 20)
- ✅ Control de qué es **prestable** y qué es *solo inventario*, por categoría o por equipo
- ✅ Reportes imprimibles en PDF (vía "imprimir" del navegador interno)
- ✅ Respaldo y restauración de la base de datos **desde dentro de la app**
- ✅ Sesión de admin con expiración de 8 horas
- ✅ Trabaja **sin internet** (todo es local)

---

## 📦 Instalación para usuarios finales (no programadores)

### Requisitos

- Una computadora con **Windows 10 o Windows 11**
- El runtime **WebView2** (viene preinstalado en Windows 11; en Windows 10 puede que lo descargues de Microsoft: <https://developer.microsoft.com/microsoft-edge/webview2/>)
- Que alguien haya generado el instalador `.exe` o `.msi` (ver [Para programadores](#-para-programadores-configurar-y-compilar))

### Pasos

1. **Consigue el instalador.** Es un archivo que termina en `.exe` o `.msi` (por ejemplo `App Prestamos P15_0.3.0_x64-setup.exe`). Hay dos formas:
   - **A) Desde GitHub (recomendado).** Entra a <https://github.com/Leoglez10/app-prestamos-p15/releases>, busca la versión más reciente, y en la sección **Assets** descarga el archivo `.exe` (_x64-setup.exe_) o `.msi`.
   - **B) Copia manual** (USB, carpeta compartida, etc.) — alguien que ya tenga el instalador te lo pasa.
2. **Cópialo a la computadora** destino si lo descargaste en otra máquina.
3. **Doble clic** sobre el instalador.
4. **Windows quizá mostrará una advertencia azul** ("Windows protegió su PC") porque no tenemos certificado de firma. No te preocupes:
   - Haz clic en **"Más información"** → **"Ejecutar de todas formas"**.
   - Esto es normal en apps de distribución interna sin certificado comercial.
5. Sigue el asistente (Siguiente → Siguiente → Instalar).
6. Al terminar, verás el ícono de la app en el escritorio o en el menú Inicio: **"App Prestamos P15"**.
7. **Ábrela**. La primera vez crea la base de datos con datos de ejemplo.

> ✅ Listo. No necesitas internet, no necesitas servidor, no necesitas configurar nada.

### Credenciales por defecto (¡CAMBIAR!)

La app viene con un administrador precargado (solo para empezar):

| Campo | Valor |
|---|---|
| Código | `223992647` |
| PIN | `#admin*p15#` |

> ⚠️ **La primera vez que entres al Admin, cambia el PIN del administrador.** Aun así, la versión actual conserva la combinación de fábrica como acceso de recuperación para el código `223992647`; cambiar el PIN guardado NO desactiva ese fallback. Usa la app únicamente en el entorno interno previsto y corrige `loginAdmin` antes de tratarla como un sistema endurecido para producción.

---

## 🚶 Cómo usar la app paso a paso

### Flujo 1: Un profesor quiere pedir prestado un equipo (Kiosko)

1. Abre la app. Verás 3 tarjetas grandes.
2. Haz clic en **"Soy Profesor"**.
3. Escribe tu **código UDG** (por ejemplo `223992647`) → Enter. No necesitas contraseña.
4. Verás el catálogo: filtra con los **chips de categoría** o busca por nombre, marca, modelo o ID patrimonial.
   - Si tienes lector/cámara de código de barras: escanea y el equipo exacto aparece primero.
5. Toca el equipo para agregarlo al **carrito** (puedes pedir varios; los equipos a granel muestran cuántos quedan).
   - 💡 Si pides una **laptop**, la app te sugiere agregar un **HDMI** disponible con un clic.
6. Opcionalmente escribe **notas de entrega** → **Confirmar**.
7. El sistema marca el equipo como prestado y registra fecha/hora. Aparece el modal de éxito y **la sesión se cierra sola en 3 segundos** (es una terminal compartida).
8. Para **devolver**: entra de nuevo con tu código, ve a tus préstamos activos y devuelve uno por uno o toca **"Devolver todo"**.

### Flujo 2: Préstamo a un alumno (Préstamo Rápido)

1. En la pantalla de inicio, clic en **"Préstamo Rápido"**.
2. El admin entra con su **código** (sin PIN — esto es intencional, queda auditoría de quién autorizó).
3. Llena el formulario: tipo (alumno o profesor), nombre/código, equipo (del inventario o texto libre) y notas.
4. El sistema guarda automáticamente **quién autorizó** (tu nombre y código de admin).
5. En el **historial** de abajo puedes buscar y filtrar por estado:
   - `activo` — aún no se devuelve
   - `vencido` — activo por **más de 24 horas**
   - `devuelto` — cerrado
6. Cuando el alumno regrese el equipo, márcalo como **devuelto** (o elimina el registro si fue un error).

> 📋 Esto sirve para **incidencias rápidas** donde un alumno necesita un equipo y no pasa por el kiosko del profesor.

### Flujo 3: Administrar todo (Admin)

1. En la pantalla de inicio, clic en **"Administrador"**.
2. Escribe tu **código** y tu **PIN**.
3. Tienes pestañas:
   - **Inventario** → dar de alta, editar, ver detalle; menú de fila (⋮): forzar devolución, marcar perdido, eliminar; diseñar/imprimir PDF del inventario; panel de importación del Excel de Patrimonio
   - **Toma de inventario** → campañas de conteo físico con lector de códigos ([ver sección completa](#-toma-de-inventario-físico))
   - **Categorías** → crear/editar categorías y decidir si son **Prestable** o *Solo inventario*
   - **Profesores** → dar de alta profesores que pueden usar el kiosko, marcar admins + PIN
   - **Reportes** → filtrar por fecha / estado / categoría e imprimir en PDF; observaciones de entrega/devolución
   - **Configuración** → ajustes del kiosko, respaldos automáticos y manuales, restauración

> 💡 **Concepto clave — Prestable vs Solo inventario:** un equipo *prestable* aparece en el kiosko para pedirse; uno *solo inventario* solo existe para llevar el conteo (un proyector del salón fijo, por ejemplo). Lo decides tú por categoría o por equipo: **la importación del Excel nunca activa préstamos por su cuenta**.

### Flujo 4: Cerrar sesión

- En **Préstamo Rápido** y **Admin** hay un botón de **Cerrar sesión** arriba. Úsalo antes de irte.
- En **Préstamo Rápido** la sesión se cierra automáticamente a las **8 horas**.

---

## 📥 Importar Excel de Patrimonio

La app puede cargar el inventario oficial desde el **Excel de Patrimonio** sin teclear equipo por equipo.

### Dónde está

**Admin** ▸ pestaña **Inventario** ▸ panel de importación al final de la página.

### Cómo funciona

1. Elige el archivo `.xlsx` oficial.
2. La app muestra un **plan previo ANTES de tocar nada**: cuántos equipos son nuevos, cuántos se actualizarían, cuántos no cambian, qué categorías nuevas aparecerían y avisos importantes.
3. Si el plan te convence, presiona **Aplicar**.
4. Antes de escribir cualquier dato, la app crea un **respaldo automático** de tu base.

### Reglas que debes conocer

| Regla | Detalle |
|---|---|
| 🔒 Nada se sobreescribe a ciegas | Equipos existentes conservan su nombre, categoría y ubicación |
| 🚫 Lo importado NO es prestable | Todo equipo/categoría nuevo entra como **"solo inventario"** — el Excel organiza, pero **la escuela decide qué se presta** |
| ✅ Activar préstamo después | Ve a **Categorías**, toca "Prestable" en la categoría (o equipo por equipo) y listo |
| ↩️ Se puede deshacer | Configuración → Respaldos → **Restaurar** el respaldo automático que se creó al aplicar |

> ⚠️ **¿Importaste y nadie puede pedir nada?** No es un error: es intencional. Activa "Prestable" en las categorías que quieras prestar.

📚 Detalles técnicos del formato y la importación: [docs/INVENTARIO_PATRIMONIO.md](app-prestamos-p15/docs/INVENTARIO_PATRIMONIO.md) · [docs/PLAN_IMPORTACION_PATRIMONIO.md](app-prestamos-p15/docs/PLAN_IMPORTACION_PATRIMONIO.md)

---

## 📋 Toma de inventario físico

Sirve para **cuadrar lo que hay físicamente en los estantes contra lo que dice la app**, usando un lector de códigos de barras. Está en **Admin** ▸ pestaña **Toma de inventario**.

### Paso a paso

1. Elige el **área** a contar (usa las ubicaciones recientes o escribe una nueva).
2. **"Iniciar campaña nueva"** → reinicia todo el área a *pendiente* (pide doble confirmación).
3. **Escanea** equipo por equipo. Cada disparo da feedback inmediato con sonido y tarjeta:
   - 🟢 **Nuevo aquí** — estaba pendiente, ya está contado
   - 🔵 **Movido** — existe pero su ubicación registrada era otra
   - 🟡 **Repetido** — ya lo escaneaste en esta campaña
4. Cada escaneo marca automáticamente el equipo como **revisado** en esa ubicación.
5. ¿Te equivocaste? Botón **deshacer último escaneo**. ¿Apareció un código que no reconoce la app? Puedes **vincularlo a un equipo existente**.
6. La columna **"Deberían estar aquí"** lista lo que falta contar: cuando se vacía, terminaste el área.
7. Exporta el **reporte** de la campaña.

### Tips

- Haz una campaña **por área**; no intentes contar todo en una sola pasada.
- La campaña reinicia pendientes al iniciarla: hazla en un momento tranquilo y termina el área completa.

---

## 📁 Dónde están guardadas las cosas

Esta app **no usa la nube**. Todo vive en la computadora donde la instalaste.

### Base de datos (¡lo más importante!)

**Ruta en Windows:**

```
C:\Users\<TUSUARIO>\AppData\Roaming\com.p15.prestamos\
├── prestamos.db          ← TU BASE DE DATOS (todos los préstamos, profesores, equipos)
├── prestamos.db-wal      ← Cache de escritura (no borrar)
├── prestamos.db-shm      ← Memoria compartida (no borrar)
└── backups\              ← Respaldos automáticos y manuales
    └── prestamos-backup-XXXXXXX.db
```

> 💡 `<TUSUARIO>` es el nombre de usuario de Windows (por ejemplo `leoel`, `administrador`, etc.).

> ⚠️ **Si borras esa carpeta, pierdes TODO el historial de préstamos.** Respáldala (ver siguiente sección).

**Cómo llegar ahí rápido** (atajo de teclado): Win + R → escribe `%AppData%\com.p15.prestamos` → Enter.

### Datos que contiene la base

| Tabla | Qué guarda |
|---|---|
| `profesores` | Lista de profesores + código UDG + si es admin + PIN si corresponde |
| `categorias` | Categorías de equipo (Laptops, Adaptadores HDMI, …) |
| `inventario` | Cada equipo: nombre, identificador, estado, si es prestable, si es granel, stock |
| `prestamos` | Historial de préstamos a profesores (fecha salida, retorno, observaciones) |
| `prestamos_rapidos_alumnos` | Préstamos a alumnos con auditoría de quién autorizó |
| `app_settings` | Configuraciones (qué se muestra en kiosko, etc.) |

> 🛠 Nota técnica: el archivo `database.sql` que verás en el repo es una **referencia histórica desactualizada**. El esquema real vive en el código, en `src/hooks/useInventory.ts`, y la app lo actualiza sola cuando se instala una nueva versión (migraciones automáticas).

---

## 💾 Respaldo y recuperación (¡IMPORTANTE!)

La app incluye **respaldo nativo** desde dentro del programa:

### Opción A: Desde la app (recomendado)

1. Entra al **Admin** → pestaña **Configuración**.
2. Botón **"Crear respaldo"**.
3. El sistema valida que el archivo sea SQL válido, lo copia a `%AppData%\com.p15.prestamos\backups\` con la fecha, y opcionalmente lo puedes mover a un USB.

### Opción B: Copiar el archivo a mano

1. Cierra la app.
2. Ve a `%AppData%\com.p15.prestamos\`.
3. Copia `prestamos.db` a un lugar seguro (USB, otra computadora, Google Drive).

### Respaldo automático (recomendado activarlo)

1. **Admin** → Configuración → sección Respaldos.
2. Activa el respaldo automático y define cada cuánto (la app lo hace sola, sin que nadie se acuerde).
3. La app conserva los **últimos 20 respaldos automáticos** en `backups\`.

> 💡 Además, cualquier importación del Excel de Patrimonio crea un respaldo automático justo antes de aplicar cambios.

### Restaurar

1. Entra al **Admin** → Configuración → sección Respaldos.
2. En la tabla de respaldos, cada fila tiene su botón **"Restaurar"** (un clic y listo). También puedes usar **"Importar respaldo"** para traer un archivo `.db` externo (por ejemplo, de un USB).
3. El sistema valida el archivo, hace un respaldo de seguridad por si acaso, sobreescribe la base actual y limpia los archivos auxiliares WAL/SHM.
4. Reinicia la app.

> 💡 Detalle técnico bueno: el respaldo tiene validación de "magic header" (los primeros bytes dicen `SQLite format 3`), así que si eliges un archivo que no es de base de datos, se rechaza limpiamente sin romper nada.

### Respaldo automatizado con Python (opcional)

El repo trae scripts en `scripts/`:

- `backup_sqlite.py` → respaldo con checksum SHA-256 y timestamp
- `restore_sqlite.py` → restauración con copia de seguridad previa + integrity check

Más info en `docs/sqlite-backup-restore-guide.md`.

---

## 🧰 Mantenimiento

### Tareas periódicas sugeridas

| Cada… | Tarea |
|---|---|
| **Diario** | Al cerrar el día, el admin crea un respaldo (Configuración → Crear respaldo) — o mejor: activa el **respaldo automático** y olvídate. |
| **Semanal** | Revisar préstamos activos muy antiguos (¿un equipo prestado hace 3 semanas?). |
| **Mensual** | Exportar un reporte del mes para tu archivo (Reportes → filtrar por mes → Imprimir PDF). |
| **Mensual** | Correr una campaña de [toma de inventario](#-toma-de-inventario-físico) por área para cuadrar lo físico vs la app. |
| **Antes de importar Excel** | Verifica que tengas respaldo reciente (la importación crea uno automático, pero revisa la fecha). |
| **Trimestral** | Copiar la carpeta `%AppData%\com.p15.prestamos\` a un USB y guardarlo fuera de la oficina. |
| **Anual** | Archivar el historial del año y limpiar préstamos muy antiguos. |

### Actualizar la app a una nueva versión

1. **CIERRA la app** (muy importante, no actualices con la app abierta).
2. **Crea un respaldo** por seguridad.
3. Instala el nuevo `.exe`/`.msi` (puedes instalar encima, no necesitas desinstalar).
4. Abre la app. La base de datos se conserva intacta y la app hace las migraciones necesarias sola.

> ⚠️ Si algo sale raro después de actualizar, sigue los pasos de [Respaldo y recuperación](#-respaldo-y-recuperación-importante) para volver atrás.

### Si la app no abre

| Problema | Causa probable | Solución |
|---|---|---|
| Pantalla azul "Windows SmartScreen" | Sin certificado de firma | Más información → Ejecutar de todas formas |
| La app abre en blanco | Falta WebView2 | Instalar <https://developer.microsoft.com/microsoft-edge/webview2/> |
| Se cierra sola al inicio | Falla SQLite / DB corrupta | Restaurar respaldo desde Configuración o copiar `prestamos.db` de un backup |
| Olvidé el PIN del admin | PIN personalizado perdido | Entra con el código `223992647` y el PIN de fábrica, después define uno nuevo. Este fallback permanece activo por diseño en la versión actual. |
| Se borró la carpeta de datos | Se pierde el historial | Si tienes respaldo en USB u otra computadora, restáuralo. Si no, se pierde. **Respalda siempre.** |

### Mantener el proyecto limpio

- La carpeta `dist/` y `src-tauri/target/` se **regeneran solas** al compilar. No se suben a GitHub (gracias al `.gitignore`). Si pesan mucho, puedes borrarlas.
- Los archivos que terminan en `-LeoLaptop.*` son ajustes locales de una computadora específica — **no los edites ni los subas**.

Más detalle en `docs/REPO_CLEANUP.md`.

---

## 🌐 GitHub para principiantes

GitHub es como un **Google Drive para código**: guarda versiones, lleva historial de cambios, y permite que varias personas trabajen juntas.

### Conceptos básicos

| Palabra | Qué quiere decir |
|---|---|
| **Repositorio (repo)** | La carpeta del proyecto en GitHub. |
| **Clone (clonar)** | Bajar una copia del repo a tu computadora. |
| **Commit (comprometer)** | Guardar un cambio con un mensaje explicando qué hiciste. |
| **Push (empujar)** | Subir tus commits a GitHub. |
| **Pull (jalar)** | Bajar los cambios que otros subieron. |
| **Branch (rama)** | Una versión paralela del proyecto. Para cosas grandes, trabajas en una branch y luego la unes (`main` es la principal). |
| **PR (Pull Request)** | "Pedir que revisen mis cambios antes de unirlos a main". |
| **`.gitignore`** | Archivo que lista qué carpetas no se suben (ej: `node_modules`, `target`, contraseñas). |

### 1) Clonar el proyecto (bajarlo a tu compu)

```powershell
git clone https://github.com/Leoglez10/app-prestamos-p15.git
cd app-prestamos-p15/app-prestamos-p15
```

Reemplaza `USUARIO` por el usuario/organización de GitHub. Si usas SSH:

```powershell
git clone git@github.com:Leoglez10/app-prestamos-p15.git
```

> 💡 Necesitas tener **Git** instalado. Descárgalo de <https://git-scm.com/downloads>.

### 2) Hacer un cambio y subirlo

```powershell
# 1. Ver qué cambió
git status

# 2. Subir TODO lo modificado al "área de staging"
git add .

# 3. Guardar el cambio con un mensaje claro
git commit -m "feat: agregué categoría Proyectores"

# 4. Enviarlo a GitHub
git push
```

### 3) Bajar cambios que otras personas hicieron

```powershell
git pull
```

### 4) Trabajos importantes: abrir un Pull Request

1. Crea una rama nueva:
   ```powershell
   git checkout -b feat/nueva-funcion
   ```
2. Haz tus cambios, commitea, y sube la rama:
   ```powershell
   git push -u origin feat/nueva-funcion
   ```
3. Entra a GitHub → botón verde **"Compare & pull request"** → escribe qué hiciste → **Create pull request**.
4. Alguien revisa y aprueba → se une a `main`.

### 5) Buenas prácticas para este repo

- Mensajes de commit claros en español o inglés convenido, empezando con `feat:`, `fix:`, `docs:`, `chore:`:
  - `feat: alta de proyectores`
  - `fix: problema al devolver equipos a granel`
  - `docs: actualizo README`
- **Nunca subas** archivos con contraseñas reales, ni `prestamos.db` (la base real), ni `node_modules/`, ni `target/`.
- El `.gitignore` ya los excluye, pero es bueno checarlo.
- Antes de mergear a `main`, prueba que compile: `npm run tauri build`.

### 6) CI automático

El repo tiene el workflow activo `.github/workflows/build-windows.yml`. Cuando publicas un tag con formato `v*` (por ejemplo, `v0.3.0`), **compila la app en un Windows virtual de GitHub** y publica el instalador como **Release público** en la pestaña *Releases*. También se puede ejecutar manualmente con `workflow_dispatch`. Si la compilación falla, GitHub lo marca en rojo.

---

## 👨‍💻 Para programadores: configurar y compilar

### Stack

- **Frontend**: React 19 + TypeScript + Vite 7 + react-router-dom 7
- **Shell escritorio**: Tauri v2 (Rust, edition 2021)
- **Persistencia**: SQLite local vía `@tauri-apps/plugin-sql` 2.4.0
- **Runtime necesarios**: Node 22, Rust stable, Bun (opcional, lock presente), Windows para compilar instalador

### Requisitos previos

1. **Node.js** 22+ → <https://nodejs.org/>
2. **Rust** (rustup) → <https://rustup.rs/>
3. **Bun** (opcional, pero hay `bun.lock`) → <https://bun.sh/>
4. **Git** → <https://git-scm.com/>
5. En Windows: **Microsoft C++ Build Tools** (Visual Studio Installer → "Desktop development with C++")
6. En Windows: **WebView2 Runtime**

### Setup del repo

```powershell
git clone https://github.com/Leoglez10/app-prestamos-p15.git
cd app-prestamos-p15/app-prestamos-p15

# Instala dependencias JavaScript
npm install
# o si usas Bun:
# bun install

# Modo desarrollo (abre ventana Tauri + hot reload del frontend)
npm run tauri dev

# Solo frontend (limitado, sin base de datos — útil para maquetar)
npm run dev      # → http://localhost:1770

# Build de producción del frontend
npm run build

# Genera el instalador (.exe y .msi en Windows)
npm run tauri build
```

> ⚠️ En `npm run dev` (solo Vite) la app **funciona de forma limitada** porque no tiene Tauri y, por tanto, no puede abrir SQLite. Para desarrollo real usa siempre `npm run tauri dev`.

### Dónde sale el instalador

```
src-tauri/target/release/bundle/
├── msi/App Prestamos P15_0.3.0_x64_en-US.msi
└── nsi/App Prestamos P15_0.3.0_x64-setup.exe
```

### Scripts disponibles

| Script | Qué hace |
|---|---|
| `npm run dev` | Vite dev server (puerto 1770). Sin Tauri. |
| `npm run build` | `tsc` + `vite build` → genera `dist/` |
| `npm run preview` | Sirve `dist/` para previsualizar |
| `npm run tauri dev` | Desarrollo completo con Tauri + SQLite |
| `npm run tauri build` | Genera instalador Windows |
| `npm test` | Ejecuta las 6 suites de pruebas de utilidades |
| `npm run test:<área>` | Ejecuta una suite concreta: `backup`, `patrimonio`, `identificadores`, `ficha`, `importacion` o `toma` |

### Chequeo de tipos y pruebas

```powershell
npx tsc --noEmit
npm test
```

> ✅ El proyecto tiene pruebas automatizadas para utilidades críticas, pero todavía **no tiene linter ni pruebas end-to-end de la interfaz**. Los cambios visuales y los flujos completos de Tauri también deben validarse manualmente. Ver `docs/ENGINEERING_HANDBOOK.md`.

### Configuración de Vite

- Dev port: **1770** (estricto, falla si ocupado)
- HMR: **1771**
- Ignora watch de `src-tauri/**`
- Ver `vite.config.ts`.

### Configuración de Tauri

- Ventana 1280×840 (mín 1024×680), redimensionable
- CSP: `null`
- Identificador: `com.p15.prestamos`
- Ver `src-tauri/tauri.conf.json`

---

## 🗺 Estructura del proyecto: dónde está cada cosa

```
app-prestamos-p15/                ← Carpeta del repo
├── 📁 .github/workflows/
│   └── build-windows.yml         ← CI activo: compila y publica al crear tags v*
├── 📄 README.md                  ← ESTE ARCHIVO
├── 📄 README_INSTALACION.md      ← Guía corta de instalación y actualización
└── app-prestamos-p15/            ← Carpeta real del proyecto (necesaria así para el CI)
    │
    ├── 📄 package.json            ← Dependencias JS y scripts
    ├── 📄 vite.config.ts         ← Configuración Vite
    ├── 📄 tsconfig.json          ← Reglas TypeScript
    ├── 📄 index.html             ← Entrada HTML (carga React)
    │
    ├── 🖼 img/
    │   ├── logo-p15.png          ← Logo de la P15 (usar en reportes y README)
    │   └── logo-p15.jpg
    │
    ├── 📁 public/                ← Assets estáticos públicos (SVGs de Tauri/Vite)
    │
    ├── 📁 src/                   ← CÓDIGO FRONTEND (React + TS)
    │   ├── main.tsx              ← Punto de arranque (envuelve App con AuthProvider)
    │   ├── App.tsx               ← Router. 4 rutas: /, /admin, /kiosko, /prestamo-rapido
    │   ├── App.css               ← Estilos globales
    │   ├── auth/                 ← Lógica de autenticación
    │   │   ├── AuthContext.tsx   ← Provider de sesión (revalida contra DB)
    │   │   ├── LoginForm.tsx     ← Form code-only para Préstamo Rápido
    │   │   ├── loginStorage.ts   ← Guarda sesión en localStorage (TTL 8h)
    │   │   ├── SessionBadge.tsx  ← Badge "Sesión: nombre (código)"
    │   │   └── types.ts
    │   ├── hooks/
    │   │   └── useInventory.ts   ← ⭐ EL CORAZÓN DE LA APP (2000+ líneas)
    │   │                            Define el esquema, migraciones, reglas de negocio,
    │   │                            y todos los accesos a SQLite.
    │   ├── pages/
    │   │   ├── Home.tsx          ← Pantalla con 3 tarjetas (Profesor/Admin/Préstamo Rápido)
    │   │   ├── Kiosk.tsx         ← Flujo del profesor
    │   │   ├── Admin.tsx         ← Panel admin (inventario, toma física, categorías, profesores, reportes, config)
    │   │   ├── PrestamoRapido.tsx← Préstamo a alumnos con autenticación simple
    │   │   └── Admin-LeoLaptop.tsx ← Variante NO TOCAR (drift local)
    │   ├── components/
    │   │   ├── TomaFisicaPanel.tsx        ← Campañas de conteo físico (pestaña de Admin)
    │   │   ├── ImportarPatrimonioPanel.tsx← Importación del Excel de Patrimonio
    │   │   └── RedCelularPanel.tsx        ← Experimento: acceso LAN desde celular
    │   └── utils/
    │       ├── print.ts          ← Genera HTML e imprime PDF vía iframe + window.print()
    │       └── datetime.ts       ← Parseo/formateo de fechas SQLite (es-MX)
    │
    ├── 🦀 src-tauri/              ← CÓDIGO RUST (shell del escritorio)
    │   ├── Cargo.toml            ← Dependencias Rust
    │   ├── tauri.conf.json       ← Configuración de la ventana, bundle, identificador
    │   ├── src/
    │   │   └── lib.rs            ← 9 comandos nativos:
    │   │                            🔹 get_database_url    → ruta de la BD
    │   │                            🔹 create_backup        → crea backups en disco
    │   │                            🔹 guardar_reporte_inventario → guarda reportes exportados
    │   │                            🔹 open_backups_dir     → abre la carpeta de respaldos
    │   │                            🔹 list_backups         → enumera respaldos
    │   │                            🔹 restore_backup_from_bytes → restaura validando magic header
    │   │                            🔹 restore_backup_from_path → restaura desde una ruta local
    │   │                            🔹 celular_registrar_dispositivo → registra acceso móvil experimental
    │   │                            🔹 local_ip             → obtiene la IP para acceso LAN
    │   ├── capabilities/
    │   │   └── default.json      ← Permisos: core, opener, sql (execute, load, select)
    │   └── icons/                ← Iconos de Windows (.ico, .icns, PNGs)
    │
    ├── 📊 database.sql           ← Paper trail histórico (NO es la fuente de verdad)
    │
    ├── 📁 docs/                   ← DOCUMENTACIÓN TÉCNICA
    │   ├── ENGINEERING_HANDBOOK.md   ← Guía maestra de ingeniería y mantenimiento
    │   ├── INVENTARIO_PATRIMONIO.md  ← Formato y reglas del Excel de Patrimonio
    │   ├── PLAN_IMPORTACION_PATRIMONIO.md ← Diseño de la importación
    │   ├── QR_CELULAR.md             ← Experimento de acceso por celular
    │   ├── ROADMAP.md                ← Rumbo del proyecto
    │   ├── REPO_CLEANUP.md           ← Qué borrar/archivar
    │   ├── sqlite-backup-restore-guide.md
    │   ├── postgres-restore-guide.md ← ETL legacy Postgres→SQLite
    │   ├── legacy_profile.json       ← Perfil del schema Postgres histórico
    │   └── archive/                  ← Documentos históricos (COMPLETADO, TODO, etc.)
    │
    ├── 📁 scripts/               ← UTILITARIOS PYTHON
    │   ├── backup_sqlite.py
    │   ├── restore_sqlite.py
    │   ├── migrate_postgres_to_sqlite.py
    │   ├── migrate_legacy_p15_to_sqlite.py
    │   └── legacy_table_mapping.sample.json
    │
    ├── 📁 openspec/               ← SDD (Spec-Driven Development)
    │   ├── config.yaml            ← Reglas del proceso SDD
    │   ├── specs/                 ← Especificaciones vivas
    │   └── changes/archive/       ← Cambios ya cerrados (admin-auth, login-solo-codigo)
    │
    ├── 📁 .github/workflows/
    │   └── tauri-build.yml        ← Workflow histórico anidado; GitHub no lo ejecuta desde aquí
    │
    ├── 📁 .agents/skills/         ← Skills personales de AI (no se suben al hacer cambios)
    └── 📄 README.md               ← ESTE ARCHIVO
```

> 💡 Regla de oro para principiantes:
> - **Pantallas y botones** → están en `src/pages/`
> - **Lógica de datos y reglas** → está en `src/hooks/useInventory.ts`
> - **Cómo se abre el programa en el escritorio** → está en `src-tauri/`
> - **Documentación para desarrolladores** → está en `docs/`

---

## ❓ Dudas frecuentes

**¿Necesito internet para usarla?**
No. Todo es local: la base de datos está dentro de la computadora.

**¿Puedo usarla en Mac o Linux?**
El instalador actual solo se genera para Windows. En Mac/Linux puedes compilar el código fuente si eres programador, pero no hay build oficial.

**¿Dónde veo el historial de préstamos?**
En el panel del Admin → pestaña Reportes. Filtras por fecha o profesor y das "Imprimir" para tener un PDF.

**¿Cómo doy de alta un profesor nuevo?**
Admin → Profesores → "Nuevo" → nombre y código UDG. Si también será admin, marca el checkbox y define un PIN.

**¿Cómo marco un equipo como perdido?**
Admin → Inventario → menú de la fila (⋮) → **"Marcar perdido"**. También puedes editar el equipo y cambiar su estado a `extraviado`. A partir de ahí no aparecerá para préstamo.

**¿Por qué mi equipo no aparece en el kiosko?**
Tres causas comunes: 1) su categoría (o el equipo mismo) está en modo *Solo inventario* — actívalo como **Prestable** en Categorías; 2) está prestado, extraviado o en mantenimiento; 3) el kiosko tiene oculto el catálogo (revisa Configuración).

**¿Importé el Excel y ahora no puedo prestar nada, es un error?**
No: es a propósito. Todo lo importado entra como *solo inventario* para que el Excel nunca decida solo. Ve a Admin → Categorías → marca **Prestable** en lo que quieras prestar.

**¿Qué significa "vencido"?**
En Préstamo Rápido, todo préstamo activo con más de **24 horas** sin devolverse se marca vencido en el historial. El kiosko de profesores no maneja vencimientos automáticos: las devoluciones se registran manualmente.

**Un profesor se lleva laptop pero se olvida el HDMI, ¿puedo forzar la devolución?**
Sí. Admin → Inventario → menú de la fila del equipo (⋮) → **"Forzar devolución"**. Útil cuando el equipo volvió físicamente pero nadie lo registró en el kiosko.

**¿Cómo sé qué me falta por contar en una toma de inventario?**
La columna **"Deberían estar aquí"** lista los equipos pendientes del área actual. Cuando se vacía, terminaste ([guía completa](#-toma-de-inventario-físico)).

**¿Mi base de datos se borró, qué hago?**
Si tienes respaldo (en `backups/` o en un USB), lo restauras desde Configuración. Si no, **se perdió**. Por eso **RESPALDA SIEMPRE**.

**¿Puedo tener varias computadoras con la app?**
Sí, pero **cada una tiene su base de datos independiente**. No se sincronizan entre sí. Si necesitas mover datos de una a otra, usa "Crear respaldo" y "Restaurar respaldo".

**¿La app manda datos a algún servidor externo?**
No. No hay telemetría, no hay envío a la nube, no hay cuenta de correo, no hay nada de internet.

**¿Es seguro el PIN por defecto?**
No. **Cámbialo en cuanto entres**, pero ten presente que la versión actual conserva el código `223992647` más el PIN de fábrica como acceso de recuperación incluso después del cambio. Eliminar ese fallback requiere modificar `loginAdmin`; no basta con editar el PIN desde la interfaz.

---

## 🤝 Cómo contribuir

1. Clona el repo.
2. Crea una branch: `git checkout -b feat/mi-cambio`.
3. Haz commits claros: `feat: agregué exportación a Excel`.
4. Verifica que compile: `npm run tauri build` (o al menos `npx tsc --noEmit`).
5. Abre un Pull Request explicando qué hiciste y por qué.
6. Espera revisión. Si hay comentarios, ajusta y vuelve a push.

> 📚 Antes de tocar cosas grandes, lee `docs/ENGINEERING_HANDBOOK.md`. Hay deudas técnicas documentadas (archivos `-LeoLaptop.*`, monolito en `Admin.tsx`, mezcla en `useInventory.ts`).

---

## 🏷 Versionado

Usamos versionado simple `MAYOR.MENOR.PARCHE` en `package.json` y `tauri.conf.json`. Ej: `0.3.0`.

- **PARCHE** (0.3.**0** → 0.3.1): bugfixes, sin cambios de comportamiento.
- **MENOR** (0.**3**.0 → 0.4.0): nuevas funciones, sin romper lo viejo.
- **MAYOR** (**0**.3.0 → 1.0.0): cambios que pueden romper compatibilidad (requieren migración).

> ✅ La versión debe coincidir en `package.json`, `src-tauri/tauri.conf.json` y `src-tauri/Cargo.toml`. Actualmente los tres usan `0.3.0`.

---

## 📚 Documentación relacionada

| Doc | Para qué sirve |
|---|---|
| [docs/ENGINEERING_HANDBOOK.md](app-prestamos-p15/docs/ENGINEERING_HANDBOOK.md) | **Guía maestra** para mantener el código |
| [docs/INVENTARIO_PATRIMONIO.md](app-prestamos-p15/docs/INVENTARIO_PATRIMONIO.md) | Formato y reglas del Excel de Patrimonio |
| [docs/PLAN_IMPORTACION_PATRIMONIO.md](app-prestamos-p15/docs/PLAN_IMPORTACION_PATRIMONIO.md) | Diseño técnico de la importación |
| [docs/QR_CELULAR.md](app-prestamos-p15/docs/QR_CELULAR.md) | Experimento: acceso desde celular por LAN |
| [docs/REPO_CLEANUP.md](app-prestamos-p15/docs/REPO_CLEANUP.md) | Qué carpetas borrar/archivar |
| [docs/sqlite-backup-restore-guide.md](app-prestamos-p15/docs/sqlite-backup-restore-guide.md) | Backup/restore con scripts Python |
| [docs/postgres-restore-guide.md](app-prestamos-p15/docs/postgres-restore-guide.md) | Migrar desde un Postgres legacy |
| [README_INSTALACION.md](README_INSTALACION.md) | Instalación y actualización manual |

---

## ⚖️ Licencia y uso

Proyecto de **uso interno educativo** para la Preparatoria 15 (UDG). No está pensado para distribución comercial.

---

## 🙌 Créditos

<div align="center">

<img src="https://github.com/Leoglez10.png" alt="Leonardo Gonzalez" width="96"/>

### Diseñado y desarrollado por **Leonardo Gonzalez**

[![GitHub](https://img.shields.io/badge/GitHub-%40Leoglez10-181717?logo=github)](https://github.com/Leoglez10)
[![Issues](https://img.shields.io/badge/Reportar_bug_o_idea-2ea44f?logo=github)](https://github.com/Leoglez10/app-prestamos-p15/issues)

🏫 **Institución**: Preparatoria 15 — Universidad de Guadalajara (UDG)

🎯 **Propósito**: Control y trazabilidad de préstamos de equipo audiovisual

🛠 **Stack**: Tauri v2 · React 19 · TypeScript · Vite 7 · Rust · SQLite

</div>

> 📬 ¿Encontraste un bug o tienes una mejora? Abre un [Issue](https://github.com/Leoglez10/app-prestamos-p15/issues) o manda un Pull Request.

---

<div align="center">

**¿Dudas?** [Dudas frecuentes](#-dudas-frecuentes) · [Respaldo y recuperación](#-respaldo-y-recuperación-importante) · [Handbook de ingeniería](app-prestamos-p15/docs/ENGINEERING_HANDBOOK.md)

Hecho con 💙 para la comunidad de la **Preparatoria 15** — *respalda siempre* 💾

</div>
