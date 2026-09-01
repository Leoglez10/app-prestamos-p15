<div align="center">

<img src="app-prestamos-p15/img/logo-p15.png" alt="Logo Preparatoria 15" width="150"/>

# App Prestamos P15

### Control de inventario y préstamos de equipo audiovisual para la Preparatoria 15 (UDG)

[![CI — Build Windows Installer](https://github.com/Leoglez10/app-prestamos-p15/actions/workflows/build-windows.yml/badge.svg)](https://github.com/Leoglez10/app-prestamos-p15/actions/workflows/build-windows.yml)
[![Versión](https://img.shields.io/badge/versi%C3%B3n-0.6.0-blue)](CHANGELOG.md)
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
> 3. Conecta los respaldos a Google Drive con el correo de la escuela → [Respaldos en Google Drive](#respaldos-en-google-drive-con-el-correo-de-la-escuela) (el respaldo automático ya viene activado, cada 12 horas)
> 4. ¿Encontraste un problema o necesitas una función? **[Repórtalo aquí](https://github.com/Leoglez10/app-prestamos-p15/issues/new/choose)** — es un formulario guiado, no necesitas saber programar
>
> El resto es opcional: [cómo usarla paso a paso](#-cómo-usar-la-app-paso-a-paso), [importar el Excel oficial](#-importar-excel-de-patrimonio) o [contar inventario físico](#-toma-de-inventario-físico).

---

> 🤖 **¿Eres una IA leyendo este repositorio?**
> Este README cubre casi todo el proyecto. Lo que no está aquí:
>
> - **Historial de versiones y cambios** → [CHANGELOG.md](CHANGELOG.md)
> - **Instalador de Windows ya compilado** → [Releases](https://github.com/Leoglez10/app-prestamos-p15/releases)
> - **Manual completo para el personal** → [docs/MANUAL_PERSONAL.md](app-prestamos-p15/docs/MANUAL_PERSONAL.md) (cada Release incluye también el PDF)
> - **Guías técnicas por tema** (importación, respaldos, toma física, roadmap) → [Documentación relacionada](#-documentación-relacionada)
> - **Todo el código fuente en un solo archivo de texto** → [gitingest.com/Leoglez10/app-prestamos-p15](https://gitingest.com/Leoglez10/app-prestamos-p15)
>
> Resumen del proyecto: aplicación de escritorio para Windows 10/11, 100 % offline, construida con Tauri v2 + React 19 + TypeScript y base de datos SQLite local. Sirve para controlar el inventario de equipo audiovisual, registrar préstamos y generar reportes PDF en la Preparatoria 15 (UDG).

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
16. [Versionado y publicación](#-versionado-y-publicación)
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
- ✅ Lectura de **códigos de barras** en kiosko, inventario y toma física — **la pistola dispara sola**, sin depender de que la etiqueta mande `Enter`
- ✅ **Escaneo global** en Inventario: apuntas a una etiqueta y se abre la ficha, sin hacer clic en ningún campo primero
- ✅ Importación del Excel oficial de **Patrimonio** con plan previo y respaldo automático antes de aplicar
- ✅ **Toma de inventario físico** por áreas, con campaña de escaneo, **modo prueba** para entrenar sin tocar la base, y reporte para Patrimonio
- ✅ **Alta al vuelo**: un código que nadie reclama se da de alta sin salir de la toma física
- ✅ **Respaldo automático cada 12 horas** (configurable; conserva los últimos 20) y subida automática a **Google Drive** si conectas la carpeta
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

1. **Consigue el instalador.** Es un archivo que termina en `.exe` o `.msi` (por ejemplo `App Prestamos P15_0.5.1_x64-setup.exe`). Hay dos formas:
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
   - Si tienes lector de código de barras: **escanea y listo**. El equipo exacto aparece primero y se agrega solo, sin que tengas que apretar `Enter`. Si el equipo escaneado no está disponible, el buscador se limpia para que el siguiente disparo no se pegue al anterior.
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
     - 🔫 **Escaneo global**: con la pestaña abierta, apunta la pistola a cualquier etiqueta y se abre la ficha de ese equipo. No necesitas hacer clic en el buscador primero. Si sí tienes un campo enfocado, el código se escribe ahí (el buscador reemplaza el código anterior en vez de concatenarlo).
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

### La pistola dispara sola

No todas las pistolas vienen configuradas para mandar `Enter` al final del disparo. Sin ese `Enter`, el código se queda parado en el campo esperando a que alguien lo teclee — justo lo que un recorrido con pistola quiere evitar.

La app resuelve eso **por velocidad**: la pistola escribe el código entero en milisegundos, una persona no. Si detecta la ráfaga, dispara sola. Si estás tecleando a mano, sigue esperando tu `Enter`.

> ✅ **Traducción:** funciona con la pistola que tengas, salga como salga configurada de fábrica. No hay nada que ajustar en el hardware.

### Paso a paso

1. Elige el **área** a contar (usa las ubicaciones recientes o escribe una nueva).
2. Si es la primera vez o estás entrenando a alguien, activa **"Modo prueba · no guarda nada"** (ver abajo).
3. **"Iniciar campaña nueva"** → reinicia todo el área a *pendiente* (pide doble confirmación).
4. **Escanea** equipo por equipo. Cada disparo da feedback inmediato con sonido y tarjeta:
   - 🟢 **Nuevo aquí** — estaba pendiente, ya está contado
   - 🔵 **Movido** — existe pero su ubicación registrada era otra
   - 🟡 **Repetido** — ya lo escaneaste en esta campaña
5. Cada escaneo marca automáticamente el equipo como **revisado** en esa ubicación.
6. ¿Te equivocaste? Botón **deshacer último escaneo**.
7. La columna **"Deberían estar aquí"** lista lo que falta contar. Cada fila tiene dos botones:
   - **"Sí está"** — lo encontraste pero sin escanearlo (etiqueta rota, ilegible)
   - **"No localizada"** — lo buscaste y **no aparece**. Esto es distinto de dejarlo pendiente (ver el reporte, abajo)
8. Cuando la columna se vacía, terminaste el área. Exporta el **reporte**.

### 🧪 Modo prueba (para entrenar sin miedo)

El botón **"Modo prueba · no guarda nada"** en la pantalla de inicio corre **el recorrido completo**: la pistola, los tonos, el destello, las tarjetas de color, la detección de repetidos, el botón de deshacer. Todo se ve y suena igual.

La diferencia es que **ninguna escritura llega a la base de datos**. Mientras está activo, aparece un distintivo `Prueba · no se guarda` en la barra superior, y los botones que sí escriben (ligar una etiqueta, dar de alta, marcar no localizada) quedan bloqueados con un aviso.

> 💡 Es la forma de enseñarle el recorrido a un becario nuevo sin arriesgar el conteo real. Apágalo antes de la campaña de verdad.

### 🆕 Alta al vuelo: un código que nadie reclama

Escaneas una etiqueta y la app no reconoce el código. Antes eso te obligaba a anotarlo en un papel y capturarlo después. Ahora tienes tres salidas ahí mismo:

| Opción | Cuándo usarla |
|---|---|
| **"Es este"** (buscar y ligar) | El equipo YA está en la app pero sin etiqueta asignada. Lo buscas por nombre, marca o serie y lo ligas. ⚠️ **Queda ligado para siempre.** |
| **"Agregarlo al inventario"** | Es un equipo nuevo que nunca se capturó. Pides solo lo mínimo: **qué es** y **categoría**. La etiqueta y la ubicación ya van puestas. |
| **"Editarlo completo"** | Igual que el anterior, pero abre **la ficha completa de doce campos** de la pestaña Inventario, con lo que ya escribiste adentro. |

> 💡 **Usa "Editarlo completo" cuando el aparato esté en la mano.** La marca, el modelo y el número de serie se leen del chasis AHORA. Si no se capturan en ese momento, no los captura nadie.

> 🔒 Todo lo que se da de alta así entra como **solo inventario**. Para prestarlo hay que habilitarlo después desde Inventario o Categorías. La toma física nunca activa préstamos por su cuenta.

### 📄 El reporte que va a Patrimonio

Se exporta como **CSV con `;` y BOM UTF-8**, a propósito: así Excel en español lo abre en columnas y con los acentos bien. Sale con el nombre `reporte-inventario-<fecha>.csv` y se guarda en `%AppData%\com.p15.prestamos\reportes`, una carpeta **hermana** de `backups` (no está adentro).

Columnas: `Id · Descripción · Marca · Modelo · Num Serie · Resguardante · Ubicación · Localizado · Revisado · Revisó`

**La columna `Localizado` tiene TRES estados, no dos:**

| Valor | Significa |
|---|---|
| `S` | Apareció. Alguien lo escaneó o lo marcó "Sí está" |
| `N` | Se buscó y **no estaba**. Alguien pulsó "No localizada" |
| *(vacío)* | **Nadie llegó todavía a esa área.** No es una pérdida: es trabajo pendiente |

> ⚠️ **Por qué importa:** antes, todo lo no revisado salía como `N`. O sea, el reporte le afirmaba a Patrimonio pérdidas que nadie había comprobado. Un área que ni siquiera se empezó a contar reportaba todo su equipo como extraviado.

### 🔁 Toma física en dos computadoras

La computadora principal **sigue prestando** mientras una segunda camina el edificio con la pistola. Al final los dos trabajos se juntan sin que ninguno pierda nada.

**El punto clave:** el respaldo `.db` NO sirve para devolver el trabajo. Restaurar **reemplaza toda la base**, así que mandar de vuelta la base de la segunda computadora borraría todos los préstamos que la principal registró mientras tanto. Lo que vuelve es el **CSV**, y ese **fusiona**.

| | Qué es | Qué hace al entrar | Cuándo |
|---|---|---|---|
| **Respaldo `.db`** | La base completa | **Reemplaza todo** | Una sola vez, al montar la segunda computadora |
| **Reporte `.csv`** | El resultado del recorrido | **Fusiona** | Cada vez que la segunda termina |

**Cómo se usa:**

1. **Al montar la segunda computadora:** instala la app y restaura el respaldo más nuevo desde Drive. Queda con el inventario completo.
2. **Durante la campaña:** la segunda recorre, la principal presta. **Ninguna de las dos restaura nada.**
3. **Al terminar:** la segunda exporta el reporte, Drive lo sincroniza, y en la principal entras a **Admin ▸ Inventario ▸ "Traer la toma física de otra computadora"** y eliges el CSV. Ves la vista previa antes de que se escriba nada.

**Qué escribe la fusión:** solo `revisado`, `quién revisó`, `no localizado` y `ubicación`. Los préstamos no comparten ninguna de esas columnas — por eso las dos computadoras pueden trabajar al mismo tiempo sin pisarse.

> ✅ **Gana el dato más nuevo equipo por equipo**, no archivo por archivo. Traer el mismo reporte dos veces no cambia nada, y un reporte viejo no puede pisar un recorrido más reciente.

> ⚠️ Los equipos que la segunda computadora dio de **alta al vuelo** no se fusionan solos: salen listados aparte para darlos de alta a mano. El reporte no trae la categoría, y elegirla automáticamente sería adivinar.

📚 Detalle completo: [docs/RELEVO_TOMA_FISICA.md](app-prestamos-p15/docs/RELEVO_TOMA_FISICA.md)

### Tips

- Haz una campaña **por área**; no intentes contar todo en una sola pasada.
- La campaña reinicia pendientes al iniciarla: hazla en un momento tranquilo y termina el área completa.
- Antes de mandar el reporte a Patrimonio, revisa que no queden celdas vacías en `Localizado` de un área que sí terminaste.

📚 Detalle técnico del formato de etiquetas: [docs/INVENTARIO_PATRIMONIO.md](app-prestamos-p15/docs/INVENTARIO_PATRIMONIO.md)

---

## 📁 Dónde están guardadas las cosas

Esta app **no usa la nube para funcionar**: todo vive en la computadora donde la instalaste y trabaja sin internet. Lo único que sí puede salir a la nube son los respaldos, si conectas la carpeta de respaldos a Google Drive (ver [Respaldo y recuperación](#-respaldo-y-recuperación-importante)).

### Base de datos (¡lo más importante!)

**Ruta en Windows:**

```
C:\Users\<TUSUARIO>\AppData\Roaming\com.p15.prestamos\
├── prestamos.db          ← TU BASE DE DATOS (todos los préstamos, profesores, equipos)
├── prestamos.db-wal      ← Cache de escritura (no borrar)
├── prestamos.db-shm      ← Memoria compartida (no borrar)
└── backups\              ← Todos los respaldos (automáticos, manuales y pre-restauración)
    ├── prestamos-auto-2026-08-28_08-00-13.db
    ├── prestamos-backup-2026-08-28_14-32-09.db
    └── prestamos-pre-restore-2026-08-28_14-35-40.db
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

**Lo que tienes que saber en 10 segundos:** la app se respalda sola cada 12 horas mientras esté abierta, guarda los respaldos en una carpeta de la computadora, y si conectas esa carpeta a Google Drive con la cuenta de correo de la escuela, cada respaldo se sube solo. No hay que acordarse de nada.

### Los tres tipos de respaldo

Todos viven en la misma carpeta: `%AppData%\com.p15.prestamos\backups\`. Los distingues por el nombre del archivo.

| Tipo | Nombre del archivo | Quién lo crea | ¿Se borra solo? |
|---|---|---|---|
| 🔄 **Automático** | `prestamos-auto-2026-08-28_08-00-13.db` | La app sola, cada 12 horas | **Sí.** Se conservan los 20 más recientes; los más viejos se borran |
| 💾 **Manual** | `prestamos-backup-2026-08-28_14-32-09.db` | Tú, con el botón **"Crear respaldo"** | **No.** Se quedan para siempre hasta que los borres a mano |
| 🛟 **Pre-restauración** | `prestamos-pre-restore-2026-08-28_14-35-40.db` | La app sola, justo **antes** de restaurar otro respaldo encima | **No.** Es tu red de seguridad si restauraste el archivo equivocado |

La fecha y hora del nombre son las de la computadora, en formato `AÑO-MES-DÍA_HORA-MINUTO-SEGUNDO`. Como se escribe así, al ordenar la carpeta por nombre quedan ordenados del más viejo al más nuevo.

> 🛟 **El pre-restauración es el que salva.** Si alguien restaura un respaldo viejo por equivocación y borra el trabajo del día, ese archivo tiene la base tal como estaba un segundo antes. Restáuralo y vuelves atrás.

### Respaldo automático (viene activado)

- **Cada 12 horas** de forma predeterminada. Se puede cambiar en **Admin** → Configuración → sección Respaldos, a: cada 6 horas, cada 12 horas, una vez al día o una vez por semana.
- Mientras la app está abierta, revisa **cada 15 minutos** si ya toca respaldar. Si toca, lo hace en silencio, sin interrumpir a nadie.
- Se conservan los **20 respaldos automáticos más recientes**. Los manuales y los de pre-restauración nunca se borran solos.
- Se puede apagar desde esa misma pantalla, pero **no se recomienda**.

> ⚠️ **La app tiene que estar abierta.** No hay ningún servicio corriendo por detrás en Windows: si la computadora está apagada o la app cerrada, no se genera respaldo. Si solo abren la app un rato al día, tendrán un respaldo al día, no dos.

> 💡 Además de la calendarizada, cualquier importación del Excel de **Patrimonio** crea un respaldo automático justo antes de aplicar cambios.

### Respaldos en Google Drive (con el correo de la escuela)

La app guarda los respaldos en el disco de la computadora. Para que además queden en la nube y se puedan recuperar desde cualquier lado, se conecta esa carpeta a **Google Drive para Escritorio** con la cuenta de correo institucional.

**Cómo se configura (una sola vez, por computadora):**

1. Instala **Google Drive para Escritorio** ([google.com/drive/download](https://www.google.com/drive/download/)).
2. Inicia sesión con la **cuenta de correo de la escuela**, no con una cuenta personal.
3. Abre Drive para Escritorio → ⚙️ **Preferencias** → **Mi computadora** → **Agregar carpeta**.
4. Elige la carpeta de respaldos: pega `%AppData%\com.p15.prestamos\backups` en la barra de dirección del explorador (Win + R también funciona) y selecciónala.
5. Marca la opción de **sincronizar con Google Drive** y guarda.
6. **Repite el paso 3 con la carpeta `reportes`**: `%AppData%\com.p15.prestamos\reportes`. Es una carpeta **hermana** de `backups`, no está adentro, así que hay que agregarla por separado. Ahí caen los reportes de la toma física, y sin este paso no llegan a la otra computadora (ver [Toma física en dos computadoras](#-toma-física-en-dos-computadoras)).

> 🚨 **Agrega las dos carpetas por separado. NUNCA agregues la carpeta padre `%AppData%\com.p15.prestamos`.** Ahí vive la base de datos viva (`prestamos.db` y sus archivos `-wal` / `-shm`). Drive sube archivos enteros sin saber si la app está a la mitad de una escritura, y eso **corrompe la base**.

**Qué pasa a partir de ahí:**

- Cada vez que la app crea un respaldo (automático, manual o pre-restauración), Drive lo sube **en cuestión de segundos**, sin que nadie haga nada.
- **Dónde encontrarlos:** entra a [drive.google.com](https://drive.google.com) con el correo de la escuela → sección **Computadoras** en el menú de la izquierda → el nombre de la computadora → carpeta `backups`. Ahí están todos, con su fecha en el nombre.
- Para restaurar uno: descárgalo de Drive y úsalo con **"Importar respaldo"** (ver abajo).

> ⚠️ **Drive es un espejo, no un archivo histórico.** Cuando la app borra un respaldo automático viejo (porque ya hay más de 20), Drive también lo borra de la nube. Si un respaldo te importa de verdad, crea uno **manual** o muévelo a otra carpeta de Drive: esos no se borran nunca.

> ⚠️ **Sin internet no hay subida.** Drive espera y sube todo cuando vuelve la conexión. El respaldo en el disco de la computadora sí se crea igual.

### Crear un respaldo a mano

1. Entra al **Admin** → pestaña **Configuración** → sección Respaldos.
2. Botón **"Crear respaldo"**.
3. Se guarda en `%AppData%\com.p15.prestamos\backups\` con el nombre `prestamos-backup-<fecha>.db`. Con **"Abrir carpeta"** llegas ahí directo y puedes copiarlo a una USB.

Hazlo antes de cualquier cosa grande: importar el Excel de Patrimonio, actualizar la app, o cerrar el ciclo escolar.

### Copiar el archivo a mano (sin la app)

1. Cierra la app.
2. Ve a `%AppData%\com.p15.prestamos\` (Win + R → pega la ruta → Enter).
3. Copia `prestamos.db` a un lugar seguro (USB, otra computadora, Google Drive).

### Restaurar

1. Entra al **Admin** → Configuración → sección Respaldos.
2. En la tabla de respaldos, cada fila tiene su botón **"Restaurar"** (un clic y listo). También puedes usar **"Importar respaldo"** para traer un archivo `.db` externo: de una USB, o descargado de Google Drive.
3. La app revisa el archivo, crea el respaldo de **pre-restauración** por si acaso, sobreescribe la base actual y limpia los archivos auxiliares WAL/SHM.
4. Reinicia la app.

> ⚠️ **Restaurar reemplaza TODA la base, no la mezcla.** Lo que hayas capturado después de la fecha de ese respaldo se pierde. Por eso existe el pre-restauración: si te equivocaste de archivo, restaura el `prestamos-pre-restore-...` más reciente y vuelves al estado anterior.

> 💡 Detalle técnico bueno: el respaldo tiene validación de "magic header" (los primeros bytes dicen `SQLite format 3`), así que si eliges un archivo que no es de base de datos, se rechaza limpiamente sin romper nada.

### Trabajar en dos computadoras (relevo por USB)

Si la laptop principal está siempre ocupada, puedes hacer la toma física (o cualquier captura) en otra PC y luego traerte el trabajo. La app no fusiona dos bases: **restaurar reemplaza la base completa**. Por eso el método es de relevo, como pasarse una estafeta.

> ⚠️ **Regla no negociable: solo una computadora activa a la vez.** Si las dos capturan el mismo día, la última en restaurar borra el trabajo de la otra y no hay forma de recuperarlo salvo el respaldo previo.

**Ida (laptop → PC prestada):**

1. Instala la app en la otra PC (mismo instalador, ver [Instalación](#-instalación-para-usuarios-finales-no-programadores)).
2. En la laptop: **Admin** → Configuración → **"Crear respaldo"** → **"Abrir carpeta"**.
3. Copia el archivo `.db` recién creado a la USB.
4. En la otra PC: **Admin** → Configuración → **"Importar respaldo"** y elige ese `.db`.
5. Reinicia la app. Ya tienes todo el inventario ahí; trabaja normal.

**Vuelta (PC prestada → laptop):**

6. En la otra PC: **"Crear respaldo"** → **"Abrir carpeta"** → copia el `.db` a la USB.
7. En la laptop: **"Importar respaldo"** con ese archivo. Reinicia.

Desde ese momento la laptop vuelve a ser la computadora activa, y la otra PC queda desactualizada: no captures nada más ahí hasta el siguiente relevo.

> 💡 Si las dos computadoras tienen Drive con el correo de la escuela, puedes saltarte la USB: el respaldo aparece solo en Drive y lo descargas en la otra PC. La regla de "una sola computadora activa" sigue siendo igual de obligatoria.

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
| **Diario** | Nada: el **respaldo automático viene activado** y corre cada 12 horas mientras la app esté abierta. Solo verifica de vez en cuando que la app se abra a diario. |
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

El repo tiene el workflow activo `.github/workflows/build-windows.yml`. Cuando publicas un tag con formato `v*` (por ejemplo, `v0.5.2`), **compila la app en un Windows virtual de GitHub** y publica el instalador como **Release público** en la pestaña *Releases*. También se puede ejecutar manualmente con `workflow_dispatch`. Si la compilación falla, GitHub lo marca en rojo. Los pasos completos están en [Versionado y publicación](#-versionado-y-publicación).

---

## 👨‍💻 Para programadores: configurar y compilar

### Stack

- **Frontend**: React 19 + TypeScript + Vite 7 + react-router-dom 7
- **Shell escritorio**: Tauri v2 (Rust, edition 2021)
- **Persistencia**: SQLite local vía `@tauri-apps/plugin-sql` 2.4.0
- **Runtime necesarios**: Node 20+ (la CI compila con Node 20), Rust stable, Bun (opcional, hay `bun.lock`), Windows para generar el instalador

### Requisitos previos

1. **Node.js** 20 o superior → <https://nodejs.org/>
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
├── msi/App Prestamos P15_0.5.1_x64_en-US.msi
└── nsi/App Prestamos P15_0.5.1_x64-setup.exe
```

### Scripts disponibles

| Script | Qué hace |
|---|---|
| `npm run dev` | Vite dev server (puerto 1770). Sin Tauri. |
| `npm run build` | `tsc` + `vite build` → genera `dist/` |
| `npm run preview` | Sirve `dist/` para previsualizar |
| `npm run tauri dev` | Desarrollo completo con Tauri + SQLite |
| `npm run tauri build` | Genera instalador Windows |
| `npm test` | Ejecuta las 7 suites de pruebas de utilidades |
| `npm run test:<área>` | Ejecuta una suite concreta: `backup`, `patrimonio`, `identificadores`, `ficha`, `importacion`, `toma` o `pistola` |

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
├── 📁 .github/ISSUE_TEMPLATE/
│   ├── bug.yml                   ← Formulario "Reportar un problema" (para usuarios)
│   ├── feature.yml               ← Formulario "Sugerir una mejora"
│   └── config.yml                ← Desactiva issues en blanco + enlaces de ayuda
├── 📄 README.md                  ← ESTE ARCHIVO
├── 📄 CHANGELOG.md               ← Qué cambió en cada versión publicada
├── 📄 CONTRIBUTING.md            ← Cómo reportar issues y contribuir código
├── 📄 LICENSE                    ← Uso interno educativo
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
    │   │   ├── useInventory.ts   ← ⭐ EL CORAZÓN DE LA APP (~2 070 líneas)
    │   │   │                        Define el esquema, migraciones, reglas de negocio,
    │   │   │                        y todos los accesos a SQLite.
    │   │   ├── useAutoBackup.ts  ← Respaldo automático: revisa cada 15 min si toca
    │   │   ├── usePistola.ts     ← Dispara el escaneo en un campo de texto
    │   │   └── useEscaneoGlobal.ts ← Escucha la pistola sin campo enfocado (Inventario)
    │   ├── pages/
    │   │   ├── Home.tsx          ← Pantalla con 3 tarjetas (Profesor/Admin/Préstamo Rápido)
    │   │   ├── Kiosk.tsx         ← Flujo del profesor
    │   │   ├── Admin.tsx         ← Panel admin (~2 890 líneas; deuda técnica conocida)
    │   │   └── PrestamoRapido.tsx← Préstamo a alumnos con autenticación simple
    │   ├── components/
    │   │   ├── TomaFisicaPanel.tsx        ← Campañas de conteo físico (pestaña de Admin)
    │   │   ├── ImportarPatrimonioPanel.tsx← Importación del Excel de Patrimonio
    │   │   ├── EquipoFormDialog.tsx       ← Ficha completa de alta/edición de equipo
    │   │   ├── EquipoDetalleModal.tsx     ← Ficha de solo lectura (la que abre el escaneo)
    │   │   ├── RedCelularPanel.tsx        ← Experimento: acceso LAN desde celular
    │   │   └── Icon.tsx                   ← Iconos SVG inline
    │   └── utils/                ← Lógica pura, con pruebas (7 suites)
    │       ├── pistola.ts        ← Distingue la ráfaga del lector de una persona tecleando
    │       ├── tomaFisica.ts     ← Progreso, clasificación del disparo y reporte CSV
    │       ├── backupSchedule.ts ← Cuándo toca el próximo respaldo automático
    │       ├── importacionPatrimonio.ts ← Plan previo de la importación del Excel
    │       ├── codigoPatrimonial.ts     ← Etiqueta de Patrimonio de la UdeG (Code 39)
    │       ├── identificadores.ts       ← Normalización de códigos y series
    │       ├── equipoFicha.ts    ← Armado de la ficha del equipo
    │       ├── confirm.ts        ← Confirmaciones de acciones destructivas
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
    ├── 📁 scripts/               ← UTILITARIOS
    │   ├── publish-release.sh    ← Bump de versión + tag + push (dispara la CI)
    │   ├── test-publish-release.sh
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

**Mi pistola no manda `Enter` al final del código, ¿sirve igual?**
Sí. La app detecta el disparo por la **velocidad** del tecleo, no por el `Enter`. Funciona con la pistola que tengas, salga como salga configurada de fábrica ([detalle](#la-pistola-dispara-sola)).

**¿Puedo practicar la toma de inventario sin arruinar el conteo?**
Sí. Activa **"Modo prueba · no guarda nada"** antes de iniciar la campaña: corre todo el recorrido (sonidos, tarjetas, deshacer) sin escribir nada en la base ([detalle](#-modo-prueba-para-entrenar-sin-miedo)).

**Escaneé una etiqueta y la app no la reconoce, ¿qué hago?**
Ahí mismo, sin salir de la toma física: la ligas a un equipo existente que no tenía etiqueta, o la das de alta como equipo nuevo. Si tienes el aparato en la mano, usa **"Editarlo completo"** y captura marca, modelo y serie en ese momento ([detalle](#-alta-al-vuelo-un-código-que-nadie-reclama)).

**En el reporte de Patrimonio, ¿por qué hay celdas vacías en "Localizado"?**
Porque son tres estados: `S` apareció, `N` se buscó y no estaba, y **vacío** es que nadie llegó todavía a esa área. Una celda vacía NO es una pérdida, es trabajo pendiente ([detalle](#-el-reporte-que-va-a-patrimonio)).

**¿Cómo sé qué me falta por contar en una toma de inventario?**
La columna **"Deberían estar aquí"** lista los equipos pendientes del área actual. Cuando se vacía, terminaste ([guía completa](#-toma-de-inventario-físico)).

**¿Puedo trabajar en otra computadora si la laptop está ocupada?**
Sí, pasándote la base con un USB y con **una sola computadora activa a la vez**: la app no fusiona dos bases, restaurar reemplaza todo ([pasos del relevo](#trabajar-en-dos-computadoras-relevo-por-usb)).

**¿Mi base de datos se borró, qué hago?**
Si tienes respaldo (en `backups/` o en un USB), lo restauras desde Configuración. Si no, **se perdió**. Por eso **RESPALDA SIEMPRE**.

**¿Puedo tener varias computadoras con la app?**
Sí, pero **cada una tiene su base de datos independiente**. No se sincronizan entre sí, ni siquiera
con Drive: Drive sincroniza *archivos de respaldo*, no la base viva. Para mover datos de una a otra
usa "Crear respaldo" y "Restaurar respaldo", con **una sola computadora activa a la vez**
([pasos del relevo](#trabajar-en-dos-computadoras-relevo-por-usb)).

**¿La app manda datos a algún servidor externo?**
La app en sí, no: no tiene telemetría, no manda nada a ningún servidor y funciona sin internet.
Lo único que puede salir de la computadora son los **respaldos**, y solo si tú conectas la carpeta
`backups\` a Google Drive con el correo de la escuela — eso lo hace Drive, no la app
([cómo se configura](#respaldos-en-google-drive-con-el-correo-de-la-escuela)).

**¿Es seguro el PIN por defecto?**
No. **Cámbialo en cuanto entres**, pero ten presente que la versión actual conserva el código `223992647` más el PIN de fábrica como acceso de recuperación incluso después del cambio. Eliminar ese fallback requiere modificar `loginAdmin`; no basta con editar el PIN desde la interfaz.

---

## 🤝 Cómo contribuir

### No programas: reporta (es lo más útil)

¿Encontraste un problema o se te ocurre una mejora? Abre un Issue con formulario guiado:

👉 **[github.com/Leoglez10/app-prestamos-p15/issues/new/choose](https://github.com/Leoglez10/app-prestamos-p15/issues/new/choose)**

Hay dos formularios, y llenarlos es como responder un cuestionario:

| Formulario | Cuándo usarlo |
|---|---|
| 🐛 **Reportar un problema** | La app hizo algo raro, se trabó, o no hizo lo que esperabas |
| 💡 **Sugerir una mejora** | Te gustaría que la app hiciera algo que todavía no hace |

> 💡 Los Issues son el **soporte técnico** de la aplicación: cualquiera con cuenta de GitHub puede abrir uno, sin que le den acceso al repo. El mantenedor lo revisa y la corrección sale en una versión futura.

### Sí programas: Pull Request

El flujo completo (fork → clonar → rama → cambiar → commit → push → PR) está detallado en **[CONTRIBUTING.md](CONTRIBUTING.md)**. En corto:

1. Clona el repo.
2. Crea una branch: `git checkout -b feat/mi-cambio`.
3. Haz commits claros: `feat: agregué exportación a Excel`.
4. Verifica que compile: `npm run tauri build` (o al menos `npx tsc --noEmit`).
5. Abre un Pull Request explicando qué hiciste y por qué.
6. Espera revisión. Si hay comentarios, ajusta y vuelve a push.

> 📚 Antes de tocar cosas grandes, lee `docs/ENGINEERING_HANDBOOK.md`. Hay deudas técnicas documentadas (archivos `-LeoLaptop.*`, monolito en `Admin.tsx`, mezcla en `useInventory.ts`).

---

## 🏷 Versionado y publicación

Usamos versionado semántico `MAYOR.MENOR.PARCHE`. La versión actual es **0.5.1**.

- **PARCHE** (0.5.**0** → 0.5.1): bugfixes, sin cambios de comportamiento.
- **MENOR** (0.**4**.0 → 0.5.0): nuevas funciones, sin romper lo viejo.
- **MAYOR** (**0**.5.0 → 1.0.0): cambios que pueden romper compatibilidad (requieren migración).

> ✅ La versión debe coincidir en `package.json`, `src-tauri/tauri.conf.json` y `src-tauri/Cargo.toml`. El script de release las sincroniza solo.

📋 Qué cambió en cada versión: **[CHANGELOG.md](CHANGELOG.md)**

### Publicar una versión nueva

Todo el release es automático: **tú creas el tag, la CI compila e instala el instalador en Releases.**

```bash
cd app-prestamos-p15

# 1. Valida antes de publicar
npx tsc --noEmit && npm test

# 2. Bump + commit + tag + push (todo en uno)
bash scripts/publish-release.sh 0.5.2
```

El script (`scripts/publish-release.sh`):

1. Lee la versión actual de `src-tauri/tauri.conf.json`.
2. Escribe la nueva y la **sincroniza** en `package.json`, `Cargo.toml` y `Cargo.lock`.
3. Verifica que el árbol esté limpio y que `HEAD` ya esté en `origin/main`. Si no, aborta.
4. Commitea `release: vX.Y.Z`, crea el tag `vX.Y.Z` y lo empuja.
5. Si algo falla, **revierte el bump** para no dejar las versiones descuadradas.

> ⚠️ Necesitas `jq` instalado (`brew install jq` en Mac, `apt install jq` en Linux).

Sin argumento (`bash scripts/publish-release.sh`) solo taguea la versión que ya está en `tauri.conf.json`, sin bump.

### Qué hace la CI cuando ve el tag

El workflow **`.github/workflows/build-windows.yml`** se dispara con tags `v*` (o a mano con *Run workflow*):

1. Levanta un runner de Windows con Node 20, Rust stable y Bun.
2. `npm ci` dentro de `app-prestamos-p15/`.
3. `tauri-action` compila para `x86_64-pc-windows-msvc`.
4. Publica un **Release público** con el `.exe` y el `.msi` adjuntos.

Si la compilación falla, el badge de arriba se pone rojo y no se publica nada.

> 💡 En este repo también existe la skill de proyecto `/release`, que hace este mismo recorrido paso a paso con las validaciones incluidas.

---

## 📚 Documentación relacionada

| Doc | Para qué sirve |
|---|---|
| [docs/MANUAL_PERSONAL.md](app-prestamos-p15/docs/MANUAL_PERSONAL.md) | **Manual operativo completo** para el personal; cada Release adjunta la misma versión en PDF |
| [docs/ENGINEERING_HANDBOOK.md](app-prestamos-p15/docs/ENGINEERING_HANDBOOK.md) | **Guía maestra** para mantener el código |
| [docs/INVENTARIO_PATRIMONIO.md](app-prestamos-p15/docs/INVENTARIO_PATRIMONIO.md) | Formato y reglas del Excel de Patrimonio |
| [docs/PLAN_IMPORTACION_PATRIMONIO.md](app-prestamos-p15/docs/PLAN_IMPORTACION_PATRIMONIO.md) | Diseño técnico de la importación |
| [docs/RELEVO_TOMA_FISICA.md](app-prestamos-p15/docs/RELEVO_TOMA_FISICA.md) | Toma física en dos computadoras: qué fusiona y qué no |
| [docs/QR_CELULAR.md](app-prestamos-p15/docs/QR_CELULAR.md) | Experimento: acceso desde celular por LAN |
| [docs/REPO_CLEANUP.md](app-prestamos-p15/docs/REPO_CLEANUP.md) | Qué carpetas borrar/archivar |
| [docs/sqlite-backup-restore-guide.md](app-prestamos-p15/docs/sqlite-backup-restore-guide.md) | Backup/restore con scripts Python |
| [docs/postgres-restore-guide.md](app-prestamos-p15/docs/postgres-restore-guide.md) | Migrar desde un Postgres legacy |
| [docs/SERVIDOR.md](app-prestamos-p15/docs/SERVIDOR.md) | Notas sobre alojar los datos en un servidor (exploración) |
| [docs/ROADMAP.md](app-prestamos-p15/docs/ROADMAP.md) | Rumbo del proyecto y pendientes |
| [CHANGELOG.md](CHANGELOG.md) | Qué cambió en cada versión publicada |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Cómo reportar problemas y contribuir código |
| [README_INSTALACION.md](README_INSTALACION.md) | Instalación y actualización manual |

---

## ⚖️ Licencia y uso

Proyecto de **uso interno educativo** para la Preparatoria 15 (UDG). Ver **[LICENSE](LICENSE)**.

En corto: cualquier institución educativa puede usarlo, instalarlo, estudiarlo y adaptarlo sin costo, conservando el crédito al autor. **No** se puede vender ni distribuir como parte de un producto comercial. El software se entrega sin garantía: mantener los respaldos vigentes es responsabilidad de quien lo opera.

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

> 📬 ¿Encontraste un bug o tienes una mejora? Abre un [Issue con formulario](https://github.com/Leoglez10/app-prestamos-p15/issues/new/choose) (cualquiera puede) o manda un Pull Request — guía en [CONTRIBUTING.md](CONTRIBUTING.md).

---

<div align="center">

**¿Dudas?** [Dudas frecuentes](#-dudas-frecuentes) · [Respaldo y recuperación](#-respaldo-y-recuperación-importante) · [Handbook de ingeniería](app-prestamos-p15/docs/ENGINEERING_HANDBOOK.md)

Hecho con 💙 para la comunidad de la **Preparatoria 15** — *respalda siempre* 💾

</div>
