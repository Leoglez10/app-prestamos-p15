---
format: 1920x1080
duration: 171.360s
message: "Del catálogo cuenta. A mano, no."
arc: "How-to process with an inventory cause-and-effect loop"
audience: "Personal administrativo y del área de cómputo de la Preparatoria 15"
mode: autonomous
music: "calm unobtrusive instructional ambient"
---

## Video direction

- **Palette:** warm `#f8fafc` canvas, `#0f172a` ink, `#64748b` body, and `#2563eb` as the single structural accent; green/red only for real availability or return state.
- **Shared stage:** frames 2–10 use the same reconstructed admin app shell: compact P15 header, active “Préstamo Rápido” navigation, session badge, main work surface, progress rail, and content constrained above the caption band.
- **Motion grammar:** smooth `power3` long-tail settles; every reveal follows its spoken cue and continues through the back half. UI action uses `cursor-click-ripple`, `press-release-spring`, `discrete-text-sequence`, `control-target-sync`, or `stat-bars-and-fills` only where cited. No `repeat`, `yoyo`, browser-clock motion, randomness, lazy breathing, or back-half camera drift.
- **Rhythm:** frames 6 and 10 are the two cause-and-effect climaxes; frame 11 is a deliberate silent held read. All other frames build step-by-step and then hold.
- **Negative list:** no screenshots, no runtime network fetches, no real personal/inventory data, no second visual identity, no narration text duplicated as body copy, no content below `y=896px`, no slideshow front-load, and no independent screensaver-like floating elements.

## Frame 1 — Portada

- status: animated
- src: compositions/frames/01-portada.html
- duration: 7.211s
- poster: 4.636s
- transition_in: cut
- scene: Logo P15 and the title “Préstamos a alumnos” establish the series and the use case.
- voiceover: "Un alumno necesita un cable. No tiene código de profesor. Para eso existe el Préstamo Rápido."
- type: hook
- persuasion: Pain validation + direct answer
- beat: recognition and orientation
- blueprint: titlecard-reveal (Adapt)
- focal: exact P15 logo and “Préstamos a alumnos” lockup
- roles: logo = foreground identity · title = primary subject · series line = supporting chrome · diagonal panel and rings = background
- asset_candidates:
- sfx: soft-riser

narrativeRole: Opens on a concrete counter situation and names the purpose immediately.

keyMessage: Préstamo Rápido exists for a borrower without a professor code.

Adapt: keep the single restrained reveal and held lockup; use the established Video 1 cover treatment.
Scene 1 (0.000–1.545s): full-bleed cream ground with cobalt diagonal atmosphere; the exact logo fades and settles in the upper third via `scale-swap-transition`, centered-left with three depth layers.
Scene 2 (1.545–4.945s): the title reveals line by line through `discrete-text-sequence` as the narration names the need and the feature; asymmetric 60/40, title occupying more than half the content width.
Scene 3 (4.945–7.211s): “Video 4 de 6 · Préstamo Rápido” and the progress line arrive; the complete lockup holds still.

## Frame 2 — Dónde entra

- status: animated
- src: compositions/frames/02-donde-entra.html
- duration: 14.869s
- poster: 10.904s
- transition_in: push-slide LEFT
- scene: The home screen contrasts “Soy Profesor” with the administrative “Préstamo Rápido” card.
- voiceover: "Esta pantalla no es para el profesorado: es para quien atiende el mostrador. Se llama Préstamo Rápido porque registra en segundos lo que el kiosko no puede — un préstamo a alguien que no tiene código de profesor."
- type: product_intro
- persuasion: Contrast + progressive disclosure
- beat: clarity and focus
- blueprint: cursor-ui-demo (Adapt)
- focal: Préstamo Rápido card with “Requiere código administrativo.”
- roles: home cards = foreground UI · cursor = action actor · header = persistent shell · soft grid = background
- asset_candidates:
- sfx: click-soft

narrativeRole: Separates the administrative workflow from the professor kiosk before any steps begin.

keyMessage: The staff member at the counter enters through Préstamo Rápido, not Soy Profesor.

Adapt: keep the locked static-stage cursor tour; reduce it to one contrast action.
Scene 1 (0.000–4.163s): the shared app shell and two home cards reveal in sequence; rule-of-thirds composition, cards filling the content stage.
Scene 2 (4.163–10.408s): the cursor passes over “Soy Profesor”, then crosses to “Préstamo Rápido” using `cursor-click-ripple` without clicking; the first card de-emphasizes as the target card gains a cobalt halo.
Scene 3 (10.408–14.869s): the explanatory line “Registro de préstamos a alumnos. Requiere código administrativo.” reveals via `discrete-text-sequence`; camera and cursor settle, then hold.

## Frame 3 — Entrar con tu código

- status: animated
- src: compositions/frames/03-acceso.html
- duration: 16.213s
- poster: 12.472s
- transition_in: push-slide LEFT
- scene: Administrative access accepts one fictitious code, then exposes the persistent session badge and close action.
- voiceover: "Se entra con tu código de administrador. Un campo, sin contraseña. Y esta sesión no se cierra sola: cuando termines tu turno, pulsa Cerrar sesión arriba. Si no lo haces, sigue abierta aunque cierres la aplicación."
- type: feature_showcase
- persuasion: Demonstration + consequence framing
- beat: confidence and concern
- blueprint: cursor-ui-demo (Adapt)
- focal: “Acceso administrativo” form handing off to “Sesión: María López (9001001)”
- roles: login card = foreground subject · session badge = security payoff · cursor = action actor · shell = persistent context
- asset_candidates:
- sfx: key-tap, click-soft, chime-soft

narrativeRole: Teaches the one-field login and the security responsibility created by a persistent session.

keyMessage: Enter with an admin code and explicitly close the session at the end of the shift.

Adapt: preserve the click-driven state change and static camera; the payoff is the session badge.
Scene 1 (0.000–4.240s): “Acceso administrativo” and “Solo personal autorizado” reveal, then the fictitious code types through `discrete-text-sequence`; centered card in the shared shell.
Scene 2 (4.240–9.354s): cursor presses “Acceder a préstamos” via `press-release-spring`; the login card hands off to the main workspace with `scale-swap-transition`.
Scene 3 (9.354–16.213s): the session badge and “Cerrar sesión” are revealed and emphasized sequentially; a small persistence callout appears late, then everything holds.

## Frame 4 — Alumno o profesor

- status: animated
- src: compositions/frames/04-tipo-persona.html
- duration: 15.829s
- poster: 12.176s
- transition_in: crossfade
- scene: A single form toggles between Alumno and Profesor while its labels update live.
- voiceover: "Primero, para quién es. Al cambiar entre Alumno y Profesor, los campos se renombran solos. Sí: también puedes registrar a un profesor aquí, cuando el préstamo lo autorizas tú en el mostrador y no él desde el kiosko."
- type: feature_showcase
- persuasion: Demonstration + comparison of two options
- beat: comprehension
- blueprint: panel-edit-live-sync (Adapt)
- focal: Alumno/Profesor segmented control coupled to the two changing labels
- roles: form = foreground surface · toggle = control · labels = bound targets · session shell = supporting context
- asset_candidates:
- sfx: click-soft

narrativeRole: Shows that person type is a live form state rather than a different workflow.

keyMessage: The same staff workflow can register either an alumno or a profesor.

Adapt: keep the control-target couple and static camera; the bound targets are the field labels.
Scene 1 (0.000–3.653s): “Nuevo préstamo” and the Alumno-selected form settle in an asymmetric 35/65 layout.
Scene 2 (3.653–9.741s): cursor presses “Profesor”; the toggle and both labels change in the same beat with `control-target-sync` and `discrete-text-sequence`.
Scene 3 (9.741–15.829s): cursor returns to “Alumno”; the labels restore, and a small “Autorizado en mostrador” pill reveals near the active choice, then holds.

## Frame 5 — La persona

- status: animated
- src: compositions/frames/05-persona.html
- duration: 20.864s
- poster: 15.955s
- transition_in: push-slide LEFT
- scene: Person autocomplete reveals “Directorio” and “Ya prestó antes”, auto-fills a code, then demonstrates a new person.
- voiceover: "Al escribir el nombre, la app propone. Los profesores salen del directorio; los alumnos, de quienes ya pidieron algo antes. Eliges uno y el código se llena solo. Si es la primera vez de esa persona, escribe su nombre y su código completos: la próxima vez ya va a estar en la lista."
- type: feature_showcase
- persuasion: Progressive disclosure + worked example
- beat: mastery
- blueprint: cursor-ui-demo (Adapt)
- focal: person combobox and its two labeled suggestion sources
- roles: name field = primary control · suggestion list = evidence · code field = live target · new-person notice = final state
- asset_candidates:
- sfx: key-tap, click-soft

narrativeRole: Teaches the two autocomplete sources and the one-time effort for a new borrower.

keyMessage: Pick an existing suggestion to auto-fill the code, or enter a new person completely once.

Adapt: keep the static-stage state tour; each typed/search result state replaces the previous one.
Scene 1 (0.000–5.523s): “Die” types into “Nombre del Alumno” via `discrete-text-sequence`; suggestions drop in sequentially with source pills “Directorio” and “Ya prestó antes”.
Scene 2 (5.523–12.887s): cursor selects “Diego Ramírez”; the name and numeric code fill together through `control-target-sync`, then a brief confirmation highlight lands.
Scene 3 (12.887–20.864s): the fields clear and “Persona nueva” types; “Sin coincidencias · se guardará como alumno nuevo” appears late, followed by the complete fictitious code, then holds.

## Frame 6 — Del catálogo sí cuenta

- status: animated
- src: compositions/frames/06-catalogo-cuenta.html
- duration: 19.84s
- poster: 15.872s
- transition_in: squeeze
- scene: A selected catalog item becomes a real inventory loan: Disponible changes to Prestado in a synchronized split view.
- voiceover: "Aquí está lo importante. Si eliges el objeto del catálogo, esto no es una libreta aparte: la app lo marca como prestado en el inventario real, igual que si lo hubiera pedido un profesor en el kiosko. Deja de aparecer como disponible, y vuelve cuando lo devuelvas desde aquí."
- type: benefit_highlight
- persuasion: Before/after + causal chain
- beat: aha and conviction
- blueprint: panel-edit-live-sync (Adapt)
- focal: selected “Cable HDMI 3 m” coupled to its inventory state chip
- roles: loan form = left control surface · inventory panel = right bound target · bridge arrow = causal connector · warning strip = thesis support
- asset_candidates:
- sfx: click-soft, whoosh-soft, chime-soft

narrativeRole: Proves the central business rule by showing the inventory mutation caused by a catalog selection.

keyMessage: Selecting from the catalog creates a real loan and updates availability.

Adapt: keep the live-sync couple; the signature move is the same-beat form confirmation and inventory state change.
Scene 1 (0.000–4.960s): split stage reveals the object field on the left and an inventory card marked “Disponible” on the right; a bridge line draws with `svg-path-draw`.
Scene 2 (4.960–13.392s): cursor selects “Cable HDMI 3 m”; a catalog chip and the notice “Se registrará 1 objeto contra el inventario. La devolución lo actualizará automáticamente.” reveal in sequence.
Scene 3 (13.392–19.840s): cursor presses “Registrar Préstamo”; the form receipt and inventory chip switch in the same beat through `control-target-sync`: “Disponible” → “Prestado”. The phrase “DEL CATÁLOGO · SÍ CUENTA” lands and holds.

## Frame 7 — Varios objetos y texto libre

- status: animated
- src: compositions/frames/07-varios-texto.html
- duration: 20.053s
- poster: 16.042s
- transition_in: push-slide LEFT
- scene: Three catalog chips become three records, while a manual text entry is clearly labeled as not affecting inventory.
- voiceover: "Puedes agregar varios objetos al mismo préstamo. Cada uno queda como su propio registro, y se devuelve por separado. Y si lo que prestas no está en el inventario, escríbelo tal cual: se guarda como texto, pero ese no descuenta nada. Solo cuenta lo que eliges del catálogo."
- type: feature_showcase
- persuasion: Enumeration + comparison of two options
- beat: comprehension and caution
- blueprint: grid-card-assemble (Adapt)
- focal: three catalog chips contrasted against one manual-text chip
- roles: catalog chips = foreground records · manual chip = contrast item · notices = evidence · form shell = shared stage
- asset_candidates:
- sfx: pop-soft, key-tap

narrativeRole: Extends the central rule to multi-item loans and its free-text boundary.

keyMessage: Each catalog object is a separate returnable record; manual text does not touch inventory.

Adapt: keep the incremental array assembly, but use real form chips rather than abstract cards.
Scene 1 (0.000–6.417s): three catalog items assemble one by one into the object field using `center-outward-expansion`; each chip has its own × and position.
Scene 2 (6.417–12.700s): the three chips map to three compact history rows; “Se registrarán 3 objetos contra el inventario, cada uno se devuelve por separado.” reveals beneath.
Scene 3 (12.700–20.053s): “cargador prestado por el alumno” types manually and “Sin coincidencias en el inventario · se guardará como texto libre” appears; a quiet split label lands: “Catálogo: actualiza” / “A mano: no descuenta”.

## Frame 8 — Registrar y autorizar

- status: animated
- src: compositions/frames/08-registrar.html
- duration: 15.595s
- poster: 11.696s
- transition_in: crossfade
- scene: Registration succeeds, clears the form, returns focus to the first field, and writes the authorizer into history.
- voiceover: "Registrar. El formulario se limpia y el cursor vuelve arriba, para el siguiente. Y fíjate en la letra chica de cada registro: la app anota sola quién autorizó el préstamo. No hay que escribirlo, y no se puede cambiar."
- type: feature_showcase
- persuasion: Demonstration + audit trail
- beat: confidence
- blueprint: agent-progress-theater (Adapt)
- focal: green registration receipt resolving into the new history rows and authorization line
- roles: register button = trigger · receipt = working/result state · history rows = proof · authorizer line = audit detail
- asset_candidates:
- sfx: click-soft, chime-soft

narrativeRole: Demonstrates the completion state and shows that author attribution is automatic and immutable.

keyMessage: Registering clears the form and records who authorized every row.

Adapt: keep one trigger and a receipt cascade; remove artificial loader theater.
Scene 1 (0.000–4.055s): cursor presses “Registrar Préstamo” via `press-release-spring`; the button changes to a brief working state.
Scene 2 (4.055–9.669s): the green receipt “Préstamo de Diego Ramírez registrado (3 objetos).” reveals, then three history rows cascade in with `center-outward-expansion`.
Scene 3 (9.669–15.595s): the form clears and focus returns to “Nombre del Alumno”; “219876543 · autorizó María López” receives a sequential highlight and holds.

## Frame 9 — Encontrar un préstamo

- status: animated
- src: compositions/frames/09-historial.html
- duration: 16.491s
- poster: 12.685s
- transition_in: push-slide LEFT
- scene: History chips, “Más de 1 día”, and the search field narrow a realistic demo table.
- voiceover: "El historial abre siempre en lo que está prestado. El chip de \"Más de 1 día\" te muestra lo que lleva fuera más de veinticuatro horas — esos son los que hay que ir a buscar. Y el buscador encuentra por nombre, por código o por objeto."
- type: feature_showcase
- persuasion: Signposting + demonstration
- beat: control and foresight
- blueprint: cursor-ui-demo (Adapt)
- focal: “Más de 1 día” filter and one red “hace 2 días” row
- roles: filter chips = control rail · table = evidence · search field = final control · cursor = action actor
- asset_candidates:
- sfx: click-soft, key-tap

narrativeRole: Teaches how to reduce the history to overdue and relevant records.

keyMessage: Use “Más de 1 día” and search by person, code, or object to find what needs action.

Adapt: keep a locked state tour; filters and search replace table states without camera movement.
Scene 1 (0.000–4.440s): the history opens on “En préstamo”; counters and two demo rows reveal in sequence.
Scene 2 (4.440–10.783s): cursor presses “Más de 1 día”; the table collapses to two red rows and “hace 2 días” receives a controlled emphasis.
Scene 3 (10.783–16.491s): “Ramírez” types into “Buscar persona, código u objeto...” via `discrete-text-sequence`; the table narrows to one row and holds.

## Frame 10 — Devolver y proteger el inventario

- status: animated
- src: compositions/frames/10-devolver.html
- duration: 20.395s
- poster: 15.688s
- transition_in: squeeze
- scene: Devolver releases the inventory item; deleting an active linked row is then blocked with the exact safeguard message.
- voiceover: "Cuando regresen el equipo, Devolver. Eso libera el objeto en el inventario, no solo aquí. Y si intentas borrar un registro que todavía está prestado, la app no te deja: te pide devolverlo primero. Es a propósito — borrarlo dejaría un equipo marcado como prestado para siempre."
- type: benefit_highlight
- persuasion: Demonstration + counterexample
- beat: resolution and trust
- blueprint: comparison-split (Adapt)
- focal: history state “Devuelto” synchronized with inventory state “Disponible”
- roles: history = left cause surface · inventory = right effect surface · error toast = safeguard payoff · cursor = action actor
- asset_candidates:
- sfx: click-soft, chime-soft

narrativeRole: Closes the causal loop and explains why deletion is blocked before return.

keyMessage: Devolver releases inventory; an active linked loan must never be deleted first.

Adapt: keep the equal-weight split; replace mirrored card entrances with synchronized state changes.
Scene 1 (0.000–7.060s): a linked active row and the same item marked “Prestado” reveal side by side; cursor moves to “Devolver”.
Scene 2 (7.060–13.335s): the cursor presses the button; both sides flip in the same beat through `control-target-sync`: “En préstamo” → “Devuelto” and “Prestado” → “Disponible”.
Scene 3 (13.335–20.395s): cursor attempts the trash action on another active row; the exact error “Este préstamo está ligado al inventario. Márcalo como devuelto antes de eliminarlo.” reveals and holds above the split.

## Frame 11 — Cierre

- status: animated
- src: compositions/frames/11-cierre.html
- duration: 4s
- poster: 2.200s
- transition_in: blur-crossfade
- scene: The exact logo and the rule “Del catálogo cuenta. A mano, no.” close the film in silence.
- voiceover:
- type: branding
- persuasion: Distillation + callback
- beat: clarity and resolve
- blueprint: titlecard-reveal (Adapt)
- focal: final rule and exact P15 logo
- roles: rule = primary subject · logo = identity anchor · rings = background atmosphere · progress rail = supporting chrome
- asset_candidates:
- sfx: soft-outro

narrativeRole: Compresses the entire inventory boundary into one line that can be remembered at the counter.

keyMessage: Del catálogo cuenta. A mano, no.

Adapt: keep one restrained reveal and a still hold; no exit or extra development phase.
Scene 1 (0.000–0.800s): cobalt-tinted rings and the exact logo fade in over the full-bleed cream ground.
Scene 2 (0.800–2.000s): “Del catálogo cuenta.” and “A mano, no.” reveal as a two-line lockup through `discrete-text-sequence`.
Scene 3 (2.000–4.000s): the final rule holds completely still; no captions remain and no exit tween runs.
