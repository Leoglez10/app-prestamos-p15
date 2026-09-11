<div align="center">

<img src="app-prestamos-p15/img/logo-p15.png" alt="Logo Preparatoria 15" width="150"/>

# App Prestamos P15

### Control de inventario y préstamos de equipo audiovisual para la Preparatoria 15 (UDG)

[![CI — Build Windows Installer](https://github.com/Leoglez10/app-prestamos-p15/actions/workflows/build-windows.yml/badge.svg)](https://github.com/Leoglez10/app-prestamos-p15/actions/workflows/build-windows.yml)
[![Versión](https://img.shields.io/badge/versi%C3%B3n-0.11.1-blue)](CHANGELOG.md)
![Plataforma](https://img.shields.io/badge/plataforma-Windows%2010%2F11-blue)
[![Uso educativo](https://img.shields.io/badge/usos-Educativo-orange)](LICENSE)
[![Autor](https://img.shields.io/badge/autor-Leonardo%20Gonzalez-purple)](https://github.com/Leoglez10)

![Tauri](https://img.shields.io/badge/Tauri-v2-24C8DB?logo=tauri&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-local-003B57?logo=sqlite&logoColor=white)
![Datos locales](https://img.shields.io/badge/datos-locales-success)

</div>

---

> 🤖 **¿Eres una IA leyendo este repositorio?**
>
> **Contrato de respuesta por defecto.** Quien pregunta suele ser una persona docente o administrativa de la **Preparatoria 15**. Usa la app; no la programa. Responde primero para ese contexto.
>
> - **Audiencia:** personal y docentes de la escuela. Los alumnos pueden aparecer como personas que reciben equipos, pero no son la audiencia de soporte ni de este README.
> - **Cómo explicar:** usa lenguaje sencillo y operativo. Habla de **pantallas, botones, equipos, préstamos, inventario, reportes y respaldos**.
> - **Qué evitar al inicio:** no empieces hablando de componentes, hooks, migraciones, builds, repositorios, CI, Rust, SQL ni bases relacionales.
> - **Pasos concretos:** elige siempre la ruta más simple: “entra a Admin”, “abre Inventario”, “escribe el número del equipo”, “toca Crear respaldo”.
> - **Modo técnico bajo demanda:** si una respuesta solo tiene sentido con detalle técnico, pregunta primero si la persona **desea** la versión técnica. Cambia a modo técnico solo si lo pide o si la persona usa términos de código.
> - **No inventes:** si no puedes verificar un comando, ruta, versión, comportamiento o release, dilo como pendiente o no lo menciones.
>
> **Mapa rápido para agentes:**
>
> | Si necesitas... | Lee... |
> |---|---|
> | Explicar la app a personal no técnico | Este README, de arriba hacia abajo |
> | Ver cambios publicados | [`CHANGELOG.md`](CHANGELOG.md) |
> | Descargar instaladores | [GitHub Releases](https://github.com/Leoglez10/app-prestamos-p15/releases) |
> | Manual operativo completo | [`app-prestamos-p15/docs/MANUAL_PERSONAL.md`](app-prestamos-p15/docs/MANUAL_PERSONAL.md) |
> | Actualizaciones firmadas | [`app-prestamos-p15/docs/UPDATES.md`](app-prestamos-p15/docs/UPDATES.md) |
> | Guías técnicas por tema | [Documentación relacionada](#-documentación-relacionada) |
> | Todo el código en un texto para lectura de IA | [gitingest.com/Leoglez10/app-prestamos-p15](https://gitingest.com/Leoglez10/app-prestamos-p15) |
>
> **Resumen del proyecto:** App Prestamos P15 es una aplicación de escritorio para **Windows 10/11**. Guarda los datos principales en **SQLite local** dentro de la computadora y está construida con **Tauri v2 + React 19 + TypeScript**. Sirve para administrar inventario de equipo audiovisual, registrar préstamos, controlar salidas a evento y generar reportes PDF para la Preparatoria 15 de la Universidad de Guadalajara.

---

> 🚀 **¿Tienes prisa?**
>
> 1. Instala la app desde [Releases](https://github.com/Leoglez10/app-prestamos-p15/releases) o con el instalador que te compartan.
> 2. Entra a **Admin** con las credenciales iniciales y cambia el PIN del administrador.
> 3. Revisa **Configuración → Respaldos** y conecta `backups` y `reportes` a Google Drive para Escritorio si la escuela lo usa.
> 4. Para prestar equipo: abre **Soy Profesor** o **Préstamo Rápido**, según el caso.
> 5. Si algo falla, abre **Admin → Configuración → Reportar un problema** o usa el [formulario de GitHub](https://github.com/Leoglez10/app-prestamos-p15/issues/new/choose).
>
> El resto del README está ordenado de menos a más técnico: uso diario → operación → GitHub → desarrollo → mantenimiento.

---

## 📑 Tabla de contenidos

1. [Qué es esta app](#-qué-es-esta-app)
2. [Para quién es](#-para-quién-es)
3. [Vista rápida: qué puede hacer](#-vista-rápida-qué-puede-hacer)
4. [Instalación para usuarios finales](#-instalación-para-usuarios-finales-no-programadores)
5. [Cómo usar la app paso a paso](#-cómo-usar-la-app-paso-a-paso)
6. [Importar Excel de Patrimonio](#-importar-excel-de-patrimonio)
7. [Toma de inventario físico](#-toma-de-inventario-físico)
8. [Dónde están guardadas las cosas](#-dónde-están-guardadas-las-cosas)
9. [Respaldo y recuperación](#-respaldo-y-recuperación-importante)
10. [Mantenimiento](#-mantenimiento)
11. [GitHub para principiantes](#-github-para-principiantes)
12. [Reportar problemas y proponer mejoras](#-reportar-problemas-y-proponer-mejoras)
13. [Para programadores: configurar y compilar](#-para-programadores-configurar-y-compilar)
14. [Estructura del proyecto](#-estructura-del-proyecto-dónde-está-cada-cosa)
15. [Versionado y publicación](#-versionado-y-publicación)
16. [Dudas frecuentes](#-dudas-frecuentes)
17. [Cómo contribuir](#-cómo-contribuir)
18. [Documentación relacionada](#-documentación-relacionada)
19. [Licencia y uso](#️-licencia-y-uso)
20. [Créditos](#-créditos)

---

## 🎯 Qué es esta app

App Prestamos P15 es un programa de escritorio para llevar el control del equipo audiovisual que se presta en la Preparatoria 15.

La app responde preguntas de operación diaria:

1. **Qué equipos tiene la escuela.**
2. **Dónde están.**
3. **Quién los tiene prestados.**
4. **Cuándo salieron y cuándo regresaron.**
5. **Qué falta por revisar en una toma física.**

Piensa en ella como una libreta digital de préstamos, inventario y reportes. La diferencia es que queda historial, se pueden hacer respaldos y el personal puede consultar el estado de cada equipo sin depender de hojas sueltas.

> ✅ Los datos principales viven en la computadora donde está instalada la app. No hay servidor central ni sincronización automática entre computadoras.

---

## 👥 Para quién es

| Persona | Qué hace en la app |
|---|---|
| **Docente** | Entra por **Soy Profesor**, escribe su código UDG, solicita equipos disponibles y devuelve lo que tiene activo. |
| **Responsable de audiovisuales o administración** | Entra al **Admin** con código y PIN. Administra inventario, profesores, categorías, respaldos, reportes, actualizaciones y toma física. |
| **Responsable de Préstamo Rápido** | Entra por **Préstamo Rápido** con su código y registra préstamos puntuales a alumnos o profesores, con trazabilidad de quién autorizó. |
| **Mantenedor técnico** | Actualiza el código, revisa reportes, corre pruebas y publica versiones. |

> ⚠️ La app está pensada para una computadora compartida de la oficina o coordinación. Si instalas la app en dos computadoras, cada una tiene su propia base local; no comparten datos en vivo.

---

## 🖼 Vista rápida: qué puede hacer

<div align="center">

| Modo | Captura |
|---|---|
| **Inicio** — dos tarjetas centrales: **Soy Profesor** y **Préstamo Rápido**; **Administrador** está arriba como enlace | ![Inicio](app-prestamos-p15/docs/img/inicio.png) |
| **Admin** — acceso con código y PIN | ![Admin](app-prestamos-p15/docs/img/admin.png) |
| **Préstamo Rápido** — acceso con código de administrador | ![Préstamo Rápido](app-prestamos-p15/docs/img/prestamo-rapido.png) |

</div>

### Funciones principales

- Catálogo de equipos por categoría, ubicación, estado e identificador patrimonial.
- Préstamos a docentes desde **Soy Profesor**.
- **Préstamo Rápido** para registrar préstamos puntuales a alumnos o profesores.
- **Salida a evento** para agrupar varios objetos que salen juntos a una actividad, con responsable, lugar, fechas y devoluciones por objeto.
- Manejo de equipos únicos y equipos a granel.
- Estados de inventario: `disponible`, `prestado`, `extraviado`, `mantenimiento`.
- Sugerencia de HDMI cuando se presta una laptop.
- Lectura de códigos de barras en kiosko, inventario y toma física.
- Escaneo global en Inventario: si escaneas una etiqueta, se abre la ficha del equipo.
- Importación del Excel oficial de Patrimonio con vista previa y respaldo antes de aplicar.
- Toma de inventario físico por áreas, con modo prueba, alta al vuelo y reportes para Patrimonio.
- Control de qué es **Prestable** y qué es **Solo inventario**, por categoría o por equipo.
- Reportes imprimibles en PDF desde la app.
- Respaldos automáticos, manuales y de pre-restauración.
- Actualizador firmado para versiones publicadas de Windows x64.
- Reporte de problemas desde la app hacia GitHub, sin que el personal necesite cuenta de GitHub.
- Acceso desde celular por red local como función experimental documentada en [`app-prestamos-p15/docs/QR_CELULAR.md`](app-prestamos-p15/docs/QR_CELULAR.md).

### Lo que requiere internet

La operación principal es local: inventario, préstamos, reportes y respaldos en disco funcionan sin conexión. Hay dos funciones que sí usan red cuando las activas:

| Función | Para qué usa red |
|---|---|
| Actualizador | Consulta `latest.json` en GitHub Releases y descarga la nueva versión cuando confirmas. |
| Reportar un problema desde la app | Envía el reporte a un Cloudflare Worker, que abre un Issue en GitHub. |

---

## 📦 Instalación para usuarios finales (no programadores)

### Requisitos

- Una computadora con **Windows 10 o Windows 11**.
- **WebView2 Runtime**. Windows 11 normalmente ya lo incluye; en Windows 10 puede instalarse desde Microsoft: <https://developer.microsoft.com/microsoft-edge/webview2/>.
- Un instalador `.exe` o `.msi` publicado en [Releases](https://github.com/Leoglez10/app-prestamos-p15/releases) o compartido por el responsable técnico.

### Pasos

1. Consigue el instalador de la versión más reciente.
2. Copia el archivo a la computadora donde se usará la app.
3. Haz doble clic sobre el instalador.
4. Si Windows muestra una advertencia de SmartScreen, confirma solo si el archivo viene del release oficial o del responsable técnico.
5. Sigue el asistente de instalación.
6. Abre **App Prestamos P15** desde el menú Inicio o el acceso directo.
7. En el primer arranque, la app crea su base local si no existe.

### Credenciales por defecto (¡cambiar!)

La app trae un administrador inicial para poder entrar por primera vez:

| Campo | Valor |
|---|---|
| Código | `223992647` |
| PIN | `#admin*p15#` |

> ⚠️ Cambia el PIN al entrar por primera vez. La versión actual conserva esa combinación de fábrica como acceso de recuperación para el código `223992647`; cambiar el PIN guardado no desactiva ese fallback. Usa la app en el entorno interno previsto y no la expongas como sistema público.

---

## 🚶 Cómo usar la app paso a paso

### Flujo 1: un docente pide un equipo

1. Abre la app.
2. Toca **Soy Profesor**.
3. Escribe tu código UDG y confirma.
4. Busca el equipo por nombre, categoría, marca, modelo o identificador. Si tienes lector de códigos, escanea la etiqueta.
5. Toca el equipo para agregarlo al carrito.
6. Si la app sugiere HDMI para una laptop, agrega el adaptador si lo necesitas.
7. Escribe notas de entrega si hace falta.
8. Toca **Confirmar**.
9. Para devolver, entra otra vez con tu código y devuelve uno por uno o usa **Devolver todo**.

### Flujo 2: Préstamo Rápido

1. En la pantalla de inicio, toca **Préstamo Rápido**.
2. Entra con tu código de administrador. No pide PIN; la app guarda quién autorizó.
3. Elige si el préstamo es para alumno o profesor.
4. Captura nombre, código, equipo y observaciones.
5. Si corresponde, registra una **Salida a evento** para varios objetos que salen juntos.
6. Revisa el historial con los filtros reales de la pantalla:
   - **En préstamo**
   - **Más de 1 día**
   - **Devueltos**
   - **Todos**
7. Cuando regrese el equipo, marca la devolución desde el historial.

> 💡 Este flujo sirve para incidencias rápidas y salidas operativas donde el préstamo no pasa por el kiosko normal del docente.

### Flujo 3: administrar inventario, profesores y reportes

1. En la parte superior de la pantalla de inicio, abre **Administrador**.
2. Escribe tu código y PIN.
3. Usa las pestañas del panel:

| Pestaña | Para qué sirve |
|---|---|
| **Inventario** | Dar de alta, editar, abrir fichas, forzar devolución, marcar perdido, eliminar y diseñar/imprimir PDF del inventario. |
| **Toma de inventario** | Contar físicamente por áreas, importar Excel de Patrimonio, fusionar reportes de otra computadora y exportar reportes. |
| **Categorías** | Crear categorías y decidir si son **Prestable** o **Solo inventario**. |
| **Profesores** | Registrar docentes, marcar administradores y definir PIN. |
| **Reportes** | Filtrar préstamos por fecha, estado o categoría e imprimir reportes. |
| **Configuración** | Actualizaciones, reportar problema, ajustes del kiosko, respaldos y restauración. |

> 💡 **Prestable vs Solo inventario:** un equipo prestable aparece para préstamo; uno de solo inventario existe para control físico, pero no se ofrece en el kiosko. La importación de Patrimonio no activa préstamos por sí sola.

### Flujo 4: cerrar sesión

- En **Admin** y **Préstamo Rápido** hay botón de cerrar sesión.
- En **Préstamo Rápido**, la sesión guardada en el navegador interno caduca a las **8 horas**.
- En **Admin**, la sesión vive en la sesión actual de la ventana; cierra sesión al terminar si la computadora es compartida.

---

## 📥 Importar Excel de Patrimonio

La app puede cargar el inventario oficial desde un archivo `.xlsx` de Patrimonio.

### Dónde está

**Admin → Toma de inventario → Importar Excel de Patrimonio**.

### Cómo funciona

1. Elige el archivo `.xlsx`.
2. La app muestra un plan previo antes de escribir datos: equipos nuevos, equipos a actualizar, categorías nuevas y avisos.
3. Si el plan es correcto, toca **Aplicar**.
4. Antes de aplicar, la app crea un respaldo automático.

### Reglas importantes

| Regla | Detalle |
|---|---|
| No se pisa a ciegas | Los equipos existentes conservan datos capturados por la escuela cuando corresponde. |
| Lo importado no se presta automáticamente | Los equipos y categorías nuevas entran como **Solo inventario**. |
| La escuela decide qué se presta | Después de importar, activa **Prestable** en categorías o equipos concretos. |
| Puedes volver atrás | Restaura el respaldo creado antes de aplicar si el resultado no era el esperado. |

Detalles: [`app-prestamos-p15/docs/INVENTARIO_PATRIMONIO.md`](app-prestamos-p15/docs/INVENTARIO_PATRIMONIO.md) y [`app-prestamos-p15/docs/PLAN_IMPORTACION_PATRIMONIO.md`](app-prestamos-p15/docs/PLAN_IMPORTACION_PATRIMONIO.md).

---

## 📋 Toma de inventario físico

Sirve para comparar lo que hay físicamente en los estantes contra lo que la app tiene registrado. Está en **Admin → Toma de inventario**.

### La pistola dispara sola

La app detecta el lector por la velocidad del tecleo. Si el lector no manda `Enter`, la app igual puede reconocer el disparo. Si una persona escribe a mano, puede confirmar con `Enter`.

### Paso a paso

1. Elige el área o ubicación a contar.
2. Si estás capacitando a alguien, activa **Modo prueba · no guarda nada**.
3. Inicia una campaña nueva para esa área.
4. Escanea equipo por equipo.
5. La app da retroalimentación inmediata. Los textos visibles incluyen **Repetido**, **Se movió: ...** o el nombre del equipo localizado.
6. Revisa la sección **Lo que hay en {ubicación}** para ver pendientes.
7. Si falta equipo, usa el cierre de pendientes: **Este no apareció** o **Estos N no aparecieron**.
8. Exporta el reporte cuando termines el área.

### Modo prueba

El modo prueba recorre la experiencia completa —lector, sonidos, tarjetas, repetidos y deshacer— sin escribir en la base. Mientras está activo, las acciones que escribirían datos quedan bloqueadas.

### Alta al vuelo

Si escaneas una etiqueta que la app no reconoce, puedes resolverlo ahí mismo:

| Opción | Cuándo usarla |
|---|---|
| Buscar y ligar | El equipo ya existe, pero no tenía esa etiqueta asignada. |
| Agregar al inventario | Es un equipo nuevo y se captura con datos mínimos. |
| Editar completo | Tienes el equipo en la mano y puedes capturar marca, modelo, serie y más campos. |

Todo lo agregado desde toma física entra como **Solo inventario** hasta que alguien lo habilite como prestable.

### Reportes de la toma física

La app genera dos salidas distintas:

| Botón | Archivo | Uso |
|---|---|---|
| **Descargar Excel para Patrimonio** | `reporte-inventario-<fecha>.xlsx` | Archivo listo para entregar. |
| **Descargar CSV para otra computadora** | `reporte-inventario-<fecha>.csv` | Archivo para fusionar una toma hecha en otra computadora. |

Los reportes se guardan en `%AppData%\com.p15.prestamos\reportes`, carpeta hermana de `backups`.

La columna `Localizado` usa tres estados:

| Valor | Significa |
|---|---|
| `S` | Apareció: se escaneó o se marcó como presente. |
| `N` | Se buscó y no estaba. |
| *(vacío)* | Nadie terminó esa revisión; es trabajo pendiente. |

### Toma física en dos computadoras

Para montar una segunda computadora, se restaura una copia reciente de la base. Para regresar los resultados, no se restaura la base completa: se exporta el **CSV** y en la principal se usa **Admin → Toma de inventario → Traer la toma física de otra computadora**.

La fusión escribe datos de toma física como revisión, responsable, no localizado y ubicación. No fusiona préstamos ni altas nuevas hechas en la segunda computadora.

Detalle completo: [`app-prestamos-p15/docs/RELEVO_TOMA_FISICA.md`](app-prestamos-p15/docs/RELEVO_TOMA_FISICA.md).

---

## 📁 Dónde están guardadas las cosas

La base local vive en la carpeta de datos de la app en Windows:

```text
C:\Users\<TU_USUARIO>\AppData\Roaming\com.p15.prestamos\
├── prestamos.db          ← base principal
├── prestamos.db-wal      ← archivo auxiliar de SQLite; no lo borres
├── prestamos.db-shm      ← archivo auxiliar de SQLite; no lo borres
├── backups\              ← respaldos automáticos, manuales y pre-restauración
└── reportes\             ← reportes exportados de toma física
```

Atajo: **Win + R →** escribe `%AppData%\com.p15.prestamos` **→ Enter**.

> ⚠️ Si borras esa carpeta, pierdes el historial local. Mantén respaldos vigentes.

### Datos principales que contiene la base

| Tabla | Qué guarda |
|---|---|
| `profesores` | Docentes, códigos, administradores y PIN cuando corresponde. |
| `categorias` | Tipos de equipo y si se pueden prestar. |
| `inventario` | Equipos, estado, ubicación, identificadores, stock y reglas de préstamo. |
| `prestamos` | Préstamos del kiosko de docentes. |
| `prestamos_rapidos_alumnos` | Préstamos rápidos y trazabilidad de autorización. |
| `eventos` | Salidas a evento. |
| `fotos_regreso` | Evidencia local asociada al regreso cuando aplica. |
| `celular_dispositivos` | Dispositivos autorizados para el acceso experimental desde celular. |
| `app_settings` | Configuraciones de la app. |

> 🛠 Nota técnica: `app-prestamos-p15/database.sql` es referencia histórica. El esquema real se crea y migra desde `app-prestamos-p15/src/hooks/useInventory.ts`.

---

## 💾 Respaldo y recuperación (¡IMPORTANTE!)

**Lo esencial:** la app guarda respaldos en disco, permite crear respaldos manuales y crea un respaldo de seguridad antes de restaurar otro archivo. Si la escuela conecta la carpeta `backups` a Google Drive para Escritorio, esos archivos pueden quedar copiados en la nube por Drive.

### Tipos de respaldo

Todos viven en `%AppData%\com.p15.prestamos\backups\`.

| Tipo | Nombre típico | Quién lo crea | Se borra solo |
|---|---|---|---|
| Automático | `prestamos-auto-2026-08-28_08-00-13.db` | La app, según la frecuencia configurada | Sí, conserva los 20 más recientes. |
| Manual | `prestamos-backup-2026-08-28_14-32-09.db` | Tú, con **Crear respaldo** | No. |
| Pre-restauración | `prestamos-pre-restore-2026-08-28_14-35-40.db` | La app, justo antes de restaurar | No. |

### Respaldo automático

- Viene activado.
- La frecuencia puede configurarse en **Admin → Configuración → Respaldos**.
- La app revisa periódicamente si ya toca respaldar mientras está abierta.
- Si la app está cerrada o la computadora apagada, no se genera respaldo en segundo plano.
- La importación del Excel de Patrimonio crea respaldo antes de aplicar cambios.

### Respaldos en Google Drive

La app no sube archivos por sí sola. Lo que se puede hacer es conectar carpetas locales a **Google Drive para Escritorio** con la cuenta institucional.

Configura estas dos carpetas por separado:

```text
%AppData%\com.p15.prestamos\backups
%AppData%\com.p15.prestamos\reportes
```

> 🚨 No sincronices la carpeta padre `%AppData%\com.p15.prestamos`. Ahí vive la base abierta (`prestamos.db`, `-wal`, `-shm`) y sincronizarla mientras se escribe puede corromper datos.

### Crear un respaldo manual

1. Entra a **Admin → Configuración → Respaldos**.
2. Toca **Crear respaldo**.
3. Usa **Abrir carpeta** para copiar el archivo a USB, Drive u otra ubicación segura.

### Restaurar

1. Entra a **Admin → Configuración → Respaldos**.
2. Elige **Restaurar** en un respaldo existente o **Importar respaldo** para seleccionar un `.db` externo.
3. La app valida que el archivo parezca una base SQLite, crea un respaldo de pre-restauración, reemplaza la base actual y limpia archivos auxiliares.
4. Cierra y vuelve a abrir la app.

> ⚠️ Restaurar reemplaza toda la base. No mezcla datos. Si restauras un respaldo viejo, pierdes lo capturado después de esa fecha salvo que recuperes el respaldo de pre-restauración.

### Scripts Python opcionales

El repo conserva utilidades para respaldo manual desde terminal:

| Script | Uso |
|---|---|
| `app-prestamos-p15/scripts/backup_sqlite.py` | Crea respaldo con checksum. |
| `app-prestamos-p15/scripts/restore_sqlite.py` | Restaura con copia previa e integrity check. |

Guía: [`app-prestamos-p15/docs/sqlite-backup-restore-guide.md`](app-prestamos-p15/docs/sqlite-backup-restore-guide.md).

---

## 🧰 Mantenimiento

### Tareas sugeridas

| Frecuencia | Tarea |
|---|---|
| Diario | Abrir la app durante la jornada si se depende del respaldo automático. |
| Semanal | Revisar préstamos activos antiguos en **Admin → Reportes**. |
| Mensual | Exportar reportes del mes y revisar una zona de inventario físico. |
| Antes de importar Patrimonio | Confirmar que existe respaldo reciente. |
| Antes de actualizar | Crear respaldo manual. |
| Trimestral | Copiar respaldos importantes a una ubicación externa. |

### Actualizar la app

La app busca nuevas versiones al abrir y cada **6 horas** mientras sigue abierta. También puedes revisar en **Admin → Configuración → Actualizaciones**.

1. Si aparece una versión nueva, lee las notas.
2. Crea respaldo manual antes de actualizar.
3. Toca **Actualizar ahora…** solo cuando puedas cerrar la app.
4. Windows instala en modo pasivo y puede cerrar la app.
5. Abre la app de nuevo y revisa que los datos estén correctos.

Buscar actualizaciones no descarga ni instala nada por sí solo. Sin internet, la app sigue operando; el panel muestra el error y puedes intentar después.

Detalles técnicos del actualizador: [`app-prestamos-p15/docs/UPDATES.md`](app-prestamos-p15/docs/UPDATES.md).

### Si la app no abre

| Problema | Causa probable | Qué hacer |
|---|---|---|
| SmartScreen muestra advertencia | Instalador sin certificado comercial de editor | Verifica que venga del Release oficial o del responsable técnico antes de continuar. |
| Ventana en blanco | Falta WebView2 o falló el arranque | Instala WebView2 y vuelve a abrir. |
| Error de base | Base dañada o archivo incorrecto | Restaura un respaldo desde Configuración o con apoyo técnico. |
| Olvidaste el PIN | PIN personalizado perdido | Usa el acceso inicial de recuperación y define uno nuevo. |
| Se borró la carpeta de datos | Se perdió la base local | Restaura desde un respaldo externo; sin respaldo no hay recuperación completa. |

### Mantener el repo limpio

- `app-prestamos-p15/dist/` y `app-prestamos-p15/src-tauri/target/` se regeneran al compilar.
- No subas `node_modules/`, bases reales, secretos ni archivos locales de una computadora específica.
- Guía: [`app-prestamos-p15/docs/REPO_CLEANUP.md`](app-prestamos-p15/docs/REPO_CLEANUP.md).

---

## 🌐 GitHub para principiantes

GitHub es como una carpeta compartida con historial: guarda cambios, permite reportar problemas y ayuda a revisar modificaciones antes de integrarlas.

### Conceptos básicos

| Palabra | Significa |
|---|---|
| Repositorio | Carpeta principal del proyecto en GitHub. |
| Issue | Reporte de problema, duda o mejora. |
| Commit | Cambio guardado con un mensaje. |
| Branch | Rama de trabajo separada de `main`. |
| Pull Request | Solicitud para revisar e integrar cambios. |
| Release | Versión publicada con instaladores. |

### Clonar el proyecto

```powershell
git clone https://github.com/Leoglez10/app-prestamos-p15.git
cd app-prestamos-p15/app-prestamos-p15
```

El segundo `app-prestamos-p15` es correcto: el código de la app vive dentro de una subcarpeta con ese nombre.

### Hacer un cambio con rama

```powershell
git checkout -b docs/mi-cambio
git status
git add README.md
git commit -m "docs: mejora instrucciones de respaldo"
git push -u origin docs/mi-cambio
```

Después abre un Pull Request en GitHub.

> ⚠️ No subas bases reales (`prestamos.db`), contraseñas, tokens, `node_modules/`, `dist/` ni `src-tauri/target/`.

---

## 🧭 Reportar problemas y proponer mejoras

### Desde la app

Ruta: **Admin → Configuración → Reportar un problema → Escribir un reporte…**.

La app pide:

1. Tipo: problema o sugerencia.
2. Título.
3. Descripción.

Al enviar, agrega la versión instalada y el sistema operativo. No manda préstamos ni datos personales de la base. El reporte llega como Issue de GitHub.

### Desde GitHub

Usa <https://github.com/Leoglez10/app-prestamos-p15/issues/new/choose>.

| Formulario | Para qué sirve |
|---|---|
| **Reportar un problema** | Algo no funcionó, falló o dio un resultado inesperado. |
| **Sugerir una mejora** | La app podría ahorrar un paso o cubrir una necesidad nueva. |

Los formularios incluyen campos guiados: área de la app, qué intentabas, qué ocurrió, qué esperabas, frecuencia, sistema y versión.

### Etiquetas de triage

| Familia | Uso |
|---|---|
| `área:` | Parte afectada: kiosko, inventario, respaldos, actualizaciones, reportes, etc. |
| `prioridad:` | Urgencia para el plantel: alta, media o baja. |
| `estado:` | Situación actual, por ejemplo `estado: necesita información` o `estado: en curso`. |
| `origen: app` | El reporte llegó desde el botón interno de la app. |

Para respuestas listas del mantenedor, revisa [`app-prestamos-p15/docs/PLANTILLAS_RESPUESTA.md`](app-prestamos-p15/docs/PLANTILLAS_RESPUESTA.md).

---

## 👨‍💻 Para programadores: configurar y compilar

### Stack verificado

| Capa | Tecnología |
|---|---|
| Escritorio | Tauri v2 |
| Frontend | React 19 + TypeScript + Vite 7 |
| Rutas | `react-router-dom` 7 |
| Persistencia | SQLite local vía `@tauri-apps/plugin-sql` |
| Rust | Edition 2021 |
| Actualización | `@tauri-apps/plugin-updater` + `tauri-plugin-updater` |
| Proceso | `@tauri-apps/plugin-process` + `tauri-plugin-process` |

### Requisitos de desarrollo

- Node.js compatible con el soporte de TypeScript que usa `node --test`; la CI usa **Node 24**.
- Rust stable.
- Git.
- En Windows: Microsoft C++ Build Tools y WebView2 Runtime.
- Bun si vas a usar `npm run tauri:build`, porque ese script ejecuta `bun run dmg`.

### Setup local

```powershell
git clone https://github.com/Leoglez10/app-prestamos-p15.git
cd app-prestamos-p15/app-prestamos-p15
npm install
npm run tauri dev
```

`npm run dev` levanta solo Vite en <http://localhost:1770/>. Para operar con SQLite y comandos nativos, usa `npm run tauri dev`.

### Scripts disponibles en `package.json`

| Script | Comando real | Qué hace |
|---|---|---|
| `dev` | `npm run dev` | Vite dev server en puerto 1770. |
| `build` | `npm run build` | `tsc && vite build`. |
| `preview` | `npm run preview` | Previsualiza `dist/`. |
| `tauri` | `npm run tauri -- <args>` | Pasarela al CLI de Tauri. |
| `lint` | `npm run lint` | `eslint src`. |
| `pretest` | `npm run pretest` | `eslint src`; también corre automáticamente antes de `npm test`. |
| `test` | `npm test` | Ejecuta todos los tests `app-prestamos-p15/src/utils/*.test.ts`. |
| `test:backup` | `npm run test:backup` | Tests de calendario de respaldos. |
| `test:patrimonio` | `npm run test:patrimonio` | Tests de códigos patrimoniales. |
| `test:identificadores` | `npm run test:identificadores` | Tests de normalización de identificadores. |
| `test:ficha` | `npm run test:ficha` | Tests de armado de ficha de equipo. |
| `test:importacion` | `npm run test:importacion` | Tests de importación de Patrimonio. |
| `test:toma` | `npm run test:toma` | Tests de toma física. |
| `test:pistola` | `npm run test:pistola` | Tests de detección del lector de códigos. |
| `docs:pdf` | `npm run docs:pdf` | Genera el PDF del manual con `scripts/build-manual-pdf.py`. |
| `tauri:build` | `npm run tauri:build` | `tauri build --bundles app && bun run dmg`. |
| `dmg` | `npm run dmg` | Ejecuta `scripts/make-dmg.sh`. |

Tests en disco al momento de esta revisión: **15 archivos** en `app-prestamos-p15/src/utils/` y **147 declaraciones `test(...)`**.

### Build local y build firmado

Build normal del frontend:

```powershell
npm run build
```

Build Tauri desde el script genérico:

```powershell
npm run tauri -- build --target x86_64-pc-windows-msvc
```

Para generar artefactos de actualizador firmados, define de forma segura estas variables en la sesión de CI o terminal de build, sin escribir sus valores en archivos del repo:

| Variable | Uso |
|---|---|
| `TAURI_SIGNING_PRIVATE_KEY` | Clave privada de firma del actualizador. |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Contraseña de esa clave. |

Los detalles y advertencias están en [`app-prestamos-p15/docs/UPDATES.md`](app-prestamos-p15/docs/UPDATES.md).

### Configuración relevante

| Archivo | Dato verificado |
|---|---|
| `app-prestamos-p15/vite.config.ts` | Puerto 1770, `strictPort: true`, HMR 1771 cuando `TAURI_DEV_HOST` está definido, ignora `src-tauri/**`. |
| `app-prestamos-p15/src-tauri/tauri.conf.json` | Identificador `com.p15.prestamos`, ventana 1280×840, mínimo 1024×680, `createUpdaterArtifacts: true`. |
| `app-prestamos-p15/src-tauri/capabilities/default.json` | Permisos `core`, `opener`, `updater`, `process` y `sql`. |

### Reportes desde la app: Cloudflare Worker

El botón interno de reporte no guarda un token de GitHub en la app. La app manda el reporte a un Cloudflare Worker y el Worker abre el Issue en `Leoglez10/app-prestamos-p15`.

| Pieza | Ruta |
|---|---|
| Cliente nativo | `app-prestamos-p15/src-tauri/src/feedback.rs` |
| Worker | `app-prestamos-p15/worker/src/index.js` |
| Configuración Worker | `app-prestamos-p15/worker/wrangler.toml` |
| Guía Worker | `app-prestamos-p15/worker/README.md` |

Despliegue del Worker:

```bash
cd app-prestamos-p15/worker
npx wrangler login
npx wrangler secret put GITHUB_TOKEN
npx wrangler deploy
```

El rate limit configurado es `RATE_LIMITER`: **5 solicitudes por 60 segundos** por clave de Cloudflare. El token debe ser fine-grained y con permiso mínimo de Issues para el repositorio.

---

## 🗺 Estructura del proyecto: dónde está cada cosa

```text
README.md                                  ← este archivo, en la raíz del repo
CHANGELOG.md                              ← historial de versiones
CONTRIBUTING.md                           ← guía para reportes y PRs
.github/workflows/build-windows.yml       ← CI/release activo
.github/ISSUE_TEMPLATE/                   ← formularios de Issues
app-prestamos-p15/                        ← carpeta real de la app
├── package.json                          ← scripts y dependencias JS
├── vite.config.ts                        ← Vite
├── src/                                  ← interfaz React
├── src-tauri/                            ← shell Tauri/Rust, comandos nativos y capabilities
├── docs/                                 ← manuales y guías técnicas
├── scripts/                              ← release, PDF, respaldo y migraciones
└── worker/                               ← Cloudflare Worker para reportes desde la app
```

Regla rápida:

| Si quieres cambiar... | Busca en... |
|---|---|
| Pantallas y flujos | `app-prestamos-p15/src/pages/` y `app-prestamos-p15/src/components/` |
| Reglas de datos y migraciones | `app-prestamos-p15/src/hooks/useInventory.ts` |
| Utilidades probadas | `app-prestamos-p15/src/utils/` |
| Comandos nativos y rutas de datos | `app-prestamos-p15/src-tauri/src/` |
| Permisos Tauri | `app-prestamos-p15/src-tauri/capabilities/default.json` |
| Manuales | `app-prestamos-p15/docs/` |
| Release y PDF | `app-prestamos-p15/scripts/` |

Inventario técnico más profundo: [`app-prestamos-p15/docs/ARQUITECTURA.md`](app-prestamos-p15/docs/ARQUITECTURA.md).

---

## 🏷 Versionado y publicación

La versión actual es **0.11.1**. Debe coincidir en estos cuatro archivos:

- `app-prestamos-p15/src-tauri/tauri.conf.json`
- `app-prestamos-p15/package.json`
- `app-prestamos-p15/src-tauri/Cargo.toml`
- `app-prestamos-p15/src-tauri/Cargo.lock`

### Workflow activo

El workflow activo es `.github/workflows/build-windows.yml`. Tiene tres jobs:

1. `prepare-release`
2. `build-tauri`
3. `build-manual`

Se dispara por:

- push a `main`;
- push de tags `v*`;
- ejecución manual `workflow_dispatch`, con input booleano opcional `dry_run`.

Usa concurrency `release-${{ github.repository }}` con `cancel-in-progress: false`, para evitar carreras entre releases.

### Gate de release en `main`

Un push a `main` publica versión solo si el rango desde el último tag contiene al menos un commit no merge cuyo subject coincida con:

```text
^(feat|fix)(\([^)]+\))?!?: .+
```

Consecuencias:

| Tipo de push | Resultado |
|---|---|
| Incluye `feat:` o `fix:` | Calcula el siguiente patch y prepara release. |
| Solo `docs:`, `chore:`, `ci:`, `style:` o `test:` | No publica, no sube versión, no inicia runner Windows. |
| HEAD es `release: vX.Y.Z` | Se salta para no duplicar el flujo manual. |

Chequeo local sin publicar, desde la raíz del repo:

```bash
bash app-prestamos-p15/scripts/release-gate.sh --range v0.11.0..HEAD
```

Imprime `should_release=`, `reason=`, `previous_tag=`, `release_tag=`, `functional_commits=`, `target_sha=` y `release_version=`. No escribe archivos ni publica nada.

Autocomprobaciones:

```bash
bash app-prestamos-p15/scripts/test-release-gate.sh
bash app-prestamos-p15/scripts/test-publish-release.sh
```

### Cuando sí publica

El flujo automático:

1. Calcula el siguiente patch.
2. Escribe versión en los cuatro archivos de versión.
3. Sella `README.md`, `CHANGELOG.md` y `app-prestamos-p15/docs/MANUAL_PERSONAL.md` con `app-prestamos-p15/scripts/stamp-release-docs.sh`.
4. Crea el commit `release: vX.Y.Z` y lo empuja a `main`.
5. `tauri-action` crea el tag y el GitHub Release junto con el build, para mantener tag y release atómicos.
6. Adjunta instaladores, firmas, `latest.json` y el PDF del manual del personal.

> ⚠️ Requisito operativo: ese push automático a `main` usa `GITHUB_TOKEN`. Si hay branch protection, debe permitir el push del bot de GitHub Actions o el job falla y no publica.

### Rutas manuales que siguen funcionando

Desde `app-prestamos-p15/`:

```bash
bash scripts/publish-release.sh <version>
```

También se puede lanzar el workflow manualmente desde GitHub. Si `dry_run` está activo en `workflow_dispatch`, el gate solo decide y no compila ni publica.

### Qué valida CI

El workflow usa Node **24**, instala dependencias con `npm ci`, verifica que existan los secrets `TAURI_SIGNING_PRIVATE_KEY` y `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`, ejecuta `npm test`, ejecuta `cargo test --locked --manifest-path src-tauri/Cargo.toml`, compila Windows x64 y genera el PDF del manual.

---

## ❓ Dudas frecuentes

**¿Necesito internet para usar la app?**
No para operar inventario, préstamos, reportes locales y respaldos en disco. Sí necesitas internet para buscar/descargar actualizaciones, enviar reportes desde la app o sincronizar carpetas mediante Google Drive.

**¿Funciona en Mac o Linux?**
El instalador publicado es para Windows. El código puede compilarse en otros sistemas si tienes el entorno técnico, pero no hay build oficial para personal de la escuela.

**¿Dónde veo el historial de préstamos?**
En **Admin → Reportes**. Filtra por fecha, estado o categoría y usa impresión/PDF si necesitas entregar o archivar.

**¿Cómo doy de alta a un profesor?**
Entra a **Admin → Profesores**, crea un registro con nombre y código UDG. Si también será administrador, marca la opción de admin y define PIN.

**¿Por qué un equipo no aparece para préstamo?**
Puede estar como **Solo inventario**, prestado, extraviado, en mantenimiento o filtrado por configuración del kiosko. Revisa categoría, equipo y estado.

**¿Importé el Excel y ahora no puedo prestar esos equipos?**
Es intencional. Todo lo nuevo entra como **Solo inventario** hasta que la escuela decida qué se presta.

**¿Qué significa “Más de 1 día” en Préstamo Rápido?**
Es un filtro para préstamos activos con más de 24 horas. Ayuda a detectar pendientes antiguos.

**¿Puedo practicar la toma física sin cambiar datos?**
Sí. Activa **Modo prueba · no guarda nada** antes de practicar.

**¿Qué hago si una etiqueta no existe en la app?**
Desde la toma física puedes ligarla a un equipo existente, agregar el equipo con datos mínimos o abrir la ficha completa.

**¿Qué significa una celda vacía en `Localizado`?**
Que esa revisión sigue pendiente. `S` significa localizado y `N` significa buscado y no localizado.

**¿Puedo trabajar en dos computadoras?**
Sí, pero no como sincronización en vivo. Para base completa, una computadora reemplaza a la otra con respaldo/restauración. Para toma física, usa el CSV de fusión desde **Toma de inventario**.

**¿La app manda datos a servidores externos?**
No manda la base de préstamos. Sí hace llamadas de red para actualizaciones y para reportes de problemas si decides enviarlos desde la app. Si conectas carpetas con Google Drive, Drive copia esos archivos según su propia configuración.

**¿Es seguro el PIN inicial?**
No es una credencial final. Cámbialo al empezar y conserva la app en el entorno interno de la escuela.

---

## 🤝 Cómo contribuir

Si no programas, lo más útil es reportar bien: usa **Admin → Configuración → Reportar un problema** o el formulario de Issues.

Si programas:

1. Haz fork o crea una rama.
2. Entra a `app-prestamos-p15/` dentro del repo.
3. Instala dependencias con `npm install`.
4. Corre la app con `npm run tauri dev`.
5. Haz commits claros.
6. Ejecuta `npm run lint` y `npm test` antes del PR.
7. Abre el Pull Request y explica qué cambió y por qué.

Guía completa: [`CONTRIBUTING.md`](CONTRIBUTING.md).

> Importante: que un cambio se apruebe no significa que se publique inmediatamente. La publicación depende del gate de release y de que exista un commit `feat:` o `fix:` cuando se integre a `main`, o de que el mantenedor use el flujo manual.

---

## 📚 Documentación relacionada

| Documento | Para qué sirve |
|---|---|
| [`app-prestamos-p15/docs/MANUAL_PERSONAL.md`](app-prestamos-p15/docs/MANUAL_PERSONAL.md) | Manual operativo completo para el personal. |
| [`app-prestamos-p15/docs/UPDATES.md`](app-prestamos-p15/docs/UPDATES.md) | Actualizador firmado, Windows x64, secrets y prueba obligatoria. |
| [`app-prestamos-p15/docs/PLANTILLAS_RESPUESTA.md`](app-prestamos-p15/docs/PLANTILLAS_RESPUESTA.md) | Respuestas listas para triage de Issues. |
| [`app-prestamos-p15/docs/ARQUITECTURA.md`](app-prestamos-p15/docs/ARQUITECTURA.md) | Mapa técnico profundo movido fuera del README. |
| [`app-prestamos-p15/docs/ENGINEERING_HANDBOOK.md`](app-prestamos-p15/docs/ENGINEERING_HANDBOOK.md) | Guía de mantenimiento del código. |
| [`app-prestamos-p15/docs/INVENTARIO_PATRIMONIO.md`](app-prestamos-p15/docs/INVENTARIO_PATRIMONIO.md) | Formato y reglas del Excel de Patrimonio. |
| [`app-prestamos-p15/docs/PLAN_IMPORTACION_PATRIMONIO.md`](app-prestamos-p15/docs/PLAN_IMPORTACION_PATRIMONIO.md) | Diseño técnico de la importación. |
| [`app-prestamos-p15/docs/RELEVO_TOMA_FISICA.md`](app-prestamos-p15/docs/RELEVO_TOMA_FISICA.md) | Toma física en dos computadoras y fusión por CSV. |
| [`app-prestamos-p15/docs/QR_CELULAR.md`](app-prestamos-p15/docs/QR_CELULAR.md) | Acceso experimental desde celular por red local. |
| [`app-prestamos-p15/docs/REPO_CLEANUP.md`](app-prestamos-p15/docs/REPO_CLEANUP.md) | Qué carpetas limpiar y qué no subir. |
| [`app-prestamos-p15/docs/sqlite-backup-restore-guide.md`](app-prestamos-p15/docs/sqlite-backup-restore-guide.md) | Respaldo/restauración con scripts Python. |
| [`app-prestamos-p15/docs/postgres-restore-guide.md`](app-prestamos-p15/docs/postgres-restore-guide.md) | Migración desde Postgres legacy. |
| [`app-prestamos-p15/docs/SERVIDOR.md`](app-prestamos-p15/docs/SERVIDOR.md) | Notas exploratorias sobre alojar datos en servidor. |
| [`app-prestamos-p15/docs/ROADMAP.md`](app-prestamos-p15/docs/ROADMAP.md) | Rumbo y pendientes del proyecto. |
| [`CHANGELOG.md`](CHANGELOG.md) | Historial de versiones. |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Cómo reportar y contribuir. |
| [`README_INSTALACION.md`](README_INSTALACION.md) | Guía corta de instalación manual. |

---

## ⚖️ Licencia y uso

Proyecto de uso interno educativo para la Preparatoria 15 (UDG). Revisa [`LICENSE`](LICENSE).

En resumen: instituciones educativas pueden usarlo, instalarlo, estudiarlo y adaptarlo sin costo, conservando crédito al autor. No se puede vender ni distribuir como parte de un producto o servicio comercial. El software se entrega sin garantía; mantener respaldos vigentes es responsabilidad de la institución que lo opera.

---

## 🙌 Créditos

<div align="center">

<img src="https://github.com/Leoglez10.png" alt="Leonardo Gonzalez" width="96"/>

### Diseñado y desarrollado por **Leonardo Gonzalez**

[![GitHub](https://img.shields.io/badge/GitHub-%40Leoglez10-181717?logo=github)](https://github.com/Leoglez10)
[![Issues](https://img.shields.io/badge/Reportar_bug_o_idea-2ea44f?logo=github)](https://github.com/Leoglez10/app-prestamos-p15/issues)

**Institución:** Preparatoria 15 — Universidad de Guadalajara (UDG)

**Propósito:** Control y trazabilidad de préstamos de equipo audiovisual

**Stack:** Tauri v2 · React 19 · TypeScript · Vite 7 · Rust · SQLite

</div>

---

<div align="center">

**¿Dudas?** [Dudas frecuentes](#-dudas-frecuentes) · [Respaldo y recuperación](#-respaldo-y-recuperación-importante) · [Manual del personal](app-prestamos-p15/docs/MANUAL_PERSONAL.md)

Hecho para la comunidad de la **Preparatoria 15**.

</div>
