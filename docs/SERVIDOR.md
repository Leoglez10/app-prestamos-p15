# Guía completa: migrar Préstamos P15 a un servidor en la prepa

De cero a funcionando, incluyendo qué hay que cambiar en **esta** aplicación.

**Fecha:** 2026-08-20
**Estado:** planificación. Nada de esto está implementado todavía.

---

## Índice

1. [Qué vas a tener al final (y qué no)](#1-qué-vas-a-tener-al-final-y-qué-no)
2. [Antes de empezar: ¿de verdad necesitás un servidor?](#2-antes-de-empezar-de-verdad-necesitás-un-servidor)
3. [La arquitectura explicada](#3-la-arquitectura-explicada)
4. [⛔ Bloqueadores: tres cosas que hay que resolver ANTES](#4--bloqueadores-tres-cosas-que-hay-que-resolver-antes)
5. [Decisiones de tecnología (ya tomadas, con el porqué)](#5-decisiones-de-tecnología-ya-tomadas-con-el-porqué)
6. [Qué sobrevive y qué se pierde en la migración](#6-qué-sobrevive-y-qué-se-pierde-en-la-migración)
7. [Dónde vive el código (y por qué son tres lugares)](#7-dónde-vive-el-código-y-por-qué-son-tres-lugares)
8. [¿Una IA dentro del servidor que genere los comandos?](#8-una-ia-dentro-del-servidor-que-genere-los-comandos)
9. [Fase -1 — Practicá primero en tu Mac](#fase--1--practicá-primero-en-tu-mac)
10. [Fase 0 — Permisos y hardware](#fase-0--permisos-y-hardware)
11. [Fase 1 — Montar el servidor](#fase-1--montar-el-servidor)
12. [Fase 2 — La API](#fase-2--la-api)
13. [Fase 3 — Migrar los datos actuales](#fase-3--migrar-los-datos-actuales)
14. [Fase 4 — Adaptar la app de escritorio](#fase-4--adaptar-la-app-de-escritorio)
15. [Fase 5 — La web para celular + QR](#fase-5--la-web-para-celular--qr)
16. [Fase 6 — Respaldos del servidor](#fase-6--respaldos-del-servidor)
17. [Fase 7 — Que sobreviva a los apagones](#fase-7--que-sobreviva-a-los-apagones)
18. [Qué hacer cuando el servidor se caiga](#qué-hacer-cuando-el-servidor-se-caiga)
19. [Checklist completo](#checklist-completo)
20. [Estimación honesta de tiempo](#estimación-honesta-de-tiempo)
21. [Glosario para quien nunca tocó un servidor](#glosario-para-quien-nunca-tocó-un-servidor)

---

## 1. Qué vas a tener al final (y qué no)

### Lo que vas a tener

- Una computadora en la prepa que guarda el inventario y está prendida siempre.
- La app de escritorio funcionando igual que hoy, pero leyendo del servidor. Se
  puede instalar en **varias computadoras** y todas ven lo mismo, al instante.
- Una página web que se abre desde el celular, **sin instalar nada**, conectada al
  mismo inventario.
- Códigos QR pegados en los objetos: se escanean con la cámara del celular y abren
  directo la ficha de ese objeto.

### Lo que NO vas a tener

- **Acceso desde fuera de la escuela.** Todo esto funciona solo dentro de la red
  wifi de la prepa. Salir a internet es otro proyecto entero (dominio, HTTPS,
  seguridad seria) y no se recomienda por ahora.
- **Funcionamiento sin red.** Si el wifi se cae o el servidor se apaga, nadie puede
  prestar ni devolver. Hoy eso no pasa, porque los datos están en la máquina. Este
  es el precio real de centralizar, y hay que tenerlo claro antes de empezar.
- **Cero mantenimiento.** Un servidor es una máquina más que cuidar.

---

## 2. Antes de empezar: ¿de verdad necesitás un servidor?

Pregunta honesta, porque es el proyecto más caro de la lista.

El servidor se justifica **solo** si al menos una de estas es cierta:

- Se necesita prestar o consultar el inventario desde **más de una computadora**.
- Se necesita hacerlo **desde el celular**, caminando por los salones.
- Hay **más de una persona** operando al mismo tiempo.

Si en la práctica todo pasa en una sola máquina de la coordinación, el servidor
no te compra nada y sí te agrega un punto de falla. En ese caso: quedate con la
app como está, y resolvé la velocidad con la pistola de barras y la paleta de
comandos, que cuestan una fracción.

### Hay dos proyectos acá, y conviene no mezclarlos

| | Valor |
| --- | --- |
| **Como necesidad de la prepa** | Medio. Solo se justifica si de verdad hacen falta varias computadoras o el celular |
| **Como proyecto para aprender** | Alto. Saber montar y operar un servidor sirve el resto de la carrera, use o no la prepa el resultado |

Son **decisiones separadas y no hay que tomarlas juntas**. La recomendación:

> **Construilo como laboratorio, no como producción.** Montalo, hacé la API,
> probala, rompela, arreglala. Y no muevas a la prepa hasta que lleve meses
> funcionando sin que nadie dependa de él.

Esto además elimina la presión: un laboratorio que se cae es un martes cualquiera.
Un servidor de producción que se cae es una fila de profesores esperando.

Y hay una consecuencia práctica importante: **no hace falta hardware ni permisos
para empezar.** Ver [Fase -1](#fase--1--practicá-primero-en-tu-mac).

### Alternativa intermedia, por si el servidor se complica

Una base de datos gestionada en la nube (**Turso** o **Supabase**) elimina todo el
trabajo de administración de sistemas: no instalás Linux, no configurás `systemd`,
no te preocupás por apagones. A cambio, dependés de internet y de un proveedor
externo, y los datos de la escuela salen de la escuela — eso hay que consultarlo
con la dirección.

Turso en particular es SQLite gestionado, así que el resto de esta guía aplica casi
igual: cambia la Fase 1 (no montás servidor) y el resto queda.

**Nota de contexto:** en esta escuela ya existió un sistema con PostgreSQL
("Registro de equipos", ver `docs/postgres-restore-guide.md`) y se migró a esta app
de escritorio. Vale la pena averiguar **por qué** se abandonó aquel sistema antes de
volver a montar algo centralizado. Si el motivo fue que nadie podía mantenerlo, ese
mismo riesgo sigue vivo.

---

## 3. La arquitectura explicada

### Cómo está hoy

```
┌─────────────────────────────────────┐
│  Computadora de la coordinación     │
│                                     │
│   App Tauri (React)                 │
│        │                            │
│        │ lee y escribe directo      │
│        ▼                            │
│   prestamos.db  (archivo SQLite)    │
└─────────────────────────────────────┘
```

La app **habla directo con el archivo**. No hay red de por medio. Rápido, simple, y
completamente atado a esa máquina.

### Cómo quedaría

```
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│  PC coordinación │   │  PC laboratorio  │   │  Celular         │
│  App Tauri       │   │  App Tauri       │   │  Navegador       │
└────────┬─────────┘   └────────┬─────────┘   └────────┬─────────┘
         │                      │                      │
         │      red wifi de la escuela (HTTP)          │
         └──────────────────────┼──────────────────────┘
                                ▼
                  ┌───────────────────────────┐
                  │  Servidor de la prepa     │
                  │  192.168.1.50             │
                  │                           │
                  │   API (Node + TypeScript) │
                  │        │                  │
                  │        ▼                  │
                  │   prestamos.db (SQLite)   │
                  └───────────────────────────┘
```

### El cambio conceptual que hay que entender

Hoy la app **es** la base de datos. Mañana la app es un **cliente** que le pide
cosas a otro programa.

Eso tiene una consecuencia que mucha gente descubre tarde y le cuesta caro:

> **Todo lo que corre en el cliente es manipulable.**

Hoy, la validación de que alguien es administrador es una consulta SQL que corre en
el navegador embebido de la app (`loginAdmin` en `src/hooks/useInventory.ts`). En una
app de escritorio local eso es aceptable: el que puede alterar la app ya tenía acceso
físico al archivo de todos modos.

En un servidor **no**. Cualquier persona conectada al wifi de la escuela puede
mandarle peticiones a tu API con cualquier herramienta. Si la API le cree al cliente
cuando dice "soy administrador", entonces cualquier alumno con un celular es
administrador.

Por eso toda la lógica de permisos tiene que **mudarse al servidor**. No es un
detalle opcional. Es el trabajo principal de esta migración.

---

## 4. ⛔ Bloqueadores: tres cosas que hay que resolver ANTES

No empieces a comprar hardware ni a instalar Linux hasta que estos tres estén
resueltos. Cada uno hace inútil el trabajo que venga después.

### Bloqueador 1 — La autenticación no sobrevive a la red

En `src/hooks/useInventory.ts` hay tres problemas que hoy son tolerables y en un
servidor no lo son:

| Qué pasa hoy | Por qué revienta en un servidor |
| --- | --- |
| El PIN de administrador se guarda **en texto plano** en la columna `admin_pin` | Cualquiera que llegue a la base ve todos los PIN. En red, la superficie de ataque es toda la escuela |
| Existe un **PIN maestro fijo en el código** (`DEFAULT_ADMIN_PIN`, con un código especial `223992647`) | El código de la app se distribuye a cada máquina. Un PIN maestro en el binario es un PIN maestro público |
| La validación de admin corre **en el cliente** (una consulta SQL en el frontend) | El cliente puede mentir. La API tiene que decidir, no preguntar |

Qué hay que hacer:

1. **Hashear los PIN** con `bcrypt` o `argon2`. Nunca guardar el PIN legible.
   Migración: pedir a cada admin que reingrese su PIN una vez.
2. **Eliminar el PIN maestro.** Si hace falta un mecanismo de emergencia, que sea un
   comando ejecutado **en el servidor** por alguien con acceso físico, no una
   constante en el código.
3. **Mover el login a la API.** El cliente manda código + PIN, el servidor responde
   con un **token** de sesión. Cada petición posterior lleva ese token, y el servidor
   verifica en cada una qué permisos tiene.

**Esto es trabajo previo obligatorio, no parte de la migración.** Y conviene hacerlo
igual aunque el servidor nunca se construya: hashear los PIN mejora la app actual.

### Bloqueador 2 — Los campos del inventario sin definir

Ver el [punto 4 del ROADMAP](./ROADMAP.md). Migrar un esquema en un servidor con
datos en producción duele mucho más que cambiarlo en un archivo local. Cerrá la
lista de campos **antes** de mover nada.

### Bloqueador 3 — El permiso de TI

No es técnico, y es el que más proyectos mata. Ver Fase 0. Averigualo **primero**:
si el área de redes no te da una IP fija ni te deja conectar un equipo, todo lo
demás sobra.

---

## 5. Decisiones de tecnología (ya tomadas, con el porqué)

### Base de datos: seguir con SQLite, no volver a PostgreSQL

Contra la intuición, pero es lo correcto acá.

SQLite tiene fama de "base de juguete para una sola máquina". Eso es un malentendido:
la limitación real de SQLite es que admite **un solo escritor a la vez**. Con una API
que es un único proceso, y una escuela con menos de 10 personas operando, esa
limitación no se alcanza nunca. SQLite maneja sin problemas ese volumen.

Lo que ganás:

- **Las consultas SQL que ya escribiste se reutilizan casi textuales.** Las 37
  funciones de `useInventory.ts` se mudan al servidor con cambios mínimos. Con
  PostgreSQL habría que reescribir sintaxis, tipos de fecha y funciones agregadas.
- Cero administración de motor de base: sin usuarios, sin `pg_hba.conf`, sin servicio
  extra que se caiga.
- El respaldo sigue siendo **copiar un archivo**, igual que hoy.

Cuándo sí habría que pasar a PostgreSQL: si en algún momento hay **decenas de
personas escribiendo en simultáneo**, o si se necesita replicación real. No es el
caso, y probablemente no lo sea nunca.

### API: Node + TypeScript

No porque sea la mejor tecnología del mundo, sino por la razón más práctica que
existe: **ya está escrito en TypeScript**. Las 37 funciones de acceso a datos se
copian al servidor y se les cambia una línea (de dónde sale la conexión). El resto
—las consultas, las validaciones, las reglas de negocio— queda igual.

Alternativa considerada: Rust con Axum. El proyecto ya tiene Rust por Tauri y sería
más eficiente. Se descarta porque implicaría **reescribir esas 37 funciones desde
cero** en un lenguaje que todavía no dominás, y no compra nada a esta escala.

Framework sugerido: **Fastify** o **Hono**. Ambos son mínimos y directos.

### Cliente: adaptador, no reescritura

`useInventory.ts` expone 37 funciones (`getEquipos`, `devolverEquipo`, ...) que el
resto de la app ya usa. La estrategia es **conservar exactamente esas firmas** y
cambiar solo lo de adentro: donde hoy hay `db.select(...)`, mañana hay
`fetch(API_URL + ...)`.

Si se hace bien, `Admin.tsx`, `Kiosk.tsx`, `Home.tsx` y `PrestamoRapido.tsx` **no se
tocan**. Eso reduce enormemente el riesgo de romper algo que ya funciona.

---

## 6. Qué sobrevive y qué se pierde en la migración

La duda razonable es: "si al final voy a montar un servidor, ¿todo lo que construya
ahora se tira?"

No. Y hay un principio que conviene tener presente:

> **En una migración se pierde la capa de acceso a datos. Todo lo demás sobrevive.**

| Trabajo | ¿Sobrevive? | Detalle |
| --- | --- | --- |
| `Admin.tsx`, `Kiosk.tsx`, `Home.tsx`, `PrestamoRapido.tsx` | ✅ Intactos | Si se respetan las firmas de las 37 funciones, no se tocan |
| Estilos, componentes, `Icon.tsx`, `print.ts`, `datetime.ts` | ✅ Intactos | No tienen nada que ver con la base de datos |
| Pistola de barras (input, foco, manejo de error, etiquetas) | ✅ Intacto | Solo cambia la función que busca el código: **una línea** |
| Paleta de comandos, recordatorios | ✅ Intactos | Son puro frontend |
| Campos nuevos de inventario | ✅ La decisión sobrevive | La migración del esquema hay que rehacerla del lado del servidor, pero eso es media hora |
| Las consultas SQL de `useInventory.ts` | ✅ Casi textuales | Por eso se eligió seguir con SQLite (ver §5) |
| El **cuerpo** de las 37 funciones de datos | ❌ Se reescribe | `db.select(...)` pasa a `fetch(...)`. Las firmas quedan |
| Código Rust de respaldos (`src-tauri/src/lib.rs`) | ❌ Queda sin uso | ~150 líneas. Ver abajo |
| App del celular | ➕ Es código nuevo | Pero no arranca en blanco: reutiliza componentes, estilos y reglas ya escritas |

### Sobre los respaldos que ya se implementaron

Quedaría sin uso el código Rust, nada más. **Los conceptos se trasladan enteros** al
script del servidor: fecha legible, retención, y sobre todo el detalle del WAL — que
en el servidor también aplica y también corrompe el respaldo si se ignora (ver
[Fase 6](#fase-6--respaldos-del-servidor)).

Y de hecho el servidor respalda **mejor**: `cron` corre aunque nadie abra la app, y
subir a Drive con `rclone` desde Linux evita pelearse con el OAuth de Google desde el
escritorio.

Además, el servidor está a meses de distancia como mínimo. Los respaldos protegen la
operación **desde hoy**. Eso solo ya los justificó.

### Conclusión práctica

**Seguí construyendo funciones. Las funciones no son el riesgo.** Lo único que hay
que evitar es escribir código nuevo que asuma para siempre que la base es local —
y eso se resuelve manteniendo todo el acceso a datos dentro de `useInventory.ts`,
como está hoy.

---

## 7. Dónde vive el código (y por qué son tres lugares)

Duda muy común al empezar: "la API, ¿queda en mi compu o en el servidor?".

La respuesta es que el código **no vive en un solo lugar**. Vive en tres, con roles
distintos:

| Lugar | Rol |
| --- | --- |
| **Tu Mac** | Donde lo escribís y lo probás |
| **GitHub** | La fuente de verdad. El repositorio |
| **El servidor** | Donde *corre*. Una copia desplegada |

El ciclo de trabajo:

```bash
# En tu Mac
git add . && git commit -m "feat: endpoint de devoluciones"
git push

# En el servidor (por SSH)
cd /home/prestamos/prestamos-api
git pull
npm ci && npm run build
sudo systemctl restart prestamos-api
```

El servidor **no es donde guardás el código**. Es donde lo ejecutás. Si el servidor
se muere, el código sigue intacto en GitHub y en tu Mac; se levanta otro y se hace
`git clone`. Esa es justamente la idea.

### ¿Repo nuevo o el mismo?

**Repo nuevo, separado.** Razones:

- Ciclos de vida distintos: la app se instala en máquinas, la API se despliega en un
  servidor.
- Versionado distinto: la API puede ir por la v3 mientras la app va por la v1.
- Despliegue distinto: el servidor hace `git pull` del repo de la API y nada más. No
  tiene por qué bajarse el código de la app de escritorio.

Meterlas en el mismo repo se ve simple los primeros dos meses y después estorba.

---

## 8. ¿Una IA dentro del servidor que genere los comandos?

Respuesta corta: **no**. Y conviene separar dos ideas que se parecen pero no son lo
mismo.

### Un modelo corriendo EN el servidor, generando y ejecutando comandos

No, por dos motivos.

**El técnico:** una mini PC sin GPU no corre ningún modelo que valga la pena. Los que
sí corren en ese hardware son malos, y un modelo malo generando comandos de sistema
es peor que no tener nada.

**El de fondo, que importa más:** el día que ese servidor se caiga, lo vas a tener que
arreglar vos. A las 7 de la mañana, con profesores esperando para llevarse equipo. Si
los comandos que lo configuraron los generó algo que no entendiste, no vas a saber
dónde mirar.

Si no sabés qué hace `systemctl enable`, ¿cómo vas a diagnosticar por qué el servicio
no arrancó? Los conceptos van primero.

### Usar IA desde tu computadora para escribir el código

Eso sí, y es el uso correcto. La IA escribe, **vos entendés y desplegás**. Vos
dirigís, la herramienta ejecuta.

La diferencia no es dónde corre el modelo. Es **quién entiende lo que está pasando**.

### Lo que sí hay que dominar

Para operar este servidor alcanzan cuatro comandos:

```bash
sudo systemctl status prestamos-api      # ¿está vivo?
sudo systemctl restart prestamos-api     # reiniciarlo
sudo journalctl -u prestamos-api -n 50   # ¿qué error dio?
df -h                                    # ¿se llenó el disco?
```

Cuatro. Se aprenden en una tarde y te vuelven autosuficiente. Eso vale
infinitamente más que una IA local generando comandos que no podés auditar.

---

## Fase -1 — Practicá primero en tu Mac

> ⏱ Tiempo: una tarde. **Costo: cero. Riesgo: cero. Permisos necesarios: ninguno.**

Este es el mejor consejo de todo el documento, y va antes que comprar nada.

Podés montar el servidor **completo** en una máquina virtual dentro de tu Mac. Ubuntu,
SSH, `systemd`, firewall, la API entera, los respaldos con `cron` — **todo idéntico**
a como sería en la máquina real. Lo que aprendas ahí se traslada tal cual.

### Por qué esto primero

- No dependés de que TI te dé permisos.
- No gastás en hardware antes de saber si el proyecto te convence.
- Podés **romperlo a propósito** para aprender a arreglarlo, que es la única forma
  real de aprender esto.
- Si algo sale mal, borrás la VM y empezás de nuevo en dos minutos.

Cuando la VM te salga con los ojos cerrados, pasarlo a una máquina física es
prácticamente copiar y pegar.

### Qué herramienta usar en un Mac con Apple Silicon (M1/M2/M3/M4)

| Herramienta | ¿Sirve? | Por qué |
| --- | --- | --- |
| **Multipass** | ✅ **Recomendada** | Hecha por Canonical justo para levantar Ubuntu. Usa la virtualización nativa de Apple. Un comando y estás adentro |
| **UTM** | ✅ Buena | Interfaz gráfica, más visual. Útil si preferís ver la instalación paso a paso, como sería en el equipo real |
| **OrbStack** | ⚠️ Sirve, con cuidado | Rapidísima, pero está pensada para contenedores. Ver la advertencia de abajo |
| **VirtualBox (Oracle)** | ❌ **No** | En Apple Silicon solo hay una versión preliminar, inestable, y no corre sistemas x86. En una Mac Intel sí funcionaba; en M1 en adelante, no la uses |
| **Docker** (ya instalado) | ❌ Para este fin, no | Ver abajo. Es una herramienta excelente, pero no es lo que necesitás **para aprender esto** |

### Por qué una VM y no un contenedor de Docker

Es la confusión más común, y acá importa de verdad.

Un contenedor **no es una computadora**: es un proceso aislado. No arranca, no tiene
`systemd`, no tiene SSH, no se apaga ni se prende. Y justamente eso —arrancar
servicios solos, revivir procesos caídos, entrar por SSH, sobrevivir a un
reinicio— **es todo lo que venís a aprender**.

Aprender administración de servidores dentro de un contenedor es como aprender a
manejar en un simulador que no tiene volante. Docker es una gran herramienta; para
este objetivo puntual, no es la indicada.

**Usá una VM.**

### Cómo montarla

```bash
brew install --cask multipass

# Crear la máquina (Ubuntu LTS por defecto)
multipass launch --name servidor-p15 --cpus 2 --memory 2G --disk 20G

# Entrar
multipass shell servidor-p15

# Ver su IP, para después probar la conexión desde la app
multipass list
```

Ya estás dentro de un Ubuntu real, corriendo de verdad. Desde ahí seguí la
[Fase 1](#fase-1--montar-el-servidor) tal cual está escrita, salteando solo la
instalación del sistema operativo (Multipass ya te la dio hecha).

Comandos útiles mientras practicás:

```bash
multipass stop servidor-p15      # apagarla
multipass start servidor-p15     # prenderla (probá que la API levante sola)
multipass delete servidor-p15 && multipass purge   # borrarla y empezar de cero
```

Ese último comando es tu red de seguridad: **si rompés algo sin arreglo, borrás y
volvés a empezar en dos minutos.** Por eso se practica acá y no en el equipo real.

### Ejercicios para practicar antes de tocar hardware real

Hacé estos en la VM hasta que salgan sin dudar:

- [ ] Entrar por SSH desde la terminal del Mac
- [ ] Instalar Node y correr un "hola mundo" que responda en un puerto
- [ ] Convertirlo en servicio de `systemd` y que arranque solo al reiniciar la VM
- [ ] **Matar el proceso a propósito** y comprobar que `Restart=always` lo revive
- [ ] Configurar el firewall, dejarte afuera a propósito, y recuperarte
- [ ] Programar un `cron` que escriba un archivo cada minuto
- [ ] Leer los logs con `journalctl` y encontrar un error que vos mismo provocaste
- [ ] Reiniciar la VM y verificar que todo levanta solo

El quinto punto parece raro, pero es el más útil: **entender cómo te dejás afuera de
un servidor es lo que te salva de hacerlo en el real.**

---

## Fase 0 — Permisos y hardware

> ⏱ Tiempo: días o semanas, y casi nada depende de vos. **Empezá por acá.**

### 0.1 Hablar con el área de redes / TI de la prepa

Preguntas concretas que hay que llevar:

1. ¿Puedo conectar un equipo propio a la red de la escuela, de forma permanente?
2. ¿Me pueden asignar una **IP fija** (por ejemplo `192.168.1.50`)? Sin IP fija, la
   dirección cambia sola y la app deja de encontrar el servidor.
3. ¿Los celulares y las computadoras están en la **misma red**? En muchas escuelas
   el wifi de invitados está aislado del cableado. Si están separados, el celular no
   va a poder ver al servidor y hay que resolverlo con ellos.
4. ¿Hay un lugar con corriente donde el equipo pueda quedar prendido 24/7?
5. ¿Hay algún reglamento sobre dónde pueden vivir los datos de la escuela?

**Si la respuesta a la 3 es no, el proyecto se detiene acá.** No es negociable por
software: si el wifi de celulares está aislado de la red donde vive el servidor,
ningún código lo arregla.

### 0.1.b La IP fija: hay dos formas, y una no necesita permiso

Aclaración importante, porque suele confundirse: **la IP fija es solo para el
servidor.** Las computadoras y los celulares que se conectan pueden seguir con IP
automática y cambiante — no importa. Lo único que no puede moverse es la dirección a
la que todos apuntan.

| Forma | Qué necesitás | Cuándo usarla |
| --- | --- | --- |
| **A) Reserva DHCP en el router** | Acceso de administrador al router | **La correcta.** Le decís al router "a esta máquina, siempre esta IP" y te olvidás |
| **B) IP estática en la máquina** | Nada del router. Se configura en el servidor (`netplan`, ver [Fase 1](#16-ip-fija)) | Cuando no tenés acceso al router |

#### ⚠️ El problema de la opción B, y cómo evitarlo

Si configurás una IP estática que cae **dentro del rango que el router reparte
automáticamente**, tarde o temprano el router le va a dar esa misma dirección a otro
dispositivo. Dos máquinas con la misma IP.

Y esto no falla con un error claro. Falla con la app andando bien tres días y
comportándose raro el cuarto. Es de las cosas más molestas de diagnosticar que
existen.

**Cómo evitarlo:** entrá al router, buscá el rango de DHCP (suele ser algo como
`192.168.1.100` a `192.168.1.200`) y elegí una dirección **fuera de ese rango**, por
ejemplo `192.168.1.50`.

#### Si administrás la red de la escuela

Usá la **opción A**. Es la correcta, te evita el problema del rango por completo y ya
tenés el acceso.

Dos recomendaciones prácticas, no morales:

- **Dejá registro.** Anotá en la documentación de red qué equipo es, qué IP tiene y
  para qué sirve. Un papel pegado al equipo también cuenta. El que venga después va a
  encontrar una máquina desconocida con IP fija y no va a saber qué es — y ese
  "después" te puede tocar a vos mismo en dos años.
- **Que alguien más lo sepa.** Si sos la única persona que sabe que ese servidor
  existe y cómo entrar, la escuela tiene un problema el día que no estés.

### 0.2 El equipo

No necesitás nada potente. El inventario de una prepa es un puñado de miles de
registros; eso corre en cualquier cosa.

| Opción | Nota |
| --- | --- |
| Una PC de escritorio vieja | Gratis si ya existe. Verificá que el disco no esté por morir |
| Mini PC (Intel N100 o similar) | Barata, silenciosa, bajo consumo. La mejor opción si hay presupuesto |
| Raspberry Pi 4/5 | Funciona, pero la tarjeta SD se corrompe con los cortes de luz. Si va Pi, **usá SSD por USB, no microSD** |

Requisitos reales: 4 GB de RAM y 60 GB de disco sobran.

**Comprá también un UPS (no-break).** No es opcional. Un corte de luz en el momento
de una escritura puede corromper la base. Un UPS de los baratos alcanza para que el
equipo se apague ordenadamente.

---

## Fase 1 — Montar el servidor

> ⏱ Tiempo: medio día la primera vez.

### 1.1 Instalar el sistema operativo

**Ubuntu Server LTS** (la versión LTS que esté vigente). "Server" significa sin
escritorio gráfico: solo texto. Se siente raro al principio, pero es lo correcto —
menos cosas instaladas, menos cosas que fallan.

1. Descargá la imagen ISO desde ubuntu.com.
2. Grabala a una USB con [balenaEtcher](https://etcher.balena.io/).
3. Arrancá el equipo desde la USB y seguí el instalador.
4. Durante la instalación, **marcá la casilla "Install OpenSSH server"**. Eso te
   permite manejarlo después desde tu laptop sin ir físicamente al equipo.
5. Anotá el usuario y la contraseña que creaste.

### 1.2 Entrar por SSH

SSH es entrar a la terminal de otra computadora por la red. Desde tu Mac:

```bash
ssh tu-usuario@192.168.1.50
```

La primera vez pregunta si confiás en el equipo: escribí `yes`. Después pide la
contraseña. Si entra, ya no necesitás teclado ni monitor en el servidor.

### 1.3 Actualizar y crear el usuario de la aplicación

```bash
sudo apt update && sudo apt upgrade -y

# Usuario sin permisos de administrador, solo para correr la app.
# Si alguien logra explotar la API, queda encerrado en este usuario.
sudo useradd --system --create-home --shell /usr/sbin/nologin prestamos
```

### 1.4 Instalar Node

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node --version   # debe responder v22.x o superior
```

### 1.5 Firewall

Por defecto, cerrado todo. Se abre solo lo necesario.

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh          # para poder seguir entrando
sudo ufw allow 3000/tcp     # el puerto de la API
sudo ufw enable
sudo ufw status             # verificá antes de cerrar la sesión
```

> ⚠️ Cuidado: si activás el firewall sin permitir SSH primero, te quedás afuera del
> servidor y hay que ir físicamente con teclado y monitor. Verificá con
> `sudo ufw status` **antes** de cerrar la terminal.

### 1.6 IP fija
<a id="16-ip-fija"></a>

Si TI te asignó una IP por DHCP reservado, no hay nada que hacer del lado del
servidor. Si te dijeron "configurala vos", se hace en `/etc/netplan/`:

```bash
sudo nano /etc/netplan/00-installer-config.yaml
```

```yaml
network:
  version: 2
  ethernets:
    enp1s0:                      # verificá el nombre real con: ip a
      dhcp4: no
      addresses: [192.168.1.50/24]
      routes:
        - to: default
          via: 192.168.1.1       # la IP del router, preguntale a TI
      nameservers:
        addresses: [8.8.8.8, 1.1.1.1]
```

```bash
sudo netplan apply
```

---

## Fase 2 — La API

> ⏱ Tiempo: 1 a 2 semanas. Es la parte más grande.

### 2.1 Estructura del proyecto

Se crea un repositorio nuevo, separado de la app de escritorio:

```
prestamos-api/
├── src/
│   ├── index.ts          # arranque del servidor
│   ├── db.ts             # conexión SQLite
│   ├── auth.ts           # login, tokens, verificación de permisos
│   ├── middleware.ts     # el guardia que revisa el token en cada petición
│   └── routes/
│       ├── equipos.ts
│       ├── prestamos.ts
│       ├── profesores.ts
│       ├── categorias.ts
│       ├── reportes.ts
│       └── settings.ts
├── package.json
└── prestamos.db          # la base
```

### 2.2 De dónde sale el código

De `src/hooks/useInventory.ts`. Esto es lo importante: **no se reescribe la lógica,
se muda.**

Ejemplo. Hoy en la app:

```typescript
export const getEquipos = async (categoriaId?: number | null): Promise<Equipo[]> => {
  const db = await getDb();
  // ... consulta SQL larga ...
  return db.select<Equipo[]>(sql, params);
};
```

Mañana, en el servidor, la función es **la misma consulta SQL**, envuelta en una ruta:

```typescript
// routes/equipos.ts
app.get("/equipos", { preHandler: requireProfesor }, async (request) => {
  const { categoriaId } = request.query;
  // ... la misma consulta SQL, textual ...
  return db.prepare(sql).all(params);
});
```

Cambia el envoltorio. La consulta no.

### 2.3 Las rutas

Traducción de las 37 funciones actuales:

| Función actual | Ruta | Quién puede |
| --- | --- | --- |
| `getEquipos` | `GET /equipos` | profesor |
| `createEquipo` | `POST /equipos` | admin |
| `updateEquipo` | `PUT /equipos/:id` | admin |
| `deleteEquipo` | `DELETE /equipos/:id` | admin |
| `getCategorias` | `GET /categorias` | profesor |
| `createCategoria` / `updateCategoria` / `deleteCategoria` | `POST` / `PUT` / `DELETE /categorias` | admin |
| `getProfesores` / `searchProfesores` | `GET /profesores` | admin |
| `createProfesor` / `updateProfesor` / `deleteProfesor` | `POST` / `PUT` / `DELETE /profesores` | admin |
| `loginAdmin` | `POST /auth/login` | público |
| `verificarProfesorExacto` | `POST /auth/profesor` | público |
| `createPrestamoRapido` | `POST /prestamos` | profesor |
| `devolverEquipo` | `POST /prestamos/:id/devolver` | profesor |
| `marcarEquipoPerdido` | `POST /prestamos/:id/perdido` | admin |
| `getPrestamosActivosProfesor` | `GET /prestamos/activos` | profesor |
| `getReportePrestamos` | `GET /reportes/prestamos` | admin |
| `deleteHistorialPrestamos` / `deleteAllReportes` | `DELETE /reportes` | admin |
| `getSettings` / `updateSetting` | `GET` / `PUT /settings` | admin |
| Préstamos rápidos de alumnos | `/prestamos-alumnos/*` | admin |

La columna "quién puede" **es la parte que hoy no existe** y es la razón de ser de
la migración. Cada ruta declara su nivel, y un middleware lo verifica antes de
ejecutar nada.

### 2.4 Autenticación

Flujo:

1. El cliente manda `POST /auth/login` con código y PIN.
2. El servidor busca al profesor, compara el PIN con el hash (`bcrypt.compare`).
3. Si coincide, genera un token firmado (JWT) que dice quién es y si es admin, con
   vencimiento de unas horas.
4. El cliente guarda el token y lo manda en cada petición:
   `Authorization: Bearer <token>`.
5. El middleware verifica la firma en **cada** petición. Si el token es inválido,
   venció, o el rol no alcanza, responde `401` o `403` y no ejecuta nada.

Reglas que no se negocian:

- El PIN **nunca** viaja ni se guarda en texto plano.
- La firma del token (`JWT_SECRET`) vive en una variable de entorno del servidor,
  **jamás** en el código ni en el repositorio.
- El servidor **nunca** le cree al cliente sobre quién es. Solo al token que él mismo
  firmó.

### 2.5 Transacciones

El código actual ya usa transacciones donde importa (`BEGIN IMMEDIATE TRANSACTION`
en `deleteAllReportes`). En el servidor hay que ser **más** estricto, porque ahora sí
puede haber dos personas actuando al mismo tiempo.

Caso concreto: dos profesores intentan llevarse el último proyector a la vez. Sin
transacción, ambos ven "disponible: 1" y ambos se lo llevan. La verificación de
disponibilidad y el registro del préstamo tienen que ocurrir **dentro de la misma
transacción**, y la consulta de disponibilidad tiene que bloquear la fila.

Esto no es teórico: es exactamente el tipo de bug que aparece la primera semana de
uso real y que hoy no puede pasar porque solo hay una persona operando.

### 2.6 Dejarlo corriendo con systemd

`systemd` es lo que hace que el programa arranque solo al prender el equipo y reviva
si se cae.

```bash
sudo nano /etc/systemd/system/prestamos-api.service
```

```ini
[Unit]
Description=API de Prestamos P15
After=network.target

[Service]
Type=simple
User=prestamos
WorkingDirectory=/home/prestamos/prestamos-api
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
EnvironmentFile=/home/prestamos/prestamos-api/.env

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable prestamos-api    # arranca solo al prender el equipo
sudo systemctl start prestamos-api
sudo systemctl status prestamos-api    # ver si está vivo
sudo journalctl -u prestamos-api -f    # ver los logs en vivo
```

Esos cuatro comandos son el 90% de lo que vas a necesitar saber de administración.

---

## Fase 3 — Migrar los datos actuales

> ⏱ Tiempo: unas horas.

La ventaja de seguir con SQLite: **el archivo se copia y ya**.

1. En la máquina actual, entrá a Admin → Respaldos → "Crear respaldo".
2. Abrí la carpeta con el botón "Abrir carpeta" y copiá el `.db` más reciente.
3. Pasalo al servidor:

```bash
scp prestamos-backup-2026-08-20_14-30-05.db tu-usuario@192.168.1.50:/tmp/
```

4. En el servidor:

```bash
sudo mv /tmp/prestamos-backup-*.db /home/prestamos/prestamos-api/prestamos.db
sudo chown prestamos:prestamos /home/prestamos/prestamos-api/prestamos.db
```

5. Aplicá las migraciones nuevas: hashear los PIN existentes, agregar columnas de
   token si hicieran falta.
6. Verificá que los conteos coincidan con los de la app original:

```bash
sudo -u prestamos sqlite3 /home/prestamos/prestamos-api/prestamos.db \
  "SELECT COUNT(*) FROM inventario; SELECT COUNT(*) FROM prestamos;"
```

> ⚠️ Antes de migrar, dejá la máquina original **intacta** por lo menos un mes. Es tu
> plan de retorno si algo sale mal.

---

## Fase 4 — Adaptar la app de escritorio

> ⏱ Tiempo: 3 a 5 días.

Acá está la clave de que esto no se vuelva un infierno: **conservar las firmas de las
funciones**.

### Antes

```typescript
export const getEquipos = async (categoriaId?: number | null): Promise<Equipo[]> => {
  const db = await getDb();
  return db.select<Equipo[]>(sql, params);
};
```

### Después

```typescript
export const getEquipos = async (categoriaId?: number | null): Promise<Equipo[]> => {
  return apiGet<Equipo[]>("/equipos", { categoriaId });
};
```

**La firma es idéntica.** Por lo tanto `Admin.tsx`, `Kiosk.tsx`, `Home.tsx` y
`PrestamoRapido.tsx` no se tocan. Ese es todo el truco, y es lo que hace la
diferencia entre una migración de una semana y una de dos meses.

### Lo que sí hay que agregar

1. **Un cliente HTTP** (`src/api/client.ts`): base URL, token en el header, manejo de
   errores unificado.
2. **La dirección del servidor configurable.** No la escribas fija en el código: si
   TI cambia la IP, hay que recompilar y reinstalar en todas las máquinas. Que sea un
   campo en Admin, guardado localmente.
3. **Manejo del servidor caído.** Hoy la app no puede perder la conexión, porque no
   hay conexión. Mañana sí. Cada pantalla necesita un estado de "no se pudo conectar"
   con un botón de reintentar. **No lo dejes para el final** — es la diferencia entre
   una app que se siente sólida y una que parece rota.
4. **Guardar el token** y renovarlo cuando venza.

### Qué pasa con los respaldos actuales

El respaldo local deja de tener sentido: la base ya no vive en la máquina. La sección
de respaldos en Admin pasa a **pedirle el respaldo al servidor** (`GET /backup`, que
descarga el `.db`), o simplemente se saca de la app y se maneja desde el servidor
(Fase 6). El código Rust de `src-tauri/src/lib.rs` quedaría sin uso.

---

## Fase 5 — La web para celular + QR

> ⏱ Tiempo: 1 semana.

### Por qué NO se compila una app de Android

Tauri 2 soporta Android, sí. Y aun así **no conviene**:

- Hay que firmar el APK y distribuirlo a cada celular a mano, o publicar en Play
  Store (cuenta de desarrollador, revisión, política de privacidad).
- Cada actualización hay que reinstalarla en cada teléfono.
- Los iPhone quedan afuera, salvo que hagas también la versión iOS, que necesita una
  Mac y una cuenta de Apple de pago.

Una página web servida desde el mismo servidor se abre en cualquier teléfono, se
actualiza sola, y no requiere instalar nada. Para uso interno en una escuela, gana
por goleada.

### Cómo se hace

La API sirve también una versión web reducida (solo lo que se usa desde el celular:
consultar un objeto, prestarlo, devolverlo). Buena parte de los componentes React
existentes se reutilizan.

En el celular se abre `http://192.168.1.50:3000`. Conviene que los profesores lo
guarden en la pantalla de inicio: en Android y iOS eso lo hace ver como una app.

### Los QR

Cada objeto lleva pegado un QR que codifica una URL:

```
http://192.168.1.50:3000/equipo/42
```

La cámara del celular lo reconoce sin apps extras. Se abre la ficha del objeto
directo, listo para prestar o devolver.

Generación de las etiquetas: una vista imprimible en Admin, igual que los reportes
PDF que ya existen (`src/utils/print.ts`). Con una librería de QR se dibujan en una
hoja de etiquetas y se imprimen todas de una.

> 💡 Detalle práctico que ahorra trabajo doble: **el QR y el código de barras pueden
> ser la misma etiqueta.** Si vas a imprimir y pegar etiquetas en cada objeto, hacelo
> **una sola vez** con las dos cosas: código de barras para la pistola en la
> computadora, QR para el celular. Pegar etiquetas en todo el inventario es el trabajo
> físico más pesado de todo el proyecto — no lo hagas dos veces.

---

## Fase 6 — Respaldos del servidor

> ⏱ Tiempo: medio día. **No es opcional.**

Ahora todos los datos de la prepa viven en una sola máquina. Sin respaldo automático,
un disco muerto borra el inventario completo.

### Respaldo local automático

`/home/prestamos/backup.sh`:

```bash
#!/bin/bash
set -euo pipefail

DB=/home/prestamos/prestamos-api/prestamos.db
DEST=/home/prestamos/backups
STAMP=$(date +%Y-%m-%d_%H-%M-%S)

mkdir -p "$DEST"

# .backup usa la API de respaldo de SQLite: consistente aunque la app esté
# escribiendo en ese momento. NUNCA uses cp sobre una base en uso.
sqlite3 "$DB" ".backup '$DEST/prestamos-$STAMP.db'"

# Conservar 30 días
find "$DEST" -name 'prestamos-*.db' -mtime +30 -delete
```

```bash
chmod +x /home/prestamos/backup.sh
sudo -u prestamos crontab -e
```

```cron
0 * * * * /home/prestamos/backup.sh
```

(Cada hora, en punto.)

> ⚠️ El detalle del `.backup` importa. Copiar el archivo con `cp` mientras la API
> escribe produce un respaldo corrupto — es el mismo problema del WAL que ya
> arreglamos en la app de escritorio.

### Respaldo fuera del servidor

Un respaldo en el mismo disco que la base **no es un respaldo**. Si el disco muere,
se van los dos.

Opciones, de más simple a más completa:

1. **A otra computadora de la escuela**, con `rsync` por cron.
2. **A Google Drive**, con [`rclone`](https://rclone.org/) (`rclone sync`). Requiere
   autorizar la cuenta una vez.
3. **Un disco externo** conectado al servidor. Barato y efectivo, pero no protege
   contra robo o incendio.

Lo mínimo aceptable: **una copia fuera del servidor, todos los días.**

### Y lo más importante: probar la restauración

Un respaldo que nunca se restauró no es un respaldo, es una esperanza.

Una vez al semestre: tomá un respaldo, levantalo en otra máquina, verificá que la app
funciona y que los datos están completos. Si nunca hacés esto, vas a descubrir que los
respaldos estaban vacíos justo el día que los necesitás.

---

## Fase 7 — Que sobreviva a los apagones

- **UPS (no-break).** Ya mencionado, y es lo primero.
- **Encendido automático tras corte de luz.** Se activa en la BIOS del equipo:
  buscá "Restore on AC Power Loss" o "After Power Failure" y ponelo en "Power On".
  Sin esto, cada apagón obliga a que alguien vaya físicamente a prender el servidor.
- **`systemctl enable`** ya hecho en la Fase 2: la API arranca sola al encender.
- **Verificación mensual:** entrar por SSH y correr
  `sudo systemctl status prestamos-api` para confirmar que sigue viva.

---

## Qué hacer cuando el servidor se caiga

Va a pasar. Tener el plan escrito **antes** convierte una crisis en una molestia.

### Diagnóstico rápido

```bash
sudo systemctl status prestamos-api      # ¿está corriendo?
sudo journalctl -u prestamos-api -n 50   # últimos 50 mensajes de error
df -h                                    # ¿se llenó el disco?
ping 192.168.1.50                        # desde otra máquina: ¿responde la red?
```

Si `ping` no responde: es problema de red o el equipo está apagado. Si responde pero
la app no carga: es la API. Si la API está corriendo pero da errores: mirá los logs.

### Mientras tanto: el plan B en papel

Ninguna escuela puede dejar de prestar equipo porque un servidor se cayó. Tiene que
existir una libreta de papel donde anotar préstamos y devoluciones durante la caída, y
un procedimiento para cargarlos después.

Suena primitivo. Es exactamente lo que hacen los sistemas serios.

### El plan de retorno

Durante el primer mes, **mantené la app vieja instalada y funcionando** en la máquina
de la coordinación. Si la migración sale mal, se vuelve atrás en minutos en vez de
horas.

---

## Checklist completo

### Fase -1 — Laboratorio en tu Mac (empezá acá)
- [ ] Multipass instalado y VM Ubuntu corriendo
- [ ] Entrar por SSH desde la terminal del Mac
- [ ] Un "hola mundo" en Node respondiendo en un puerto
- [ ] Convertido en servicio de `systemd`, arranca solo al reiniciar la VM
- [ ] Proceso matado a propósito y revivido por `Restart=always`
- [ ] Firewall configurado, dejarte afuera a propósito y recuperarte
- [ ] Un `cron` escribiendo un archivo cada minuto
- [ ] Un error provocado por vos, encontrado en `journalctl`

### Antes de empezar
- [ ] Definidos los campos nuevos del inventario ([ROADMAP punto 4](./ROADMAP.md))
- [ ] PIN de administrador hasheados, PIN maestro del código eliminado
- [ ] TI confirmó: IP fija disponible
- [ ] TI confirmó: celulares y computadoras en la misma red
- [ ] Lugar con corriente permanente asignado
- [ ] Averiguado por qué se abandonó el sistema PostgreSQL anterior

### Hardware
- [ ] Equipo conseguido (mini PC / PC vieja / Pi con SSD)
- [ ] UPS comprado e instalado
- [ ] BIOS configurada para encender sola tras corte de luz

### Servidor
- [ ] Ubuntu Server instalado con OpenSSH
- [ ] Acceso por SSH funcionando desde tu laptop
- [ ] Sistema actualizado
- [ ] Usuario `prestamos` creado (sin privilegios)
- [ ] Node instalado
- [ ] Firewall activo: solo SSH y puerto 3000
- [ ] IP fija verificada

### API
- [ ] Proyecto creado, las 37 funciones migradas
- [ ] Login con hash y tokens funcionando
- [ ] Middleware de permisos en **todas** las rutas
- [ ] Transacciones en préstamos y devoluciones
- [ ] Servicio de `systemd` creado y habilitado
- [ ] Probada la reconexión: matar el proceso y ver que reviva

### Datos
- [ ] Respaldo de la app actual copiado al servidor
- [ ] Migraciones aplicadas (hash de PIN, campos nuevos)
- [ ] Conteos verificados contra la app original
- [ ] Máquina original intacta como plan de retorno

### App de escritorio
- [ ] Cliente HTTP implementado
- [ ] Las 37 funciones apuntando a la API, firmas sin cambios
- [ ] Dirección del servidor configurable desde Admin
- [ ] Pantallas de error de conexión en todas las vistas
- [ ] Probada con el servidor apagado a propósito

### Celular y QR
- [ ] Web mínima servida desde la API
- [ ] Probada en Android y en iPhone
- [ ] Etiquetas con QR **y** código de barras generadas
- [ ] Etiquetas impresas y pegadas

### Respaldos
- [ ] `backup.sh` con `sqlite3 .backup` (no `cp`)
- [ ] Cron cada hora, retención de 30 días
- [ ] Copia fuera del servidor, diaria
- [ ] **Restauración probada de verdad, en otra máquina**

### Operación
- [ ] Procedimiento de caída escrito y pegado junto a la computadora
- [ ] Libreta de papel como plan B
- [ ] Al menos una persona más sabe entrar por SSH y reiniciar el servicio

---

## Estimación honesta de tiempo

Suponiendo que trabajás en esto de a ratos, no a tiempo completo:

| Fase | Tiempo | Riesgo de que se estire |
| --- | --- | --- |
| -1 — Laboratorio en tu Mac | una tarde | 🟢 Nulo: no depende de nadie |
| 0 — Permisos y hardware | días a semanas | 🔴 Alto: no depende de vos |
| Bloqueadores (auth, campos) | 1 semana | 🟡 Medio |
| 1 — Montar el servidor | medio día | 🟢 Bajo |
| 2 — La API | 1 a 2 semanas | 🔴 Alto: es lo más grande |
| 3 — Migrar datos | horas | 🟢 Bajo |
| 4 — Adaptar la app | 3 a 5 días | 🟡 Medio |
| 5 — Celular y QR | 1 semana | 🟡 Medio |
| 6 — Respaldos | medio día | 🟢 Bajo |
| 7 — Apagones | horas | 🟢 Bajo |

**Total realista: 6 a 10 semanas** de trabajo intermitente, más lo que tarde TI.

Y sumale lo que nadie estima: **pegar las etiquetas en todo el inventario**. Eso son
días de trabajo físico que no aparecen en ninguna tabla de estimación y que siempre
toman el doble de lo que se cree.

### Cómo no morir en el intento

No hagas todo de una. El orden que menos duele:

1. **Practicá en una VM en tu Mac** ([Fase -1](#fase--1--practicá-primero-en-tu-mac)).
   Una tarde, cero riesgo, cero permisos, cero gasto. No compres hardware antes de
   esto.
2. Resolvé los bloqueadores (auth con hash) **en la app actual**. Sirve igual aunque
   el servidor nunca exista.
3. Montá el servidor y la API, pero seguí usando la app local. La API queda ahí,
   probándose sin presión.
4. Migrá **una sola pantalla** a la API — el catálogo de equipos, que es de solo
   lectura y no rompe nada. Probala una semana en uso real.
5. Recién entonces migrá el resto.

Un proyecto de dos meses que se entrega en un solo golpe al final es un proyecto que
falla en producción. Uno que entrega pedazos usables cada semana es uno que llega.

---

## Glosario para quien nunca tocó un servidor

| Término | Qué es, en cristiano |
| --- | --- |
| **SSH** | Entrar a la terminal de otra computadora por la red. Como estar sentado frente a ella, pero desde tu laptop |
| **Terminal / shell** | La pantalla negra donde escribís comandos. En un servidor no hay otra cosa |
| **`sudo`** | "Hacé esto como administrador". Si un comando falla por permisos, suele faltarle `sudo` adelante |
| **Puerto** | Un número que identifica un programa dentro de una máquina. La API vive en el 3000; SSH en el 22 |
| **IP fija** | La dirección del servidor en la red. "Fija" significa que no cambia sola. Sin eso, la app no lo encuentra |
| **Firewall (`ufw`)** | Portero de la red: decide qué puertos aceptan conexiones. Todo cerrado por defecto |
| **`systemd`** | El que arranca programas al prender la máquina y los revive si se caen |
| **Servicio (service)** | Un programa administrado por `systemd`. La API va a ser uno |
| **Cron** | Programador de tareas repetitivas. "Corré este script cada hora" |
| **Logs** | El diario de lo que hizo el programa. Primer lugar donde mirar cuando algo falla (`journalctl`) |
| **API** | Un programa que responde peticiones por la red. El intermediario entre la app y la base de datos |
| **Endpoint / ruta** | Una dirección concreta de la API. `GET /equipos` devuelve los equipos |
| **Token (JWT)** | Un pase firmado por el servidor que dice quién sos. Se manda en cada petición |
| **Hash** | Transformación irreversible de una contraseña. Se guarda el hash, nunca la contraseña |
| **Middleware** | Código que corre antes de cada petición. Acá: el guardia que revisa el token |
| **Transacción** | Varias operaciones que ocurren todas o ninguna. Evita dejar la base a medio camino |
| **`rsync` / `rclone`** | Herramientas para copiar archivos a otra máquina o a la nube |
| **UPS / no-break** | Batería que mantiene la máquina prendida durante un corte de luz |
| **VM (máquina virtual)** | Una computadora completa simulada dentro de otra. Arranca, tiene sistema operativo propio y se apaga, como una real |
| **Contenedor** | Un proceso aislado, NO una computadora. No arranca ni tiene `systemd`. Sirve para desplegar, no para aprender administración de servidores |
| **DHCP** | El servicio del router que reparte direcciones IP automáticamente a quien se conecta |
| **Reserva DHCP** | Decirle al router "a esta máquina en particular, dale siempre esta IP" |

---

## Referencias

- [Ubuntu Server](https://ubuntu.com/server/docs)
- [SQLite: cuándo es apropiado](https://www.sqlite.org/whentouse.html)
- [Fastify](https://fastify.dev/) · [Hono](https://hono.dev/)
- [rclone](https://rclone.org/) — respaldos a Drive
- [ROADMAP.md](./ROADMAP.md) — el resto de las funciones planeadas
- [ENGINEERING_HANDBOOK.md](./ENGINEERING_HANDBOOK.md) — cómo está armada la app hoy
