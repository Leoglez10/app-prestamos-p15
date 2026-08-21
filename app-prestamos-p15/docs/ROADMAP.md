# Roadmap — Préstamos P15

Estado de las funciones planeadas, con el costo real de cada una y las decisiones
técnicas que ya se tomaron.

**Fecha de este documento:** 2026-08-20

> ## ⛔ DECISIÓN PENDIENTE — bloquea trabajo
>
> **Faltan definir los campos nuevos del inventario** (marca, modelo, número de
> serie, ubicación, etc.). Ver [punto 4](#4-campos-nuevos-de-inventario-marca-número-de-serie-etc--pendiente-de-definición).
>
> Mientras no estén definidos, **no se debe empezar** la importación de Excel/CSV
> (punto 6) ni la generación de etiquetas de código de barras (punto 5). Ambos
> dependen del esquema final de `inventario`, y cada columna que se agregue después
> obliga a rehacer el trabajo.

---

## Contexto: la restricción que manda sobre todo

Hoy la aplicación es de **escritorio (Tauri 2)** y la base de datos es un **archivo
SQLite local** (`prestamos.db` dentro del directorio de configuración de la app).

Eso significa que:

- Los datos viven en **una sola máquina**. No hay forma de que otro equipo o un
  celular lean el mismo inventario sin cambiar la arquitectura.
- Si esa máquina falla, se pierde el inventario completo. Por eso los **respaldos
  son la prioridad número uno**, antes que cualquier función nueva.

Cualquier requerimiento que involucre celular, varios usuarios simultáneos o un
servidor central implica mover la base de datos a un lugar compartido. Eso es una
re-arquitectura, no una función más.

---

## 1. Respaldos automáticos — IMPLEMENTADO

**Estado:** listo.

Lo que hace:

- Copia automática de la base cada N horas (configurable desde Admin → Respaldos).
  Se verifica al abrir la app y cada 15 minutos mientras está abierta, así que un
  equipo tipo kiosco que nunca se reinicia también genera respaldos.
- Nombre de archivo con **fecha y hora local legible**:
  `prestamos-auto-2026-08-20_14-30-05.db` (automático) y
  `prestamos-backup-2026-08-20_14-30-05.db` (manual).
- Botón **"Abrir carpeta"** en Admin, que abre el explorador de archivos
  directamente en la carpeta de respaldos. Desde ahí se copia a una USB, a Drive o
  a donde haga falta.
- Retención: se conservan los **últimos 20 respaldos automáticos**. Los respaldos
  manuales y los de seguridad previos a una restauración (`prestamos-pre-restore-*`)
  **nunca se borran solos**, porque son intencionales del usuario.

Detalle técnico importante: SQLite usa **WAL (Write-Ahead Logging)**. Copiar solo
`prestamos.db` sin más deja fuera las transacciones que todavía están en el archivo
`-wal`, o sea que el respaldo pierde los movimientos más recientes. Por eso antes de
cada copia se ejecuta `PRAGMA wal_checkpoint(TRUNCATE)`, que vuelca el WAL al archivo
principal. Esto también aplica al respaldo manual.

Archivos: `src-tauri/src/lib.rs`, `src/hooks/useAutoBackup.ts`,
`src/utils/backupSchedule.ts`, `src/hooks/useInventory.ts`, `src/pages/Admin.tsx`.

Las reglas de "cuándo toca respaldar" viven aisladas en `src/utils/backupSchedule.ts`
(sin React ni Tauri) para poder verificarlas con `npm run test:backup`, que usa el
runner incluido en Node (`node --test`). No se agregó ningún framework de pruebas.

---

## 2. Paleta de comandos dentro de la app — PENDIENTE

**Costo:** bajo (días). No toca la base de datos ni el backend.

Un atajo `Ctrl+K` que abre una barra de búsqueda con acciones escritas:
`prestar proyector a Juan`, `devolver LAT-001`, `ir a inventario`.

Es puro frontend: un componente con un input, una lista de comandos registrados y
un filtro por texto. No requiere dependencias nuevas.

Punto a definir antes de construir: **qué comandos** valen la pena. Una paleta con
40 acciones que nadie usa es peor que no tenerla. Empezar con 5 o 6 reales.

---

## 3. Recordatorios en la app — PENDIENTE

**Costo:** bajo si son locales, medio si tienen que sonar con la app cerrada.

Versión barata (recomendada para empezar): al abrir la app y cada cierto tiempo,
revisar préstamos vencidos y mostrar un badge o panel de avisos. Es una consulta
SQL más un componente. Cero infraestructura.

Versión cara: notificaciones del sistema operativo con la app cerrada. Requiere
`tauri-plugin-notification` y un proceso en segundo plano. **No hacer todavía** —
primero validar que la versión barata resuelve el problema real.

---

## 4. Campos nuevos de inventario (marca, número de serie, etc.) — PENDIENTE DE DEFINICIÓN

> ### ⛔ FALTA DEFINIR QUÉ CAMPOS ENTRAN
>
> Este es el bloqueo activo del proyecto. **No se puede escribir código de este
> punto, ni del 5 (etiquetas), ni del 6 (Excel) hasta que la lista esté cerrada.**

**Costo:** bajo-medio, una vez definido.

Implica migración de la tabla `inventario` (`ALTER TABLE ... ADD COLUMN`) más los
campos correspondientes en los formularios de Admin.

**Por qué bloquea a los puntos 5 y 6:** no tiene sentido construir la importación
ni las etiquetas contra un esquema que todavía va a cambiar. Cada columna nueva
rompe la plantilla de Excel, obliga a rehacer el mapeo y a re-imprimir etiquetas.
Definir primero, construir después.

### Candidatos a evaluar

Marcar cada uno como **entra** / **no entra**, y si entra, si es obligatorio:

| Campo | ¿Entra? | ¿Obligatorio? | Nota |
| --- | --- | --- | --- |
| Marca | ? | ? | Dell, HP, Epson... |
| Modelo | ? | ? | |
| Número de serie | ? | ? | Ojo: ¿único? Si es único, sirve como identificador para el código de barras |
| Fecha de adquisición | ? | ? | Útil para reportes de antigüedad |
| Proveedor | ? | ? | ¿Hace falta o alcanza con el historial de compra en papel? |
| Estado físico | ? | ? | ¿Texto libre o lista cerrada (bueno / regular / dañado)? |
| Ubicación / aula | ? | ? | ¿Un objeto tiene ubicación fija o cambia? |
| Número de inventario oficial de la prepa | ? | ? | Si la escuela ya etiqueta sus bienes, conviene guardarlo |
| Observaciones | ? | ? | Texto libre |

### Preguntas que hay que responder antes de decidir

1. ¿Cuáles de estos campos **realmente se van a llenar**? Un campo que queda vacío
   en el 90% de los registros es ruido en el formulario y en los reportes.
2. ¿El número de serie es **único** por objeto? Eso define si se usa como código
   de barras o si hay que generar un identificador propio.
3. ¿Hay objetos que se manejan **por cantidad** en vez de por unidad (cables,
   adaptadores)? Esos no tienen número de serie individual y el modelo tiene que
   contemplarlo.
4. ¿La ubicación es fija o cambia con los préstamos? Si cambia, no es un campo del
   objeto sino parte del historial.

**Estado: esperando respuesta del usuario.**

---

## 5. Pistola de código de barras — PENDIENTE (falta el hardware)

**Costo:** muy bajo. Esta es la mejor relación beneficio/esfuerzo de toda la lista.

**Cómo funciona realmente una pistola de barras:** se comporta como un **teclado
USB** (modo HID). Escanea, "teclea" los dígitos del código y manda un `Enter`. No
hace falta driver, ni librería, ni SDK, ni permiso especial de Tauri.

Lo que hay que hacer del lado del software:

1. Un `<input>` con foco automático en la pantalla de préstamo/devolución.
2. Escuchar el `Enter` (o el evento `change`) y buscar el código en `inventario`
   por la columna `identificador`.
3. Si existe, agregarlo al carrito o marcarlo devuelto. Si no existe, mostrar el
   error sin perder el foco, para poder seguir escaneando.

Truco útil: la mayoría de las pistolas se pueden configurar (escaneando códigos
del manual) para agregar un prefijo, por ejemplo `#`. Eso permite distinguir un
escaneo de alguien tecleando a mano, y capturarlo globalmente sin necesidad de
que el input tenga el foco.

**El trabajo real no es el software, es el trabajo físico:** hay que imprimir y
pegar una etiqueta con código de barras en cada objeto del inventario. Eso es lo
que va a tomar tiempo, no la programación. Conviene generar las etiquetas desde
la propia app (una vista imprimible con el `identificador` de cada equipo) para no
depender de un programa externo.

Recomendación de compra: cualquier lector **USB HID de códigos 1D (Code 128)** de
gama baja sirve. No hace falta Bluetooth, ni 2D/QR, ni inalámbrico, salvo que se
quiera escanear lejos de la computadora.

---

## 6. Importar / exportar Excel — PENDIENTE (bloqueado por el punto 4)

**Costo:** medio.

Decisión pendiente antes de escribir código: **¿CSV o `.xlsx`?**

- **CSV** se parsea en unas 30 líneas sin dependencias, y Excel lo exporta de
  forma nativa. Es la opción barata.
- **`.xlsx`** requiere la crate `calamine` del lado de Rust. Funciona bien y es la
  librería estándar para esto, pero es más trabajo y más superficie de error.

Recomendación: empezar con CSV. Si el personal se traba con el formato, migrar a
`calamine` después — el resto del código (validación e inserción) se reutiliza tal
cual.

**Regla que no se debe romper:** la app define **una plantilla fija** de columnas y
el usuario llena esa plantilla. Aceptar "cualquier Excel" significa mantener
mapeos de columnas para siempre y arreglar importaciones rotas de por vida.

La importación debe además:

- Validar fila por fila antes de insertar nada.
- Reportar los errores con número de fila.
- Correr dentro de una transacción: o entra todo, o no entra nada.
- Crear un respaldo automático **antes** de importar.

---

## 7. Respaldo en Drive de la cuenta escolar — PENDIENTE

**Costo:** bajo o alto, según el camino que se elija. La diferencia es enorme.

### Camino A — carpeta sincronizada (RECOMENDADO)

Se instala **Google Drive para Escritorio** en la máquina y la app escribe una
copia del respaldo en una carpeta espejo configurable (por ejemplo
`G:\Mi unidad\respaldos-p15\`). Drive la sube solo.

- Trabajo de programación: un campo de configuración con la ruta y un `fs::copy`
  extra después de cada respaldo. Prácticamente nada.
- Cero código de Google, cero OAuth, cero tokens.

### Camino B — OAuth contra la API de Google Drive

Requiere registrar un proyecto en Google Cloud, configurar la pantalla de
consentimiento, manejar tokens de acceso y de refresco, y almacenarlos de forma
segura.

Además hay un riesgo que no depende de nosotros: muchas cuentas de **Google
Workspace for Education tienen bloqueadas las aplicaciones de terceros por
política del administrador**. Se puede construir todo y que el área de TI de la
prepa no lo autorice.

**Decisión: camino A.** Misma funcionalidad práctica, una fracción del trabajo y
sin depender de un permiso administrativo.

---

## 8. Servidor en la prepa + celular + QR — PENDIENTE (el proyecto grande)

> 📄 **Guía completa paso a paso: [SERVIDOR.md](./SERVIDOR.md)** — de cero a
> funcionando, con la implementación concreta sobre esta app, checklist y glosario.

> 📱 **Decisiones de QR y celular: [QR_CELULAR.md](./QR_CELULAR.md)** — qué se midió
> en la red de la prepa, por qué el QR impreso no lleva la dirección adentro, las
> opciones descartadas y cómo borrar el experimento que ya está en Admin.

**Costo:** alto. Estos tres requerimientos son **un solo proyecto**, no tres.

### Por qué van juntos

Un código QR es **solo texto**. Por sí mismo no puede escribir nada en una base de
datos. Un QR pegado en un objeto únicamente sirve si apunta a una dirección que
existe y que puede recibir datos. Sin servidor, el QR no tiene a dónde apuntar.

### Arquitectura propuesta

1. Una máquina en la prepa (una mini PC, o una computadora vieja con Linux) corre
   la base de datos y una API.
2. La app de escritorio **deja de leer el archivo SQLite local** y pasa a hablar
   con esa API por HTTP. Este es el cambio grande: hay que reescribir la capa de
   datos (`src/hooks/useInventory.ts`) entera.
3. Para el celular: **no se compila una app de Android**. Se sirve una página web
   desde el mismo servidor. El celular abre `http://192.168.x.x:3000`, escanea el
   QR del objeto y lo agrega. Sin instalar nada, sin Play Store, sin firmar APKs.
4. Funciona **solo dentro de la red wifi de la escuela**. Exponerlo a internet
   abre otro frente completo (dominio, HTTPS, autenticación seria, exposición a
   ataques) y no se recomienda por ahora.

### Qué hay que aprender de servidores

Menos de lo que parece, pero no es cero:

- Instalar Linux (Ubuntu Server sirve).
- Entrar por SSH.
- Dejar el proceso corriendo con `systemd`, para que reviva solo si se cae o si se
  va la luz.
- Asignar una IP fija en la red de la escuela (esto hay que pedirlo al área de
  redes de la prepa).

Estimación honesta: un fin de semana para dejarlo funcionando, más mantenimiento
ocasional.

### El riesgo que se subestima

**Si ese servidor se muere, la prepa entera se queda sin inventario.** Pasar de
"un archivo en una computadora" a "un servicio central" concentra el riesgo. Por
eso los respaldos (punto 1) van **antes** que esto, no después. Y el servidor va a
necesitar su propio esquema de respaldo automático, además de un plan de qué hacer
mientras esté caído.

### Alternativa intermedia, si el servidor se complica

Existe una opción más barata: una base de datos gestionada en la nube (Supabase,
Turso) en lugar de un servidor propio. Elimina todo el trabajo de administración
de sistemas, pero introduce dependencia de internet y de un proveedor externo. Se
puede evaluar si el servidor físico resulta inviable.

---

## Orden de trabajo recomendado

1. ~~Respaldos automáticos~~ — **hecho**
2. **⛔ Campos nuevos de inventario (marca, serie, etc.) — BLOQUEADO: falta definir
   la lista de campos. Ver punto 4.**
3. Paleta de comandos
4. Recordatorios locales
5. Respaldo espejo en carpeta de Drive
6. Pistola de barras (cuando llegue el hardware) + generación de etiquetas
7. Importación CSV/Excel
8. Servidor + celular + QR

Los primeros cinco puntos entregan la mayor parte de la ganancia de velocidad sin
tocar la arquitectura. El servidor es el único que obliga a reescribir cómo la app
accede a los datos, y no conviene empezarlo antes de tener el esquema de inventario
definitivo: migrar una base en un servidor duele mucho más que migrar un archivo
local.
