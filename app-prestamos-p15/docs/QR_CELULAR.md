# Acceso desde celular con QR

Estado: **experimento**. Hay un panel funcionando en Admin → Configuración, pero
todavía no existe el servidor al que apunta. Este documento explica qué se midió,
qué se decidió, qué opciones quedaron descartadas y **cómo borrar todo** si nos
arrepentimos.

Contexto largo del proyecto: `docs/SERVIDOR.md` y `docs/ROADMAP.md` §8.

> ### ⚠️ El escáner del celular se borró el 2026-08-25
>
> **El QR de acceso de este documento sigue vivo y es lo que se describe abajo:**
> el que se muestra en Admin → Configuración para abrir la app en el teléfono y
> vincular el dispositivo. Ese no se tocó, y por eso `qrcode-generator` sigue
> instalada.
>
> **Lo que sí murió es la etiqueta de equipo `P15-<id>` y el lector que la leía.**
> Nunca se imprimió una sola etiqueta y no se va a imprimir: el inventario ya
> viene etiquetado por la UdeG con código de barras 1D, y se lee con una pistola
> USB. Quedó un solo tipo de código en todo el sistema.
>
> **Todo lo que este documento diga sobre `jsQR`, `/jsqr.js`, `GUION_ESCANEO`,
> `src-tauri/assets/jsqr.js` o el visor de cámara ya no existe en el código** —
> vale como historia de diseño, no como referencia. La ficha `GET /equipo/<id>`
> sí sobrevive: ahora se llega desde la lista de inventario del teléfono.
>
> Ver [`PLAN_IMPORTACION_PATRIMONIO.md`](PLAN_IMPORTACION_PATRIMONIO.md) §7 y
> [`INVENTARIO_PATRIMONIO.md`](INVENTARIO_PATRIMONIO.md).

---

## 1. Lo que se midió en la red de la prepa

Pruebas hechas el 2026-08-21 con `python3 -m http.server 8080` en la Mac y un
celular en el mismo WiFi. No son suposiciones, son resultados.

| Qué se probó | Resultado |
|---|---|
| ¿El celular alcanza la Mac por HTTP? | **Sí.** El log del servidor registró `GET / 200` desde el celular. |
| ¿Hay aislamiento de clientes en el WiFi? | **No.** Si lo hubiera, el proyecto entero era inviable. |
| ¿Están en la misma subred? | **No.** Mac en `10.214.190.53`, celular en `10.214.118.217`. El tráfico cruza un router de la escuela. |
| ¿Funciona el nombre `.local` (mDNS)? | **No.** mDNS es multicast link-local y no se rutea entre subredes. No hay reflector Bonjour. |
| ¿Hay contacto con quien administra la red? | **No.** Sin reservación DHCP, la dirección de la Mac puede cambiar. |

Para repetir la prueba algún día:

```sh
mkdir -p /tmp/qrtest && echo "FUNCIONA" > /tmp/qrtest/index.html
ipconfig getifaddr en0          # dirección de la Mac
cd /tmp/qrtest && python3 -m http.server 8080
```

Desde el celular, con datos móviles apagados, abrir `http://<esa-direccion>:8080`.
Debe verse la palabra FUNCIONA. Escribir `http://` a mano: si no, el navegador
intenta HTTPS y falla por un motivo que no tiene nada que ver con la red.

> **Ya no hace falta ese servidor de prueba.** Desde que la app escucha en el
> 8080 por su cuenta, lanzar `python3 -m http.server 8080` **choca** con ella
> (`OSError: [Errno 48] Address already in use`). El panel de administración
> ahora trae un indicador propio: punto verde si el servidor responde. Estas
> instrucciones quedan solo por si algún día hay que aislar un problema de red
> del código.
>
> Si lo usas igual, el `cd` no es opcional: lanzado desde la carpeta del
> proyecto sirve el `index.html` de Vite, el celular baja TypeScript sin
> compilar y **se ve una pantalla en blanco aunque la red esté perfecta**. Ese
> error ya costó dos diagnósticos falsos. Blanco sin mensaje de error significa
> que la conexión sí llegó; un bloqueo de red da "No se puede acceder al sitio".

---

## 2. Las dos restricciones que mandan el diseño

**La dirección es volátil.** Sin reservación DHCP, la Mac puede recibir otra
dirección. Cualquier cosa impresa que contenga la dirección se vuelve basura ese
día. Con cientos de etiquetas pegadas en equipos, reimprimir no es una opción.

Esto no es teórico: el 2026-08-21, **en una sola sesión de trabajo**, la
dirección de la Mac pasó de `10.214.190.53` a `10.15.30.10` sin que nadie
tocara nada. Si hubiera estado impresa, ese lote de etiquetas ya sería basura.

**No se puede abrir la cámara desde la página web.** `getUserMedia` exige
contexto seguro: solo HTTPS o localhost. Una dirección privada por HTTP plano no
califica, así que el navegador del celular bloquea la cámara antes de preguntarle
nada al profesor. Pasa igual en Android y en iPhone. Esto invalida cualquier
lector de QR en vivo dentro de la página, incluido `BarcodeDetector`.

---

## 3. Decisión tomada

**El QR impreso no lleva la dirección adentro.** La etiqueta pegada en el equipo
contiene solo su identificador (`EQ-0042`), texto plano, sin `http` ni dirección.

**La dirección se entrega por un QR en pantalla**, generado en vivo dentro de
Admin con la dirección vigente. El profesor lo escanea una vez con la cámara
nativa y guarda el marcador. Si la dirección cambia, ese QR ya salió actualizado
solo: vuelve a escanearlo y listo.

Dos QR con trabajos distintos:

| | Qué contiene | Dónde vive | Cambia? |
|---|---|---|---|
| QR de equipo | `EQ-0042` | Etiqueta pegada al objeto | Nunca |
| QR de dirección | `http://10.214.190.53:8080` | Pantalla de Admin | Solo cuando cambia la red |

La idea de fondo: lo volátil vive donde es barato reponerlo. Reponer un marcador
es un mensaje al grupo de WhatsApp. Reponer doscientas etiquetas son días.

**Para escanear desde el celular** se usa `<input type="file" accept="image/*"
capture="environment">` y se decodifica la foto con `jsQR`. Es un file input: no
pide permiso de cámara y no exige contexto seguro, así que funciona sobre HTTP
plano. Cuesta un toque extra frente al escaneo en vivo, y a cambio evita
certificados autofirmados y perfiles de configuración en cada iPhone. Siempre
debe quedar el campo para teclear el identificador a mano.

---

## 4. Opciones que se descartaron

Se dejan escritas con su motivo real. Si la decisión de arriba no gusta, se
vuelve acá y no se rediscute desde cero.

### 4.1 QR apuntando a un nombre `.local` (mDNS)
Lo más limpio: la dirección cambia pero el nombre sigue resolviendo, sin
configurar nada. **Se probó y no funciona**: mDNS no cruza subredes y el celular
está en otra. Revivir solo si algún día la escuela pone un reflector Bonjour o el
celular queda en la misma subred que la Mac.

### 4.2 QR con la dirección impresa directamente en la etiqueta
Lo más simple de programar. Descartado porque el día que cambie la dirección hay
que despegar y reimprimir todas las etiquetas. Aceptable **solo** si algún día se
consigue reservación DHCP, y aun así ata el papel a un detalle de infraestructura.

### 4.3 Dirección estática puesta a mano en la Mac
Elegir una dirección alta fuera del rango de DHCP. Descartado por riesgo: choque
de direcciones con otro equipo, y si el switch tiene port security te saca del
puerto. Tocar una red administrada sin permiso se nota y te la cierran.

### 4.4 Router o punto de acceso propio
Un router barato donde nosotros manejamos el DHCP y damos dirección fija. Los
profesores se conectan a esa red. Funciona incluso sin internet, porque la app es
LAN pura. **No está descartado del todo** — es la mejor salida si algún día la red
de la escuela se pone hostil. Cuesta hardware y que los profesores cambien de WiFi.

### 4.5 Túnel público (ngrok, Cloudflare Tunnel)
Da una dirección estable sin depender de la red local. Descartado: expone el
inventario a internet, muere si se cae la conexión, y contradice el diseño offline
de la app.

### 4.6 Formulario de Google prellenado por el QR
Cero infraestructura: el QR abre un formulario con el equipo ya seleccionado y los
datos caen en una hoja de cálculo. Descartado como solución final porque no es
tiempo real y hay que importar a mano. **Sigue siendo el mejor plan B** si el
servidor se atrasa y hace falta algo funcionando ya.

### 4.7 Aplicación nativa para el celular
Descartado por costo: construir, firmar y distribuir APK/IPA es cuestión de meses.
Una página web servida por la app no requiere que el profesor instale nada.

### 4.8 Lector de código de barras USB
No involucra celulares: el lector se comporta como teclado y escribe el
identificador en el campo del Kiosk. Cero red, cero servidor. **Resuelve un
problema distinto** — escanear rápido en el mostrador, no consultar desde el
celular — así que puede convivir con todo lo de arriba.

---

## 4.bis Autenticación: por qué un token y no el PIN

Solo los administradores van a entrar desde el celular. Existía la tentación de
reusar `profesores.admin_pin`, que es la credencial que ya tienen.

**Se descartó.** Ese PIN también abre el panel de escritorio. Sobre HTTP plano
viaja legible, así que interceptarlo una vez no costaría el acceso del celular:
costaría la aplicación entera. Una credencial que abre dos puertas es una sola
puerta.

Además, `admin_pin` se guarda en texto plano en la base y arranca con un valor
compartido por defecto (`DEFAULT_ADMIN_PIN` en `src/hooks/useInventory.ts`).

En su lugar, cada teléfono recibe **su propio token**:

- 32 bytes aleatorios de `getrandom`, en hexadecimal.
- En la base se guarda **solo su SHA-256**, así que una copia robada de
  `prestamos.db` no entrega accesos usables.
- Se muestra una única vez, dentro del QR de vinculación. No se puede volver a
  consultar: si se pierde, se genera otro y se revoca el anterior.
- Se revoca desde el panel, y el corte es inmediato.
- El PIN de administrador **nunca sale de la computadora**.

La tabla usa `profesor_id`, no un booleano de administrador, así que abrirlo a
profesores el día de mañana no obliga a rehacerla.

### Cómo viaja el token

1. El QR de vinculación contiene `http://<direccion>:8080/?t=<token>`.
2. El teléfono lo escanea y hace esa petición.
3. El servidor valida, responde `302` hacia `/` y manda el token en una cookie
   `HttpOnly; SameSite=Strict`.
4. El teléfono sigue el redirect y a partir de ahí manda la cookie sola.

El token deja de aparecer en la barra de direcciones y en el historial después
del primer salto, y `HttpOnly` lo deja fuera del alcance de cualquier script.
La cookie no lleva `Secure` a propósito: sobre HTTP plano, esa bandera la
anularía.

### Lo que este diseño NO resuelve

Sobre HTTP plano, quien esté en la misma red puede leer el tráfico e
interceptar la cookie. El daño queda acotado a ese teléfono y se corta
revocándolo, pero **no está cifrado**. El arreglo real es HTTPS, y eso exige
certificados que en iPhone obligan a instalar un perfil de configuración. Se
dejó fuera a propósito; está anotado como techo conocido, no como olvido.

Tampoco hay expiración automática: un token vive hasta que alguien lo revoca.

## 5. Qué se implementó hasta ahora

Solo el QR de dirección en pantalla. Sirve para confirmar que el celular alcanza
la máquina, y para no teclear la dirección a mano.

| Archivo | Cambio |
|---|---|
| `src-tauri/src/celular.rs` | Archivo nuevo. Servidor HTTP, tokens, sesiones y las páginas que ve el teléfono. |
| `src-tauri/src/certificado.rs` | Archivo nuevo. Autoridad local y certificado por dirección. |
| `src-tauri/src/lib.rs` | Comando `local_ip`, comando `celular_registrar_dispositivo`, y el arranque de los servidores en `.setup()`. |
| `src-tauri/Cargo.toml` | `tiny_http` (con `ssl-rustls`), `sqlx`, `sha2`, `hex`, `getrandom`, `rcgen`. |
| `src/components/RedCelularPanel.tsx` | Archivo nuevo. El panel de administración. |
| `src/hooks/useInventory.ts` | Tabla `celular_dispositivos` en el esquema, más `getCelularDispositivos` y `revocarCelularDispositivo`. |
| `src/components/EtiquetasQrPanel.tsx` | Archivo nuevo. Hoja de etiquetas imprimible, con vista previa. |
| `src/utils/etiquetaQr.ts` | Archivo nuevo. Formato `P15-<id>`, con `etiquetaQr.test.ts`. |
| `src-tauri/assets/jsqr.js` | jsQR vendorizado, servido al teléfono. |
| `src/pages/Admin.tsx` | Dos imports, un `<RedCelularPanel />` en `ConfiguracionPanel` (que ahora recibe `adminUser`) y un `<EtiquetasQrPanel />` en `InventarioPanel`. Marcados con `EXPERIMENT`. |

`local_ip` averigua la dirección abriendo un socket UDP y "conectándolo" a
`8.8.8.8:80`. UDP no envía nada al conectar: solo le pregunta al sistema
operativo qué interfaz usaría para llegar ahí. No hace falta ningún crate extra
ni que haya internet de verdad, pero sí que exista una ruta por defecto.

Se eligió `tiny_http` sobre `axum` porque unas pocas rutas en una LAN no
justifican el peso de `axum`. Se eligió `sqlx` porque es el mismo driver que ya
usa `tauri-plugin-sql`, así que no entra un segundo SQLite al binario. Se eligió
`qrcode-generator` sobre el paquete `qrcode`, más conocido, porque `qrcode`
arrastra 29 paquetes por traer un CLI que no usamos.

El servidor corre en su propio hilo y **nunca puede tumbar la app**: si no logra
abrir la base o tomar el puerto, lo registra en consola y ese hilo termina.

### Las operaciones

| Ruta | Qué hace |
|---|---|
| `GET /` | Saluda al administrador y lista lo que tiene prestado, con botón de devolver. |
| `GET /equipos` | Catálogo agrupado por categoría, con disponibilidad y botón de prestar. |
| `POST /prestar` | Registra un préstamo. Campo `equipo_id`. |
| `POST /devolver` | Cierra un préstamo. Campo `prestamo_id`. |
| `GET /salud` | Sonda de vida para el panel. Sin autenticar. |

HTML plano con formularios `POST`. Sin JavaScript, sin segunda aplicación de
React. Después de cada operación se responde la pantalla principal con un aviso,
así que no hay estado a medias.

Tres reglas se copiaron de `createPrestamoRapido` y `devolverEquipo` en
`src/hooks/useInventory.ts`. **Si allá cambian, acá también:**

1. **Fechas en hora local**, con formato `YYYY-MM-DD HH:MM:SS`. Los reportes
   ordenan comparando esas cadenas como texto, así que escribir UTC rompería el
   orden de todo el historial. Hay una prueba que lo vigila.
2. **Granel contra único.** Un equipo a granel nunca cambia `inventario.estado`:
   su disponibilidad se calcula restando los préstamos activos de `stock_total`.
   Un equipo único sí pasa a `'prestado'` y vuelve a `'disponible'`.
3. **`es_prestable`** se respeta tanto en el equipo como en su categoría.

Una diferencia deliberada con el código TypeScript: **el préstamo corre dentro de
`BEGIN IMMEDIATE`**. La versión de escritorio consulta el stock y después inserta,
sin transacción; con un solo cliente eso casi nunca falla, pero ahora escriben dos
procesos a la vez y dos personas podían llevarse la última unidad. `IMMEDIATE`
toma el candado de escritura antes de leer, que es lo que hace que la
comprobación de stock signifique algo.

Devolver está acotado a los préstamos de la propia sesión: un teléfono no puede
cerrar el préstamo de otra persona adivinando un id.

### Las etiquetas impresas

El código impreso es `P15-<id>`, donde el id es el de `inventario`. Nunca lleva la
dirección del servidor.

El prefijo no es decoración: permite descartar cualquier QR que la cámara agarre
de casualidad (un enlace, una clave de WiFi) en vez de interpretar basura como un
identificador. El formato vive en `src/utils/etiquetaQr.ts`, con sus pruebas.

> **Está duplicado a propósito, y hay que saberlo.** El lector corre en el
> teléfono, dentro del HTML que sirve `src-tauri/src/celular.rs`, así que la
> misma regla existe en TypeScript y en el JavaScript embebido en Rust. Si el
> prefijo cambia, se cambia en los dos lados.

Se imprimen desde **Inventario → Etiquetas QR**, con vista previa antes de gastar
papel. La hoja respeta el filtro activo: si filtras por categoría, imprimes solo
esa. Se usa corrección de errores `H`, la más alta, para que una etiqueta rayada o
medio despegada se siga leyendo.

### La cámara en vivo, y por qué obliga a montar HTTPS

`getUserMedia` —la única API de cámara que existe en la web— solo funciona en
contexto seguro. Sobre HTTP plano el navegador la bloquea sin siquiera preguntar.
No es algo que se pueda esquivar con código: para tener una cámara embebida en la
página hay que servir HTTPS.

El estorbo es que un certificado va atado a una dirección, y la de esta
computadora cambia sola. Un certificado autofirmado por arranque obligaría a
volver a confiar en él cada vez que cambie la dirección.

La salida son **dos niveles**:

| | Qué es | Cuándo se crea | Dónde vive |
|---|---|---|---|
| Autoridad (CA) | Certificado que firma a los demás | Una sola vez | `ca-p15.pem` y `ca-p15.key`, junto a la base |
| Certificado del servidor | Atado a la dirección de hoy | En cada arranque | Solo en memoria |

El teléfono confía en la **autoridad**, no en la dirección. Cuando la dirección
cambia, el certificado nuevo ya viene firmado por una autoridad en la que el
teléfono ya confía: no hay que reinstalar nada.

Los dos puertos conviven a propósito:

- **8080, plano.** De donde el teléfono baja la autoridad (`/ca.crt`), porque
  todavía no puede confiar en el canal cifrado. También sirve como respaldo por
  foto para un teléfono que no quiera instalar nada.
- **8443, cifrado.** El único donde el navegador deja abrir la cámara. El QR de
  vinculación apunta acá.

`/ca.crt` se sirve sin token a propósito: el certificado público de una autoridad
no es secreto, y el teléfono lo necesita antes de poder hablar por el canal
seguro. **La llave privada nunca se sirve**, y en Unix queda con permisos `600`:
quien la tenga puede firmar certificados en los que el teléfono confía.

> **Instalar esta autoridad es delegar confianza.** Un teléfono que confía en ella
> aceptará cualquier certificado firmado con esa llave. Es la llave de la propia
> computadora, en el propio teléfono, así que el riesgo es acotado — pero si la
> llave se filtra, hay que borrar `ca-p15.*`, dejar que se regenere y quitar la
> vieja de los teléfonos.

#### Un detalle que costaría horas encontrar

rcgen deja por defecto una vigencia de **1975 a 4096**. Una ventana así hace que
un teléfono rechace el certificado sin decir por qué, y el síntoma sería "la
cámara no abre", que no apunta a nada. Ahora la autoridad vale 2020–2040 y el
certificado del servidor unos 360 días. Hay una prueba que lo vigila.

También hace falta que la dirección esté en el **SAN**: los navegadores modernos
ignoran el CommonName por completo.

### El respaldo por foto, cuando no hay certificado instalado

Un teléfono que entra por el canal plano —o que no quiso instalar la autoridad—
no pierde el escaneo: en vez de cámara en vivo se le pide una foto, con
`<input type="file" accept="image/*" capture="environment">`. Ese control abre la
cámara nativa y no exige permiso de cámara ni contexto seguro. La página detecta
sola cuál de los dos caminos ofrecer, mirando `isSecureContext`.

**Decodificar una foto es más frágil que decodificar video**, y hubo que
trabajarlo:

- Se prueban **tres tamaños** (1600, 1000 y 2400 px de lado). Reducir demasiado
  borra una etiqueta que salió chica dentro del encuadre; no reducir nada hace que
  jsQR tarde demasiado en una foto de 12 megapíxeles. Antes se reducía a 1000 px y
  nada más, y por eso fallaba con etiquetas lejanas.
- Se usa `inversionAttempts: 'attemptBoth'`. jsQR asume código oscuro sobre fondo
  claro; la pasada invertida rescata las fotos a contraluz.

El lector en vivo revisa cada cuadro a 640 px, que alcanza de sobra para un QR y
deja el bucle fluido en un teléfono modesto.

**jsQR** se sirve desde `/jsqr.js`, vendorizado en `src-tauri/assets/jsqr.js` y
metido al binario con `include_str!` en lugar de leerse de `node_modules` en
tiempo de build: así `cargo build` no depende de que alguien haya corrido
`npm install`. Va con `Cache-Control: immutable`, así que el teléfono lo baja una
sola vez.

Escanear no presta directamente: lleva a la ficha del equipo (`GET /equipo/<id>`),
donde se ve el nombre y la disponibilidad antes de confirmar. Un escaneo
equivocado no crea un préstamo.

### El aspecto del teléfono

Las páginas que sirve Rust usan los mismos tokens que `src/App.css` —`#2563EB`,
`#F0F4F8`, radios 20/16/12, la pila `Bahnschrift → Trebuchet MS`— para que el
teléfono se vea parte de la misma aplicación. **Si allá cambian los tokens, acá
también.**

Tres decisiones que no son cosméticas:

- **Fechas legibles.** `fecha_legible` convierte `2026-08-21 15:24:07` en
  "hace 20 min", "ayer, 7:28 p.m." o "17 ago". Un formato inesperado se muestra
  en crudo: inventar una fecha sería peor.
- **Distintivo en la lista.** Dos préstamos del mismo equipo se veían idénticos
  y no había forma de saber cuál devolver. Ahora cada uno lleva su identificador
  (`LAT-001`), o su categoría cuando no tiene.
- **`[hidden] { display: none !important; }`.** Sin el `!important`, el
  `display: inline-flex` de `.boton` le gana al `display: none` que el navegador
  aplica por el atributo `hidden`, y el botón se pinta igual. Costó un botón
  duplicado en pantalla antes de verlo.

Cuidado al editar estas cadenas: en Rust, la barra de continuación de línea se
come el salto **y los espacios** de la línea siguiente. Un `el\` seguido de
`<a href=…>` produce `elcertificado`.

### La devolución con condición

`GET /devolver/<id>` pregunta cómo regresa el equipo: **Bien**, **Con detalle** o
**Dañado**, más una nota opcional. "Bien" viene marcado, así que el caso común se
confirma de un toque.

Dañado manda el equipo a `mantenimiento`, no a `disponible`: deja de ofrecerse
hasta que alguien lo revise. Un equipo a granel no lleva estado propio, así que
ahí no aplica.

> **`condicion_regreso` es texto libre, no un catálogo.** El escritorio escribe
> ahí frases completas (`"Devuelto por Admin"` desde Admin, `""` desde el Kiosk)
> y los reportes lo imprimen tal cual. Por eso el teléfono guarda la **etiqueta
> legible** (`"Con detalle"`), no la clave del formulario (`detalle`): guardar la
> clave haría que el PDF dijera "danado". Si algún día se quiere un catálogo de
> verdad, hay que unificar los tres lugares que escriben esa columna.

La ruta solo ofrece préstamos de la propia sesión; un id ajeno o ya devuelto
regresa a la pantalla principal con un aviso.

### Fotos de devolución

Al devolver se puede adjuntar una foto. Va **dentro de la base**, en la tabla
`fotos_regreso`, y esa fue una decisión deliberada:

| | Fotos en disco | Fotos en la base |
|---|---|---|
| Tamaño del respaldo | Chico | Crece con las fotos |
| ¿El respaldo las incluye? | **No** | Sí |
| Restaurar desde una USB | Se pierden las fotos | Vuelve todo |

El respaldo de esta app es **un solo archivo** que se copia a una USB. Guardar
las fotos aparte significaría que restaurar una copia deja los registros sin sus
fotos, sin avisar. Por eso van adentro, y a cambio se las mantiene chicas.

Va en **tabla aparte**, no como columna de `prestamos`: así ninguna consulta de
préstamos arrastra la imagen sin querer.

#### Cómo se mantienen chicas

- El teléfono **reduce antes de subir**: máximo 1024 px de lado, y baja la
  calidad JPEG (0.7 → 0.28) hasta entrar en 400 KB. Si ni al mínimo entra, avisa
  en vez de subir algo que el servidor va a rechazar.
- El servidor vuelve a medir: decodifica el base64 y rechaza lo que pase de
  400 KB o no sea `image/*`. El teléfono es el que reduce; esto es la red de
  seguridad contra un cliente que no lo haga.
- Solo se adjunta cuando hace falta, no en cada devolución.

Se guarda el **data URL completo** como texto, no los bytes: el teléfono ya lo
manda así y un `<img src>` lo consume directo, sin reconvertir de un lado ni del
otro. `plugin-sql` entrega los BLOB como arreglos de números, y reconvertir eso
en TypeScript no valía la pena. Cuesta un 33 % de tamaño frente al binario puro.

La decodificación de base64 está escrita a mano —son 64 símbolos y cuatro
líneas— en lugar de traer un crate.

**La validación ocurre antes de escribir nada.** Si la foto falla, la devolución
no se registra a medias: el préstamo sigue activo y el profesor puede reintentar.

#### En el escritorio

El botón **Ver foto** aparece en Reportes, junto a la condición.

> **Ojo con `r.id` en ese reporte.** La consulta agrupa préstamos
> (`GROUP BY p.equipo_id, p.codigo_profe, …`) y muestra `MIN(p.id)`, así que el
> número de la fila **no es un préstamo concreto**: es el más chico del grupo.
> Buscar la foto por ese id no la encuentra. Por eso la consulta ahora devuelve
> también `GROUP_CONCAT(p.id) AS ids`, y la fila revisa todos los préstamos que
> agrupa. Cualquier otra función que ate algo a un préstamo puntual desde esa
> tabla se va a topar con lo mismo.

Solo se cargan los **ids** que tienen foto al pintar la tabla; la imagen se pide
una por una al abrirla. Traerlas todas serían megabytes que casi nadie mira.

### Verificación hecha

Codificación del QR, comprobada de ida y vuelta: se generó, se pintó en un
buffer de píxeles como llegaría de la cámara y se decodificó con `jsQR`, el
mismo decodificador que usaría el teléfono. También se recortó el QR de una
captura de pantalla real de la app y se decodificó: coincidía con
`ipconfig getifaddr en0`.

Autenticación, probada contra el servidor corriendo:

| Caso | Resultado |
|---|---|
| Sin token | `401` |
| Token inventado en la query | `401` |
| Cookie falsa | `401` |
| Token válido en la query | `302` + `Set-Cookie` con `HttpOnly; SameSite=Strict` |
| Cookie válida | `200`, saluda al administrador por su nombre |
| `ultimo_uso` | Se registra al entrar |
| Después de revocar | `401`, tanto por cookie como por token |

Más cuatro pruebas unitarias en `celular.rs`: longitud y unicidad del token, que
la huella no revele el token y sea estable, extracción del token de la query, y
escapado de HTML en los nombres.

Operaciones, probadas contra el servidor corriendo y contrastadas con la base:

| Caso | Resultado |
|---|---|
| Catálogo | Coincide con el escritorio: extraviado y prestado salen no disponibles, el granel muestra sus unidades |
| Prestar a granel | Fila creada, `estado` sigue `disponible`, disponibles 4 → 3 |
| Prestar equipo único | `estado` pasa a `prestado` |
| Devolver equipo único | `estado` vuelve a `disponible`, con `fecha_retorno` en hora local |
| Equipo único ya prestado | Rechazado con el nombre del equipo |
| Equipo inexistente | Rechazado |
| Formulario sin identificador | Rechazado |
| Devolver un préstamo ajeno | Rechazado, y el préstamo sigue activo |
| **8 peticiones simultáneas por la última unidad** | **Exactamente 1 préstamo creado** |

Etiquetas, probadas de ida y vuelta:

| Caso | Resultado |
|---|---|
| Etiqueta recién impresa | Se lee `P15-42` |
| Foto con sombra despareja y grano | Se lee `P15-42` |
| Las tres etiquetas reales, recortadas de una captura de la app | `P15-1`, `P15-2`, `P15-3`, coinciden con `inventario` |
| `/jsqr.js` | `200`, 256885 bytes, md5 idéntico al archivo en disco, `Cache-Control: immutable` |
| `GET /equipo/3` tras escanear | Muestra "HDMI · 4 disponibles" y el botón de prestar |
| Etiqueta de un equipo inexistente | Aviso, sin romper nada |
| `/jsqr.js` y `/equipo/3` sin token | `401` |

Tres pruebas más en `src/utils/etiquetaQr.test.ts`: simetría del formato,
tolerancia a espacios y minúsculas, y rechazo de cualquier QR ajeno
(`https://…`, `P15-abc`, `P15-0`, `P15-1.5`).

HTTPS y certificados, probados contra el servidor corriendo:

| Caso | Resultado |
|---|---|
| `/ca.crt` por el canal plano | `200`, `application/x-x509-ca-cert` |
| ¿Es una autoridad de verdad? | `CA:TRUE, pathlen:0` |
| Vigencia de la autoridad | 2020–2040, no el 1975–4096 por defecto |
| Vigencia del certificado del servidor | ~360 días |
| Dirección en el SAN | `IP Address:10.15.30.10` |
| Cadena completa | `curl --cacert` da `200` **sin `-k`** |
| **La autoridad tras reiniciar la app** | **Misma huella SHA-256: el teléfono no reinstala** |
| Vinculación sobre HTTPS | `302` + cookie, igual que por el canal plano |
| Página servida por HTTPS | Trae `<video>`, `getUserMedia`, `isSecureContext`, `attemptBoth` |
| Sin token por HTTPS | `401` |

Cuatro pruebas unitarias en `certificado.rs`: la autoridad persiste entre
llamadas mientras el certificado cambia por dirección, el material es PEM válido
con cadena de dos certificados, la llave privada queda en `600`, y la vigencia no
es la de rcgen por defecto.

Interfaz y devolución, probadas contra el servidor y mirando la página
renderizada en un navegador:

| Caso | Resultado |
|---|---|
| Fechas en la lista | "ayer, 7:28 p.m." en vez del formato de la base |
| Dos préstamos del mismo equipo | Se distinguen por `LAT-001` y por categoría |
| Ficha del equipo | Estado, disponibilidad y últimos cuatro movimientos |
| Devolver con "Dañado" | Guarda condición y nota; el equipo pasa a `mantenimiento` y deja de ofrecerse |
| Devolver con "Con detalle" | Guarda `"Con detalle"`, legible en el reporte |
| Condición inválida | Rechazada |
| `/devolver/<id>` ajeno o ya devuelto | Aviso, sin tocar nada |

Fotos, probadas de punta a punta con una imagen JPEG real:

| Caso | Resultado |
|---|---|
| Subir foto al devolver | Guardada; el `md5` de la imagen recuperada es idéntico al original |
| Recuperada desde la base | Se abre como JPEG 900×600 |
| Foto de 585 KB | Rechazada nombrando el límite, **y la devolución no se registró** |
| Adjunto `text/html` | Rechazado |
| Sin foto | Se acepta: el adjunto es opcional |
| Ver foto en Reportes | Se abre en el visor, en la fila correcta |

Dieciocho pruebas unitarias en `celular.rs`, entre ellas base64 con y sin
relleno (incluidos los símbolos 62 y 63, que son los que suelen romperse) y los
tres rechazos del adjunto. token (longitud, unicidad), huella (no
revela el token, es estable), extracción del token de la query, escapado de HTML,
formato de fecha, lectura de campos de formulario, decodificación de
`x-www-form-urlencoded` y ruteo ignorando la query.

> Las pruebas contra el servidor movieron datos reales de la base. Se restauró
> desde `prestamos-auto-2026-08-21_14-10-19.db` y se verificó con `diff` que las
> tablas `prestamos` e `inventario` quedaron idénticas a como estaban.

### Lo que falta

- El QR por equipo en las etiquetas impresas, y el lector con
  `<input capture>` más `jsQR`.
- Observaciones de entrega y condición de regreso: hoy se devuelve siempre con
  `condicion_regreso = 'bien'` y sin notas.
- Prestar varias unidades de un granel en una sola operación.
- HTTPS, si algún día el tráfico legible deja de ser aceptable.
- Expiración automática de tokens.

## 6. Cómo borrar el experimento

Deja el repositorio como estaba.

```sh
# 1. Los archivos propios del experimento
rm src-tauri/src/celular.rs
rm src-tauri/src/certificado.rs
rm src-tauri/assets/jsqr.js
rm src/components/RedCelularPanel.tsx
rm src/components/EtiquetasQrPanel.tsx
rm src/utils/etiquetaQr.ts src/utils/etiquetaQr.test.ts

# 2. Las dependencias
npm rm qrcode-generator
```

3. En `src-tauri/Cargo.toml`, quitar el bloque comentado como
   "Servidor HTTP para el acceso desde celular": `tiny_http`, `sqlx`, `sha2`,
   `hex`, `getrandom` y `rcgen`.

4. En `src-tauri/src/lib.rs`, quitar `mod celular;` y `mod certificado;`, las
   funciones `local_ip` y
   `celular_registrar_dispositivo`, sus dos renglones dentro de
   `invoke_handler` (ojo con la coma del elemento anterior) y el bloque
   `.setup(...)` completo.

5. En `src/pages/Admin.tsx`, quitar los bloques marcados `EXPERIMENT`: los dos
   imports, el `<RedCelularPanel ... />` y el `<EtiquetasQrPanel ... />`.
   Devolver `ConfiguracionPanel` a `function ConfiguracionPanel() {` sin props,
   y su llamada a `<ConfiguracionPanel />`.

6. En `src/hooks/useInventory.ts`, quitar `getCelularDispositivos`,
   `revocarCelularDispositivo`, `getPrestamosConFoto`, `getFotoRegreso`, el tipo
   `CelularDispositivo`, el campo `ids` de `ReportePrestamo` con su
   `GROUP_CONCAT`, y las tablas `celular_dispositivos` y `fotos_regreso` del
   esquema.

7. En `src/pages/Admin.tsx`, quitar de `ReportesPanel` el helper `idConFoto`, el
   estado `conFoto` / `fotoAbierta`, el botón "Ver foto" y el visor. Están
   marcados con `EXPERIMENT`.

Para encontrarlo todo:

```sh
rg "EXPERIMENT|celular|local_ip|RedCelularPanel" src src-tauri/src src-tauri/Cargo.toml
```

**La autoridad queda en disco.** Borrar el código no la quita de los teléfonos que
ya confían en ella. Hay que eliminar `ca-p15.pem` y `ca-p15.key` de la carpeta de
datos de la app, y quitar el certificado a mano en cada teléfono (iPhone: Ajustes
→ General → Perfiles; Android: Ajustes → Seguridad → Credenciales de usuario).

**La tabla `celular_dispositivos` sobrevive en las bases que ya existen.** Quitarla
del esquema evita que se cree de nuevo, pero no la borra donde ya está. Si
molesta, en cada base:

```sh
sqlite3 "$HOME/Library/Application Support/com.p15.prestamos/prestamos.db" \
  "DROP TABLE IF EXISTS celular_dispositivos; DROP TABLE IF EXISTS fotos_regreso;"
```

Después, `npm run build` y `cargo check` dentro de `src-tauri/` deben pasar
limpios. Ningún otro archivo del proyecto depende de estos cambios.
